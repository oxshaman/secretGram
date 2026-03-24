import { Router } from 'express'
import tdClient from './tdlib.js'
import fs from 'fs'
import path from 'path'

const router = Router()

router.get('/auth/state', (req, res) => {
  res.json({ state: tdClient.authState, myId: tdClient.myId })
})

router.post('/auth/phone', async (req, res) => {
  try {
    await tdClient.setPhoneNumber(req.body.phone)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/auth/code', async (req, res) => {
  try {
    await tdClient.setAuthCode(req.body.code)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.post('/auth/password', async (req, res) => {
  try {
    await tdClient.setPassword(req.body.password)
    res.json({ ok: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.get('/me', async (req, res) => {
  try {
    const me = await tdClient.getMe()
    res.json(me)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/chats', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 30
    const chats = await tdClient.getChats(limit)
    res.json(chats)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/chats/:id', async (req, res) => {
  try {
    const chat = await tdClient.getChat(Number(req.params.id))
    let user = null
    if (chat.type?._ === 'chatTypePrivate') {
      user = await tdClient.getUser(chat.type.user_id)
    }
    res.json({ chat, user })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/chats/:id/members', async (req, res) => {
  try {
    const chatId = Number(req.params.id)
    const members = await tdClient.getChatMembers(chatId)
    res.json(members)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/chats/:id/messages', async (req, res) => {
  try {
    const chatId = Number(req.params.id)
    const fromMessageId = Number(req.query.from_message_id) || 0
    const limit = parseInt(req.query.limit) || 50
    const result = await tdClient.getChatMessages(chatId, fromMessageId, limit)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/chats/:id/messages', async (req, res) => {
  try {
    const chatId = Number(req.params.id)
    const result = await tdClient.sendMessage(chatId, req.body.text)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/user/:id', async (req, res) => {
  try {
    const user = await tdClient.getUser(Number(req.params.id))
    res.json(user)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/file/:fileId', async (req, res) => {
  try {
    const file = await tdClient.downloadFile(Number(req.params.fileId))
    const localPath = file.local?.path
    if (localPath && fs.existsSync(localPath)) {
      res.sendFile(path.resolve(localPath))
    } else {
      res.status(404).json({ error: 'File not available' })
    }
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
