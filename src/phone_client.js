import Message from './message.js'

/**
 * Represents one Client who is able to receive messages, and answer them
 */

export default class PhoneClient {
  /**
   * Create a new Client
   * @param context {ServerContext}
   * @param id {String} - Unique identifier for this client.
   * @param name {String} - Name
   * @param icon {String} - An emoji which is representative of this client
   * @param messages {Array<Message>}
   */
  constructor (context, id, name, icon, messages = []) {
    this._context = context

    this.id = id
    this.name = name
    this.icon = icon

    this.socket = null
    this.messages = messages
  }

  /**
   * Deserialize a previously saved Client object
   * @param context {ServerContext}
   * @param data {Object}
   * @returns {PhoneClient}
   */
  static load (context, data) {
    const messages = data.messages.map(msg => Message.load(msg, context.bot._tg))
    return new PhoneClient(context, data.id, data.name, data.icon, messages)
  }

  /**
   * Save this clients messages to the db if they need to be accessed after a server restart
   */
  saveMessages () {
    this._context.db.get('clients')
      .find({ id: this.id })
      .assign({
        messages: this.messages.map(msg => { return {
          _telegramMessage: msg._telegramMessage,
          groupMessage: msg.groupMessage
        }})
      })
      .write()
  }

  /**
   * Add a new message to the queue.
   * @param message {Message}
   */
  addMessage (message) {
    this.messages.push(message)
    this.notify()
    this.saveMessages()
  }

  /**
   * Remove a message from the queue-
   * @param message {Message}
   */
  removeMessage (message) {
    this.messages.splice(this.messages.indexOf(message), 1)
    this.saveMessages()
  }

  /**
   * Return if the client has any pending messages.
   * @returns {boolean}
   */
  hasMessages () {
    return this.messages.length > 0
  }

  /**
   * Reply to the original voice message on telegram.
   * @param id {Number} - The Telegram message id of the original message
   * @param msg {String} - The content of the reply
   */
  replyToMessage (id, msg) {
    const message = this.messages.find(message => message._telegramMessage.message_id === id)
    if (message) {
      if (message.groupMessage) {
        message.reply(`${this.icon} ${this.name}: ${msg}`)
      } else {
        message.reply(`${msg}`)
      }
      this.removeMessage(message)
    }
  }

  /**
   * Store the current socket instance which binds to this client.
   * @param socket
   */
  setSocket (socket) {
    this.socket = socket
  }

  /**
   * Ring the phone.
   */
  notify () {
    console.log(`[${this.id}] NOTIFY`)

    if (this.socket) {
      this.socket.emit('notify')
    }
  }

  /**
   * Send initialisation packet to server.
   */
  sendInitData () {
    if (this.socket) {
      this.socket.emit('init', {
        name: this.name,
        icon: this.icon,
        hasMessages: this.hasMessages()
      })
    }
  }

  /**
   * Serialize and send pending messages to the client.
   */
  sendNewMessages () {
    if (this.socket) {
      const serializeJobs = this.messages.map(message => message.toTransferObject())
      Promise.all(serializeJobs)
        .then(serializedMessages => {
          this.socket.emit('new_messages', {
            hasMessages: this.hasMessages(),
            messages: serializedMessages
          })
        })
    }
  }
}
