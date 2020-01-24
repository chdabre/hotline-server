/**
 * Represents one message instance which was assigned to a recipient.
 */
export default class Message {
  /**
   * Create a new message instance
   * @param telegram {Telegram} - Telegram bot instance
   * @param telegramMessage - Telegram Message
   * @param groupMessage {boolean} - Was this message sent to multiple people?
   */
  constructor (telegram, telegramMessage, groupMessage = false) {
    this._tg = telegram
    this._telegramMessage = telegramMessage
    this.groupMessage = groupMessage
  }

  /**
   * Copy constructor
   * @param message {Message}
   * @returns {Message}
   */
  static copy (message) {
    return new Message(message._tg, message._telegramMessage, message.groupMessage)
  }

  /**
   * Deserialize a previously saved message object
   * @param data {Object}
   * @param tg {Telegram}
   * @returns {Message}
   */
  static load (data, tg) {
    return new Message(tg, data._telegramMessage, data.groupMessage)
  }

  /**
   * Fetch file link for voice message and return an object with  data related to the message.
   * @returns {Promise<Object>} - The Message data { id: Number, date: String, url: String }
   */
  toTransferObject () {
    return this._tg.getFileLink(this._telegramMessage.voice.file_id)
      .then(url => new Promise((resolve) => {
        resolve({
          id: this._telegramMessage.message_id,
          date: new Date(this._telegramMessage.date * 1000).toISOString(),
          url
        })
      }))
  }

  /**
   * Reply to this message.
   * @param msg {String} - The content of the reply.
   */
  reply (msg) {
    this._tg.sendMessage(this._telegramMessage.chat.id , msg, {
      reply_to_message_id: this._telegramMessage.message_id
    }).catch(() => {})
  }

  /**
   * Setter for group message
   * @param value {boolean}
   */
  setGroupMessage(value) {
    this.groupMessage = value
  }
}
