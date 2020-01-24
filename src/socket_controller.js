import Express from 'express'
import SocketIO from 'socket.io'
import { Server } from 'http'

export default class SocketController {
  static get PORT () { return 3000 }

  constructor (context) {
    this._context = context

    this._app = Express()
    this._http = new Server(this._app)
    this._io = SocketIO(this._http)

    this._setupHandlers()
  }

  startServer () {
    this._http.listen(SocketController.PORT, () => {
      console.log('[HTTP] Listening on *' + SocketController.PORT)
    })
  }

  _setupHandlers () {
    this._app.get('/', function (req, res) {
      res.send('HOTLINE SERVER working')
    })

    this._io.on('connection', socket => {
      this._onConnection(socket)
      socket.on('disconnect', () => this._onDisconnect(socket))

      socket.on('init', (msg) => this._onInit(socket, msg))
      socket.on('get_new_messages', () => this._onGetNewMessages(socket))
      socket.on('send_reaction', (msg) => this._onSendReaction(socket, msg))
    })
  }

  _onConnection (socket) {
    console.log('[IO] Socket has connected!')
  }

  _onDisconnect (socket) {
    console.log(`[IO] Socket has disconnected!`)
    this._context.clients.forEach(user => {
      if (user.socket === socket) {
        console.log(`[IO] User ${ user.id } disconnected!`)
        user.socket = null
      }
    })
  }

  _onInit (socket, msg) {
    try {
      console.log('[IO:init] Trying to find user...')

      const user = this._context.clients.find(user => user.id === msg.id)
      if (user) {
        console.log('[IO:init] User found!')
        user.setSocket(socket)
        user.sendInitData()
      }
    } catch (e) {
      console.error('[IO] Error in [init]: ', e)
    }
  }

  _onGetNewMessages (socket) {
    try {
      console.log('[IO:get_new_messages] Trying to find user...')
      const user = this._context.clients.find(user => user.socket === socket)
      if (user) user.sendNewMessages()
    } catch (e) {
      console.error('[IO] Error in [get_new_messages]: ', e)
    }
  }

  _onSendReaction (socket, msg) {
    try {
      console.log('[IO:send_reaction] Trying to find user...')
      const user = this._context.clients.find(user => user.socket === socket)
      if (user) user.replyToMessage(msg.message_id, msg.message)
    } catch (e) {
      console.error('[IO] Error in [send_reaction]: ', e)
    }
  }
}
