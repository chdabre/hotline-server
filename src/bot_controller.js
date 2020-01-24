import Telegraf from 'telegraf'
import i18n from 'i18n'
import Message from './message.js'
const { Markup, Telegram } = Telegraf

/**
 * Defines the control logic for interaction with the Telegram Bot.
 * This class is intended to be used as a singleton within the application.
 */
export default class BotController {
  /**
   * The maximum duration a message can have to be accepted by the bot.
   * @returns {number} - Duration (seconds)
   * @constructor
   */
  static get MAX_MESSAGE_DURATION () { return 60 }

  /**
   * Initialize the Bot Controller.
   * @param context {ServerContext}
   * @param token {String} - Telegram bot token
   */
  constructor (context, token) {
    this._context = context

    this._bot = new Telegraf(token)
    this._tg = new Telegram(token)

    // This is used as temporary storage to hand over the initial message to the context callback.
    this._messageCache = {}

    this._defineActions()
    this._bot.launch().catch(() => {})
  }

  /**
   * Initialize the listeners for specific bot actions.
   * @private
   */
  _defineActions () {
    this._bot.start((ctx) => ctx.reply(i18n.__('startMessage')))
    this._bot.help((ctx) => ctx.reply(i18n.__('startMessage'))) // TODO

    this._bot.on('voice', (ctx) => this._onVoice(ctx))
    this._bot.action(/send.+/, (ctx, next) => this._onSend(ctx, next))
  }

  _onVoice (ctx) {
    // The duration of the audio message
    const duration = ctx.message.voice.duration

    if (duration <= BotController.MAX_MESSAGE_DURATION) {
      // Temporarily store message in cache so it can be retrieved in the action callback
      this._messageCache[ctx.message.message_id] = ctx.message

      // Build action query
      const action = `send:${ctx.message.message_id}:`

      // Build message
      let response = i18n.__('askRecipient')
      this._context.clients.forEach(user => { response += `${user.icon} ${user.name}\n`})

      ctx.reply(response, Markup.inlineKeyboard([
          [ Markup.callbackButton(i18n.__('recipientAll'), action) ], // 'All' Button
          this._context.clients.map(user => Markup.callbackButton(user.icon, action + user.id)) // User buttons
        ])
          .oneTime()
          .resize()
          .extra()
      )
    } else {
      // Duration limit exceeded
      ctx.reply(i18n.__('audioTooLong', { maxDuration: BotController.MAX_MESSAGE_DURATION }))
    }
  }

  _onSend (ctx, next) {
    // Make the Loading popup disappear
    ctx.answerCbQuery().catch(() => {})

    // Get parameters from callback data (I hope there is a better way to do this)
    const callbackData = ctx.callbackQuery.data.split(':')
    const messageId = callbackData[1]
    const targetId = callbackData[2]

    const originalMessage = this._messageCache[messageId]
    if (originalMessage) {
      const newMessage = new Message(this._tg, originalMessage)

      if (targetId) {
        const user = this._context.clients.find(user => user.id === targetId)
        if (user) {
          user.addMessage(newMessage)
          return ctx.editMessageText(i18n.__('messageSent') + `${user.icon} ${user.name}`).then(() => next())
        } else {
          return ctx.editMessageText(i18n.__('error', { error: 'User not found' })).then(() => next())
        }
      } else {
        newMessage.setGroupMessage(true);
        this._context.clients.forEach(user => user.addMessage(Message.copy(newMessage)))
        return ctx.editMessageText(i18n.__('messageSentToAll')).then(() => next())
      }

    } else {
      return ctx.editMessageText(i18n.__('error', { error: 'Message not in Cache' })).then(() => next())
    }
  }
}
