import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import apiRouter from './api.js'
import tdClient from './tdlib.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

const app = express()
const server = createServer(app)

app.use(cors())
app.use(express.json())
app.use('/api', apiRouter)

const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next()
  res.sendFile(join(distPath, 'index.html'))
})

const wss = new WebSocketServer({ server, path: '/ws' })
const wsClients = new Set()

wss.on('connection', (ws) => {
  wsClients.add(ws)
  ws.send(JSON.stringify({ type: 'auth:state', data: tdClient.authState }))
  ws.on('close', () => wsClients.delete(ws))
})

function broadcast(type, data) {
  const msg = JSON.stringify({ type, data })
  for (const ws of wsClients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

const apiId = process.env.TG_API_ID
const apiHash = process.env.TG_API_HASH

if (!apiId || !apiHash) {
  console.error('Missing TG_API_ID or TG_API_HASH in .env')
  console.error('Get them at https://my.telegram.org and add to .env')
  process.exit(1)
}

tdClient.init(apiId, apiHash)

tdClient.on('authState', (state) => broadcast('auth:state', state))
tdClient.on('newMessage', (msg) => broadcast('update:message', msg))
tdClient.on('chatUpdate', (data) => broadcast('update:chat', data))
tdClient.on('messageSendSucceeded', (data) => broadcast('update:messageSent', data))

const PORT = process.env.PORT || 3001
server.listen(PORT, () => {
  console.log(`P2Chat server running on http://localhost:${PORT}`)
})

process.on('SIGINT', async () => {
  await tdClient.close()
  process.exit(0)
})
