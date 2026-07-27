import { mkdirSync, writeFileSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const iconsDir = join(import.meta.dir, '../resources/icons')
mkdirSync(iconsDir, { recursive: true })

function render(svgName: string, pngName: string, width: number): void {
  const svg = readFileSync(join(iconsDir, svgName))
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width }
  })
  const png = resvg.render().asPng()
  writeFileSync(join(iconsDir, pngName), png)
  console.log(`Wrote ${pngName} (${width}px)`)
}

render('icon.svg', 'icon.png', 512)
render('icon.svg', 'icon-256.png', 256)
render('tray-inactive.svg', 'tray-inactive.png', 64)
render('tray-active.svg', 'tray-active.png', 64)
render('tray-inactive.svg', 'tray-inactive@2x.png', 128)
render('tray-active.svg', 'tray-active@2x.png', 128)

console.log('Icons generated.')
