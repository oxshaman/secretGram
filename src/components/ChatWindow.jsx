import { useState, useEffect, useRef, useCallback } from 'react'
import { api } from '../lib/api'
import { wsClient } from '../lib/ws'
import { Shield, MessageSquare } from 'lucide-react'
import ChatHeader from './ChatHeader'
import MessageList from './MessageList'
import MessageInput from './MessageInput'

export default function ChatWindow({ chatId, keyPair, contactKeys, groupKeys, me, onOpenKeyManager, onSetupGroupEncryption }) {
  const [messages, setMessages] = useState([])
  const [chatInfo, setChatInfo] = useState(null)
  const [loading, setLoading] = useState(false)
  const [encryptionEnabled, setEncryptionEnabled] = useState(true)
  const chatIdRef = useRef(chatId)

  const chatType = chatInfo?.chat?.type?._
  const isPrivate = chatType === 'chatTypePrivate'
  const isGroup = chatType === 'chatTypeBasicGroup' || chatType === 'chatTypeSupergroup'

  const peerUserId = chatInfo?.user?.id ? String(chatInfo.user.id) : null
  const contactKey = contactKeys.find((ck) => peerUserId && ck.userId === peerUserId)
  const groupKeyB64 = isGroup ? groupKeys[String(chatId)] : null

  const canEncrypt = isPrivate
    ? !!contactKey && !!keyPair
    : isGroup
      ? !!groupKeyB64
      : false

  useEffect(() => {
    chatIdRef.current = chatId
    setChatInfo(null)
    setMessages([])

    if (!chatId) return

    setLoading(true)
    Promise.all([api.getChat(chatId), api.getMessages(chatId)]).then(
      ([info, msgResult]) => {
        if (chatIdRef.current !== chatId) return
        setChatInfo(info)
        setMessages((msgResult.messages || []).reverse())
        setLoading(false)
      },
    ).catch(() => setLoading(false))
  }, [chatId])

  useEffect(() => {
    const offMsg = wsClient.on('update:message', (msg) => {
      if (msg.chat_id === chatIdRef.current) {
        setMessages((prev) =>
          prev.some((m) => m.id === msg.id) ? prev : [...prev, msg],
        )
      }
    })
    const offSent = wsClient.on('update:messageSent', ({ old_message_id, message }) => {
      if (message.chat_id === chatIdRef.current) {
        setMessages((prev) =>
          prev.map((m) => (m.id === old_message_id ? message : m)),
        )
      }
    })
    return () => { offMsg(); offSent() }
  }, [])

  const handleSend = useCallback(
    async (text) => {
      await api.sendMessage(chatId, text)
    },
    [chatId],
  )

  if (!chatId) {
    return (
      <div className="flex-1 flex items-center justify-center bg-p2-bg">
        <div className="text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-p2-surface border border-p2-border mb-5">
            <Shield className="w-9 h-9 text-p2-muted" strokeWidth={1.5} />
          </div>
          <div className="text-lg font-medium text-p2-text">P2Chat</div>
          <div className="text-sm text-p2-muted mt-1.5 flex items-center justify-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            Select a chat to start messaging
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-p2-bg h-screen">
      <ChatHeader
        chatInfo={chatInfo}
        canEncrypt={canEncrypt}
        encryptionEnabled={encryptionEnabled}
        onToggleEncryption={() => setEncryptionEnabled((v) => !v)}
        onOpenKeyManager={() => onOpenKeyManager(peerUserId, chatInfo?.chat?.title)}
        onSetupGroupEncryption={() => onSetupGroupEncryption(chatId)}
        contactKey={contactKey}
        isPrivate={isPrivate}
        isGroup={isGroup}
        peerUserId={peerUserId}
        hasGroupKey={!!groupKeyB64}
      />
      <MessageList
        messages={messages}
        loading={loading}
        keyPair={keyPair}
        contactKey={contactKey}
        contactKeys={contactKeys}
        groupKeyB64={groupKeyB64}
        myId={me?.id}
        isGroup={isGroup}
      />
      <MessageInput
        onSend={handleSend}
        keyPair={keyPair}
        contactKey={contactKey}
        groupKeyB64={groupKeyB64}
        encryptionEnabled={encryptionEnabled && canEncrypt}
        isPrivate={isPrivate}
        isGroup={isGroup}
        chatReady={!!chatInfo}
      />
    </div>
  )
}
