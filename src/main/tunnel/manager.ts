import { spawn, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { EventEmitter } from 'node:events'
import {
  ensureCloudflaredExecutable,
  getCloudflaredBinaryPath
} from './binary'

export type ProcessStatus = 'stopped' | 'starting' | 'running' | 'error'

interface ManagedProcess {
  process: ChildProcess
  status: ProcessStatus
  errorMessage?: string
}

export class TunnelProcessManager extends EventEmitter {
  private processes = new Map<string, ManagedProcess>()

  getStatus(tunnelId: string): ProcessStatus {
    return this.processes.get(tunnelId)?.status ?? 'stopped'
  }

  getError(tunnelId: string): string | undefined {
    return this.processes.get(tunnelId)?.errorMessage
  }

  isRunning(tunnelId: string): boolean {
    const status = this.getStatus(tunnelId)
    return status === 'running' || status === 'starting'
  }

  listRunning(): string[] {
    return [...this.processes.entries()]
      .filter(([, p]) => p.status === 'running' || p.status === 'starting')
      .map(([id]) => id)
  }

  async start(tunnelId: string, token: string): Promise<void> {
    if (this.isRunning(tunnelId)) {
      return
    }

    const binary = getCloudflaredBinaryPath()
    if (!existsSync(binary)) {
      throw new Error(
        `Bundled cloudflared not found at ${binary}. Run: bun run fetch:cloudflared`
      )
    }
    ensureCloudflaredExecutable(binary)

    const child = spawn(binary, ['tunnel', 'run', '--token', token], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env }
    })

    const managed: ManagedProcess = {
      process: child,
      status: 'starting'
    }
    this.processes.set(tunnelId, managed)
    this.emit('status', tunnelId, managed.status)

    let settled = false

    const markRunning = (): void => {
      if (settled) return
      settled = true
      managed.status = 'running'
      this.emit('status', tunnelId, managed.status)
    }

    const markError = (message: string): void => {
      managed.status = 'error'
      managed.errorMessage = message
      this.emit('status', tunnelId, managed.status, message)
    }

    child.stdout?.on('data', (buf: Buffer) => {
      const text = buf.toString()
      if (/Registered tunnel connection|Connected to/i.test(text)) {
        markRunning()
      }
    })

    child.stderr?.on('data', (buf: Buffer) => {
      const text = buf.toString()
      if (/Registered tunnel connection|Connected to/i.test(text)) {
        markRunning()
      }
    })

    child.on('error', (err) => {
      markError(err.message)
      this.processes.delete(tunnelId)
    })

    child.on('exit', (code, signal) => {
      const wasRunning =
        managed.status === 'running' || managed.status === 'starting'
      this.processes.delete(tunnelId)
      if (wasRunning && code !== 0 && code !== null) {
        this.emit(
          'status',
          tunnelId,
          'error',
          `cloudflared exited with code ${code}${signal ? ` (${signal})` : ''}`
        )
      } else {
        this.emit('status', tunnelId, 'stopped')
      }
    })

    // Fail fast if the process dies immediately; otherwise return and
    // promote to running when cloudflared logs a connection (or shortly after).
    await new Promise<void>((resolve, reject) => {
      const earlyFail = setTimeout(() => {
        child.off('error', onError)
        child.off('exit', onExit)
        setTimeout(() => {
          if (this.processes.has(tunnelId)) markRunning()
        }, 1500)
        resolve()
      }, 400)

      const onError = (err: Error): void => {
        clearTimeout(earlyFail)
        reject(err)
      }
      const onExit = (code: number | null): void => {
        clearTimeout(earlyFail)
        if (code !== 0 && code !== null) {
          reject(new Error(`cloudflared exited early with code ${code}`))
        } else {
          resolve()
        }
      }

      child.once('error', onError)
      child.once('exit', onExit)
    })
  }

  async stop(tunnelId: string): Promise<void> {
    const managed = this.processes.get(tunnelId)
    if (!managed) return

    await new Promise<void>((resolve) => {
      const child = managed.process
      const onExit = (): void => resolve()
      child.once('exit', onExit)
      child.kill('SIGTERM')
      setTimeout(() => {
        if (!child.killed) {
          child.kill('SIGKILL')
        }
        resolve()
      }, 3000)
    })

    this.processes.delete(tunnelId)
    this.emit('status', tunnelId, 'stopped')
  }

  async stopAll(): Promise<void> {
    const ids = [...this.processes.keys()]
    await Promise.all(ids.map((id) => this.stop(id)))
  }
}
