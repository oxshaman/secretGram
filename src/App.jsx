import { useState, useEffect, useCallback } from 'react'
import { api } from './lib/api'
import { wsClient } from './lib/ws'
import { getMyKeyPair, saveMyKeyPair, getContactKeys, getGroupKeys, saveGroupKey } from './lib/keyStore'
import { generateKeyPair, isGroupKeyMessage, tryDecryptGroupKey } from './lib/crypto'
import { runSelfTest } from '../crypto/selftest.js'
import AuthFlow from './components/AuthFlow'
import Sidebar from './components/Sidebar'
import ChatWindow from './components/ChatWindow'
import KeyManager from './components/KeyManager'
import GroupEncryptionSetup from './components/GroupEncryptionSetup'

export default function App() {
  const [authState, setAuthState] = useState('loading')
  const [me, setMe] = useState(null)
  const [cryptoOk, setCryptoOk] = useState(null)
  const [chats, setChats] = useState([])
  const [activeChatId, setActiveChatId] = useState(null)
  const [keyPair, setKeyPair] = useState(null)
  const [contactKeys, setContactKeys] = useState([])
  const [groupKeys, setGroupKeys] = useState({})
  const [keyManagerState, setKeyManagerState] = useState(null)
  const [groupSetupChatId, setGroupSetupChatId] = useState(null)

  const loadKeys = useCallback(async () => {
    let kp = await getMyKeyPair()
    if (!kp) {
      const generated = generateKeyPair()
      await saveMyKeyPair(generated.publicKey, generated.secretKey)
      kp = generated
    }
    setKeyPair(kp)
    const contacts = await getContactKeys()
    setContactKeys(contacts)
    const groups = await getGroupKeys()
    const gkMap = {}
    for (const g of groups) gkMap[g.chatId] = g.groupKey
    setGroupKeys(gkMap)
  }, [])

  const openKeyManager = useCallback((prefillUserId, prefillName) => {
    setKeyManagerState({ prefillUserId: prefillUserId || '', prefillName: prefillName || '' })
  }, [])

  const tryAutoImportGroupKey = useCallback(async (msg, currentKeyPair, currentContactKeys) => {
    const text = msg.content?.text?.text
    if (!text || !isGroupKeyMessage(text)) return
    if (!currentKeyPair?.secretKey) return

    const senderUserId = msg.sender_id?.user_id
    if (!senderUserId) return

    for (const ck of currentContactKeys) {
      if (ck.userId === String(senderUserId)) {
        const groupKeyB64 = tryDecryptGroupKey(text, ck.publicKey, currentKeyPair.secretKey)
        if (groupKeyB64) {
          await saveGroupKey(String(msg.chat_id), groupKeyB64)
          setGroupKeys((prev) => ({ ...prev, [String(msg.chat_id)]: groupKeyB64 }))
          return
        }
      }
    }

    for (const ck of currentContactKeys) {
      const groupKeyB64 = tryDecryptGroupKey(text, ck.publicKey, currentKeyPair.secretKey)
      if (groupKeyB64) {
        await saveGroupKey(String(msg.chat_id), groupKeyB64)
        setGroupKeys((prev) => ({ ...prev, [String(msg.chat_id)]: groupKeyB64 }))
        return
      }
    }
  }, [])

  useEffect(() => {
    const { passed } = runSelfTest()
    setCryptoOk(passed)
    if (!passed) console.error('CRYPTO SELF-TEST FAILED — encryption may be compromised')

    loadKeys()
    api.getAuthState().then(({ state }) => setAuthState(state))
    wsClient.connect()

    const offAuth = wsClient.on('auth:state', (state) => {
      setAuthState(state)
      if (state === 'ready') {
        api.getMe().then(setMe)
        api.getChats().then(setChats)
      }
    })

    const offMsg = wsClient.on('update:message', (msg) => {
      setChats((prev) => {
        const idx = prev.findIndex((c) => c.id === msg.chat_id)
        if (idx === -1) return prev
        const updated = [...prev]
        updated[idx] = { ...updated[idx], last_message: msg }
        const [moved] = updated.splice(idx, 1)
        updated.unshift(moved)
        return updated
      })
    })

    const offChat = wsClient.on('update:chat', (data) => {
      setChats((prev) =>
        prev.map((c) =>
          c.id === data.chat_id ? { ...c, ...data } : c,
        ),
      )
    })

    return () => {
      offAuth()
      offMsg()
      offChat()
      wsClient.disconnect()
    }
  }, [loadKeys])

  useEffect(() => {
    const off = wsClient.on('update:message', (msg) => {
      tryAutoImportGroupKey(msg, keyPair, contactKeys)
    })
    return off
  }, [keyPair, contactKeys, tryAutoImportGroupKey])

  useEffect(() => {
    if (authState === 'ready') {
      api.getMe().then(setMe)
      api.getChats().then(setChats)
    }
  }, [authState])

  if (authState === 'loading') {
    return (
      <div className="h-screen flex items-center justify-center bg-p2-bg">
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-10 h-10 rounded-xl border-2 border-p2-accent/30 border-t-p2-accent animate-spin" />
          <span className="text-p2-muted text-sm">Connecting...</span>
        </div>
      </div>
    )
  }

  if (authState !== 'ready') {
    return <AuthFlow authState={authState} />
  }

  return (
    <div className="h-screen flex overflow-hidden bg-p2-bg">
      {cryptoOk === false && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-red-600 text-white text-center py-2 text-sm font-medium">
          Crypto self-test FAILED — encryption may be compromised. Do not send sensitive messages.
        </div>
      )}
      <Sidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={setActiveChatId}
        me={me}
        keyPair={keyPair}
        cryptoOk={cryptoOk}
        onOpenKeyManager={() => openKeyManager()}
      />
      <ChatWindow
        chatId={activeChatId}
        keyPair={keyPair}
        contactKeys={contactKeys}
        groupKeys={groupKeys}
        me={me}
        onOpenKeyManager={openKeyManager}
        onSetupGroupEncryption={(chatId) => setGroupSetupChatId(chatId)}
      />
      {keyManagerState && (
        <KeyManager
          keyPair={keyPair}
          contactKeys={contactKeys}
          onClose={() => setKeyManagerState(null)}
          onKeysChanged={loadKeys}
          prefillUserId={keyManagerState.prefillUserId}
          prefillName={keyManagerState.prefillName}
        />
      )}
      {groupSetupChatId && (
        <GroupEncryptionSetup
          chatId={groupSetupChatId}
          keyPair={keyPair}
          contactKeys={contactKeys}
          groupKeys={groupKeys}
          onClose={() => setGroupSetupChatId(null)}
          onKeysChanged={loadKeys}
        />
      )}
    </div>
  )
}
