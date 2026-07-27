import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

function loadPublisherOAuthClientId(): string {
  const fromEnv = process.env.CLOUD_TUNNEL_OAUTH_CLIENT_ID?.trim()
  if (fromEnv) return fromEnv
  const filePath = resolve('resources/oauth-client.json')
  try {
    if (!existsSync(filePath)) return ''
    const json = JSON.parse(readFileSync(filePath, 'utf8')) as {
      clientId?: string
    }
    return json.clientId?.trim() ?? ''
  } catch {
    return ''
  }
}

const oauthClientId = loadPublisherOAuthClientId()
const oauthDefine = {
  __CLOUD_TUNNEL_OAUTH_CLIENT_ID__: JSON.stringify(oauthClientId)
}

if (oauthClientId) {
  console.log(
    `[cloud-tunnel] OAuth Client ID embedded (${oauthClientId.slice(0, 8)}…)`
  )
} else {
  console.warn(
    '[cloud-tunnel] No OAuth Client ID. Run: bun run setup:oauth (publisher once)'
  )
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    define: oauthDefine,
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    define: oauthDefine,
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        output: {
          format: 'cjs',
          entryFileNames: '[name].cjs'
        }
      }
    }
  },
  renderer: {
    define: oauthDefine,
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    plugins: [react()]
  }
})
