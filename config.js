
import { watchFile, unwatchFile } from 'fs'
import chalk from 'chalk'
import { fileURLToPath } from 'url'

global.owner = [
   ['5492994587598', 'SoyMaycol', true],
]

global.mods = []
global.prems = []

global.namebot = 'PicolasAlultra-MD'
global.redes = 'https://chat.whatsapp.com/KDI7NNovzdwJayx1gI1cue?mode=ems_copy_t'
global.botname = 'PicolasAlultra-MD'
global.banner = 'https://files.catbox.moe/k05foi.jpg'
global.packname = 'PicolasAlultra-MD'
global.author = '> ✦ Hecho por Picolas & SoyMaycol <3 ✦'
global.moneda = 'PicoCoins'
global.libreria = 'Baileys'
global.baileys = 'V 6.7.16'
global.vs = '2.2.0'
global.sessions = 'PicolasSession'
global.jadi = 'PicolasBots'
global.yukiJadibts = true

global.namecanal = 'PicolasAlultra • Actualizaciones'
global.idcanal = '0029VbBY6fkAzNbo3NqVBN33@newsletter'
global.idcanal2 = '0029VbBY6fkAzNbo3NqVBN33@newsletter'
global.canal = 'https://whatsapp.com/channel/0029VbBY6fkAzNbo3NqVBN33'
global.canalreg = '0029VbBY6fkAzNbo3NqVBN33@newsletter'

global.ch = {
  ch1: '0029VbBY6fkAzNbo3NqVBN33@newsletter'
}

global.multiplier = 69
global.maxwarn = 2

let file = fileURLToPath(import.meta.url)
watchFile(file, () => {
  unwatchFile(file)
  console.log(chalk.redBright("Se actualizo el 'config.js'"))
  import(`file://${file}?update=${Date.now()}`)
})
