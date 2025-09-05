import { smsg } from './lib/simple.js'
import { format } from 'util'
import { fileURLToPath } from 'url'
import path, { join } from 'path'
import { unwatchFile, watchFile } from 'fs'
import chalk from 'chalk'
import fetch from 'node-fetch'
import ws from 'ws'

const { proto } = (await import('@whiskeysockets/baileys')).default
const isNumber = x => typeof x === 'number' && !isNaN(x)

const defaultUser = {
    exp: 0,
    coin: 10,
    joincount: 1,
    diamond: 3,
    lastadventure: 0,
    health: 100,
    lastclaim: 0,
    lastcofre: 0,
    lastdiamantes: 0,
    lastcode: 0,
    lastduel: 0,
    lastpago: 0,
    lastmining: 0,
    lastcodereg: 0,
    muto: false,
    crime: 0,
    registered: false,
    genre: '',
    birth: '',
    marry: '',
    description: '',
    packstickers: null,
    name: '',
    age: -1,
    regTime: -1,
    afk: -1,
    afkReason: '',
    banned: false,
    useDocument: false,
    bank: 0,
    level: 0,
    role: 'Nuv',
    premium: false,
    premiumTime: 0,
}

const defaultChat = {
    isBanned: false,
    sAutoresponder: '',
    welcome: true,
    autolevelup: false,
    autoresponder: false,
    delete: false,
    autoAceptar: false,
    autoRechazar: false,
    detect: true,
    antiBot: false,
    antiBot2: false,
    modoadmin: false,
    antiLink: true,
    antifake: false,
    reaction: false,
    nsfw: false,
    expired: 0,
    antiLag: false,
    per: [],
}


export async function handler(chatUpdate) {
    this.uptime = this.uptime || Date.now()
    if (!chatUpdate) return

    try {
        this.pushMessage(chatUpdate.messages)
    } catch (e) {
        console.error("Error en pushMessage:", e)
    }
    
    let m = chatUpdate.messages[chatUpdate.messages.length - 1]
    if (!m) return

    if (global.db.data == null) await global.loadDatabase()

    try {
        m = smsg(this, m) || m
        if (!m) return

        m.exp = 0
        m.coin = 0 

        try {
            let user = global.db.data.users[m.sender]
            if (user) {
                global.db.data.users[m.sender] = { ...defaultUser, ...user, name: m.name }
            } else {
                global.db.data.users[m.sender] = { ...defaultUser, name: m.name }
            }

            let chat = global.db.data.chats[m.chat]
            if (chat) {
                global.db.data.chats[m.chat] = { ...defaultChat, ...chat }
            } else {
                global.db.data.chats[m.chat] = { ...defaultChat }
            }

            let settings = global.db.data.settings[this.user.jid]
            if (settings) {
                if (!('self' in settings)) settings.self = false
                if (!('restrict' in settings)) settings.restrict = true
                if (!('jadibotmd' in settings)) settings.jadibotmd = true
                if (!('antiPrivate' in settings)) settings.antiPrivate = false
                if (!('autoread' in settings)) settings.autoread = false
            } else {
                global.db.data.settings[this.user.jid] = {
                    self: false,
                    restrict: true,
                    jadibotmd: true,
                    antiPrivate: false,
                    autoread: false,
                    status: 0
                }
            }
        } catch (e) {
            console.error("Error inicializando datos de usuario/chat:", e)
        }

        const user = global.db.data.users[m.sender]
        const chat = global.db.data.chats[m.chat]
        const settings = global.db.data.settings[this.user.jid]

        if (chat.primaryBot && chat.primaryBot !== this.user.jid && m.sender !== this.user.jid) return

        const detectwhat = m.sender.includes('@lid') ? '@lid' : '@s.whatsapp.net'
        const isROwner = [...global.owner.map(([number]) => number)].map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender)
        const isOwner = isROwner || m.fromMe
        const isMods = isROwner || global.mods.map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender)
        const isPrems = isROwner || global.prems.map(v => v.replace(/[^0-9]/g, '') + detectwhat).includes(m.sender) || (user && user.premium)

        if (m.isBaileys) return
        if (opts['nyimak']) return
        if (!isROwner && opts['self']) return
        if (opts['swonly'] && m.chat !== 'status@broadcast') return
        if (typeof m.text !== 'string') m.text = ''

        m.exp += Math.ceil(Math.random() * 10)

        let usedPrefix
        const groupMetadata = m.isGroup ? (this.chats[m.chat]?.metadata || await this.groupMetadata(m.chat).catch(_ => null)) : {}
        const participants = m.isGroup ? (groupMetadata.participants || []) : []
        const userInGroup = participants.find(p => p.id === m.sender) || {}
        const botInGroup = participants.find(p => p.id === this.user.jid) || {}
        const isRAdmin = userInGroup?.admin === "superadmin"
        const isAdmin = isRAdmin || userInGroup?.admin === "admin"
        const isBotAdmin = !!botInGroup?.admin

        const ___dirname = path.join(path.dirname(fileURLToPath(import.meta.url)), './plugins')
        for (let name in global.plugins) {
            let plugin = global.plugins[name]
            if (!plugin || plugin.disabled) continue

            const __filename = join(___dirname, name)
            if (typeof plugin.all === 'function') {
                try {
                    await plugin.all.call(this, m, { chatUpdate, __dirname: ___dirname, __filename })
                } catch (e) {
                    console.error(`Error en plugin.all: ${name}\n`, e)
                }
            }
            
            if (!opts['restrict'] && plugin.tags && plugin.tags.includes('admin')) continue

            const str2Regex = str => str.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
            let _prefix = plugin.customPrefix ? plugin.customPrefix : this.prefix ? this.prefix : global.prefix
            let match = (_prefix instanceof RegExp ? [[_prefix.exec(m.text), _prefix]] :
                Array.isArray(_prefix) ? _prefix.map(p => {
                    let re = p instanceof RegExp ? p : new RegExp(str2Regex(p))
                    return [re.exec(m.text), re]
                }) :
                typeof _prefix === 'string' ? [[new RegExp(str2Regex(_prefix)).exec(m.text), new RegExp(str2Regex(_prefix))]] :
                [[[], new RegExp]]
            ).find(p => p[1])

            if (typeof plugin.before === 'function') {
                if (await plugin.before.call(this, m, {
                    match, conn: this, participants, groupMetadata, user: userInGroup, bot: botInGroup, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname, __filename
                })) continue
            }
            if (typeof plugin !== 'function') continue

            if ((usedPrefix = (match[0] || '')[0])) {
                let noPrefix = m.text.replace(usedPrefix, '')
                let [command, ...args] = noPrefix.trim().split` `.filter(v => v)
                args = args || []
                let _args = noPrefix.trim().split` `.slice(1)
                let text = _args.join` `
                command = (command || '').toLowerCase()
                
                let isAccept = plugin.command instanceof RegExp ? plugin.command.test(command) :
                    Array.isArray(plugin.command) ? plugin.command.some(cmd => cmd instanceof RegExp ? cmd.test(command) : cmd === command) :
                    typeof plugin.command === 'string' ? plugin.command === command : false
                
                if (!isAccept) continue

                if (chat.isBanned && !isROwner && !['grupo-unbanchat.js', 'owner-exec.js', 'owner-exec2.js', 'grupo-delete.js'].includes(name)) return
                if (user.banned && !isROwner) {
                    m.reply(`🚫「✦」Tu alma ha sido marcada... Estás baneado/a y no puedes usar mis conjuros.\n\n${user.bannedReason ? `☁️ *Razón del destierro:* ${user.bannedReason}` : ''}`)
                    return
                }

                if (chat.modoadmin && m.isGroup && !isAdmin && !isOwner) {
                    m.reply('🏮 | ✦ Modo Guardián invocado ✦ Solo los administradores poseen el sello para usar comandos en este grupo. 👻')
                    continue
                }

                m.plugin = name
                let fail = plugin.fail || global.dfail
                
                if (plugin.rowner && !isROwner) { fail('rowner', m, this, usedPrefix, command); continue }
                if (plugin.owner && !isOwner) { fail('owner', m, this, usedPrefix, command); continue }
                if (plugin.mods && !isMods) { fail('mods', m, this, usedPrefix, command); continue }
                if (plugin.premium && !isPrems) { fail('premium', m, this, usedPrefix, command); continue }
                if (plugin.group && !m.isGroup) { fail('group', m, this, usedPrefix, command); continue }
                if (plugin.botAdmin && !isBotAdmin) { fail('botAdmin', m, this, usedPrefix, command); continue }
                if (plugin.admin && !isAdmin) { fail('admin', m, this, usedPrefix, command); continue }
                if (plugin.private && m.isGroup) { fail('private', m, this, usedPrefix, command); continue }
                if (plugin.register && !user.registered) { fail('unreg', m, this, usedPrefix, command); continue }

                m.isCommand = true
                let xp = 'exp' in plugin ? parseInt(plugin.exp) : 10
                m.exp += xp
                if (!isPrems && plugin.coin && user.coin < plugin.coin) {
                    this.reply(m.chat, `❮✦❯ Se agotaron tus monedas.`, m)
                    continue
                }
                if (plugin.level > user.level) {
                    this.reply(m.chat, `❮✦❯ Se requiere el nivel: *${plugin.level}*\n• Tu nivel actual es: *${user.level}*`, m)
                    continue
                }

                let extra = { match, usedPrefix, noPrefix, _args, args, command, text, conn: this, participants, groupMetadata, user: userInGroup, bot: botInGroup, isROwner, isOwner, isRAdmin, isAdmin, isBotAdmin, isPrems, chatUpdate, __dirname, __filename }
                
                try {
                    await plugin.call(this, m, extra)
                    if (!isPrems) m.coin = m.coin || plugin.coin || 0
                } catch (e) {
                    m.error = e
                    console.error(`Error en plugin: ${name}\n`, e)
                    if (e) {
                        let text = format(e)
                        for (let key of Object.values(global.APIKeys)) text = text.replace(new RegExp(key, 'g'), '*******')
                        m.reply(text)
                    }
                } finally {
                    if (typeof plugin.after === 'function') {
                        try {
                            await plugin.after.call(this, m, extra)
                        } catch (e) {
                            console.error(`Error en plugin.after: ${name}\n`, e)
                        }
                    }
                    if (m.coin) {
                        user.coin -= m.coin
                    }
                }
                break 
            }
        }
    } catch (e) {
        console.error("Error en el handler principal:", e)
    } finally {
        if (m) {
            let user = global.db.data.users[m.sender]
            if (user) {
                user.exp += m.exp
            }

            if (user && user.muto === true) {
                await this.sendMessage(m.chat, { delete: m.key })
            }

            if (m.plugin) {
                let stats = global.db.data.stats
                let stat = stats[m.plugin]
                if (stat) {
                    stat.total = (stat.total || 0) + 1
                    stat.last = Date.now()
                    if (m.error == null) {
                        stat.success = (stat.success || 0) + 1
                        stat.lastSuccess = Date.now()
                    }
                } else {
                    stats[m.plugin] = {
                        total: 1,
                        success: m.error == null ? 1 : 0,
                        last: Date.now(),
                        lastSuccess: m.error == null ? Date.now() : 0
                    }
                }
            }
        }

        try {
            if (!opts['noprint']) await (await import('./lib/print.js')).default(m, this)
        } catch (e) {
            console.log(m, m.quoted, e)
        }
        if (opts['autoread']) await this.readMessages([m.key])
        
        const chat = global.db.data.chats[m.chat];
        if (chat && chat.reaction && m.text.match(/(ción|dad|aje|oso|izar|mente|pero|tion|age|ous|ate|and|but|ify|ai|yuki|a|s)/gi)) {
            if (!m.fromMe) {
                 const emot = ["🌙", "🌸", "👻", "🔮", "💫", "🪄", "😈", "🍡", "📜", "🏮"].getRandom()
                 this.sendMessage(m.chat, { react: { text: emot, key: m.key } })
            }
        }
    }
}

Array.prototype.getRandom = function() {
  return this[Math.floor(Math.random() * this.length)]
}

global.dfail = (type, m, conn, usedPrefix, command) => {
let user2 = m.pushName || 'Anónimo'
const msg = {
rowner: `┏━━━✦☆✦━━━┓
🌙  El conjuro *${command}*  
solo lo puede usar mi amo Picolas.  
(ノಠ益ಠ)ノ彡✧
┗━━━✦☆✦━━━┛`,

owner: `╔═══ ❖ ═══╗
🔮 El hechizo *${command}*  
pertenece a los guardianes mayores.  
ヽ(>∀<☆)ノ
╚═══ ❖ ═══╝`,

mods: `｡☆✼★━━━━★✼☆｡
☁️ El poder de *${command}*  
está reservado a los moderadores mágicos.
(｡•́︿•̀｡)
｡☆✼★━━━━★✼☆｡`,

premium: `✧･ﾟ: *${command}* ✧･ﾟ:
💎 Solo los bendecidos premium  
pueden tocar este tesoro UwU
⊂(￣▽￣)⊃`,

group: `┏(＾0＾)┛
🏮 El ritual *${command}*  
sólo funciona en salones grupales.
┗(＾0＾) ┓`,

private: `╭(♡･ㅂ･)و ̑̑
📜 El conjuro *${command}*  
sólo se revela en privado conmigo.
╰(°▽°)╯`,

admin: `( ⚆ _ ⚆ )  
📛 El talismán *${command}*  
requiere la fuerza de un admin.`,

botAdmin: `╰(⇀︿⇀)つ-]═──
🤖 Para usar *${command}*  
necesito ser el guardián admin primero!`,

unreg: `｡･ﾟﾟ*(>д<)*ﾟﾟ･｡
No estás en el libro sagrado aún!
Regístrate con: *${usedPrefix}reg ${user2}.18*`,

restrict: `🚪 Esta puerta secreta  
está cerrada por órdenes del creador.`

}[type]

if (msg) return m.reply(msg + "\n\n> ✦ Hecho por Picolas <3 ✦").then(_ => m.react('🌸'))
}

let file = global.__filename(import.meta.url, true)
watchFile(file, async () => {
    unwatchFile(file)
    console.log(chalk.magenta("Se actualizó 'handler.js'"))
    if (global.conns && global.conns.length > 0) {
        const users = [...new Set(global.conns.filter(conn => conn.user && conn.ws.socket && conn.ws.socket.readyState !== ws.CLOSED).map(conn => conn))]
        for (const userr of users) {
            if (typeof userr.subreloadHandler === 'function') {
                userr.subreloadHandler(false)
            }
        }
    }
})
