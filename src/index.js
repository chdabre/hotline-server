import i18n from 'i18n'
import path from 'path';
import { fileURLToPath } from 'url'
import lowdb from 'lowdb'
import FileSync from 'lowdb/adapters/FileSync.js'

import PhoneClient from './phone_client.js'
import BotController from './bot_controller.js'
import SocketController from './socket_controller.js'

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ServerContext {
  constructor () {
    this._configureDB()
    this._configurei18n()

    this.bot = new BotController(this, process.env.BOT_TOKEN)
    this.socket = new SocketController(this)

    this._loadClients()
    this.socket.startServer()

    console.log(`Ready with ${this.clients.length} known clients.`)
  }

  _configureDB () {
    const adapter = new FileSync('/config/db.json')
    this.db = lowdb(adapter)

    // Set some defaults (required if your JSON file is empty)
    this.db.defaults({
      clients: [
        { id: 'pink', name: 'PINK LINE (Pascal & Philipp & Andi)', icon: '🧠', messages: [] },
        { id: 'red', name: 'RED LINE (Dario)', icon: '🥫', messages: [] },
        { id: 'purple', name: 'PURPLE LINE (Hanna)', icon: '😈', messages: [] },
        { id: 'yellow', name: 'YELLOW LINE (Luca)', icon: '🐥', messages: [] },
      ]
    }).write()
  }

  _configurei18n () {
    i18n.configure({
      locales:['de'],
      defaultLocale: 'de',
      directory: __dirname + '/locales'
    })
  }

  _loadClients () {
    const serializedClients = this.db.get('clients').value()
    this.clients = serializedClients.map(c => PhoneClient.load(this, c))
  }
}

new ServerContext()
