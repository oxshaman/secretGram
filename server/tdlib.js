import tdl from 'tdl'
import { getTdjson } from 'prebuilt-tdlib'
import { EventEmitter } from 'events'

tdl.configure({ tdjson: getTdjson() })

class TDLibClient extends EventEmitter {
  constructor() {
    super()
    this.client = null
    this.authState = 'initial'
    this.myId = null
  }

  init(apiId, apiHash) {
    this.client = tdl.createClient({
      apiId: Number(apiId),
      apiHash,
      databaseDirectory: '_td_database',
      filesDirectory: '_td_files',
    })

    this.client.on('error', (err) => {
      console.error('[TDLib error]', err)
      this.emit('error', err)
    })

    this.client.on('update', (update) => {
      this._handleUpdate(update)
    })
  }

  _handleUpdate(update) {
    switch (update._) {
      case 'updateAuthorizationState':
        this._handleAuthState(update.authorization_state)
        break
      case 'updateNewMessage':
        this.emit('newMessage', update.message)
        break
      case 'updateChatLastMessage':
        this.emit('chatUpdate', {
          chat_id: update.chat_id,
          last_message: update.last_message,
          positions: update.positions,
        })
        break
      case 'updateChatReadInbox':
        this.emit('chatUpdate', {
          chat_id: update.chat_id,
          unread_count: update.unread_count,
        })
        break
      case 'updateMessageSendSucceeded':
        this.emit('messageSendSucceeded', {
          old_message_id: update.old_message_id,
          message: update.message,
        })
        break
      case 'updateUser':
        this.emit('userUpdate', update.user)
        break
    }
  }

  _handleAuthState(state) {
    const stateMap = {
      authorizationStateWaitTdlibParameters: 'waitTdlibParameters',
      authorizationStateWaitPhoneNumber: 'waitPhoneNumber',
      authorizationStateWaitCode: 'waitCode',
      authorizationStateWaitPassword: 'waitPassword',
      authorizationStateReady: 'ready',
      authorizationStateClosed: 'closed',
      authorizationStateLoggingOut: 'loggingOut',
    }
    this.authState = stateMap[state._] || state._
    this.emit('authState', this.authState)

    if (this.authState === 'ready') {
      this.invoke({ _: 'getMe' }).then((me) => {
        this.myId = me.id
      })
    }
  }

  async invoke(request) {
    if (!this.client) throw new Error('Client not initialized')
    return this.client.invoke(request)
  }

  async setPhoneNumber(phone) {
    return this.invoke({
      _: 'setAuthenticationPhoneNumber',
      phone_number: phone,
    })
  }

  async setAuthCode(code) {
    return this.invoke({
      _: 'checkAuthenticationCode',
      code,
    })
  }

  async setPassword(password) {
    return this.invoke({
      _: 'checkAuthenticationPassword',
      password,
    })
  }

  async getMe() {
    return this.invoke({ _: 'getMe' })
  }

  async getChats(limit = 30) {
    const result = await this.invoke({
      _: 'getChats',
      chat_list: { _: 'chatListMain' },
      limit,
    })
    const chats = []
    for (const chatId of result.chat_ids) {
      const chat = await this.invoke({ _: 'getChat', chat_id: chatId })
      chats.push(chat)
    }
    return chats
  }

  async getChat(chatId) {
    return this.invoke({ _: 'getChat', chat_id: chatId })
  }

  async getChatMessages(chatId, fromMessageId = 0, limit = 50) {
    await this.invoke({ _: 'openChat', chat_id: chatId })
    return this.invoke({
      _: 'getChatHistory',
      chat_id: chatId,
      from_message_id: fromMessageId,
      offset: 0,
      limit,
      only_local: false,
    })
  }

  async sendMessage(chatId, text) {
    return this.invoke({
      _: 'sendMessage',
      chat_id: chatId,
      input_message_content: {
        _: 'inputMessageText',
        text: { _: 'formattedText', text },
      },
    })
  }

  async getUser(userId) {
    return this.invoke({ _: 'getUser', user_id: userId })
  }

  async getChatMembers(chatId) {
    const chat = await this.getChat(chatId)
    const type = chat.type

    if (type?._ === 'chatTypeBasicGroup') {
      const info = await this.invoke({
        _: 'getBasicGroupFullInfo',
        basic_group_id: type.basic_group_id,
      })
      const members = []
      for (const m of info.members || []) {
        const uid = m.member_id?.user_id ?? m.user_id
        if (!uid) continue
        try {
          const user = await this.getUser(uid)
          members.push({ userId: uid, firstName: user.first_name, lastName: user.last_name || '' })
        } catch { /* skip unavailable users */ }
      }
      return members
    }

    if (type?._ === 'chatTypeSupergroup') {
      const result = await this.invoke({
        _: 'getSupergroupMembers',
        supergroup_id: type.supergroup_id,
        filter: { _: 'supergroupMembersFilterRecent' },
        offset: 0,
        limit: 200,
      })
      const members = []
      for (const m of result.members || []) {
        const uid = m.member_id?.user_id ?? m.user_id
        if (!uid) continue
        try {
          const user = await this.getUser(uid)
          members.push({ userId: uid, firstName: user.first_name, lastName: user.last_name || '' })
        } catch { /* skip */ }
      }
      return members
    }

    return []
  }

  async downloadFile(fileId) {
    return this.invoke({
      _: 'downloadFile',
      file_id: fileId,
      priority: 5,
      synchronous: true,
    })
  }

  async close() {
    if (this.client) await this.client.close()
  }
}

const tdClient = new TDLibClient()
export default tdClient
