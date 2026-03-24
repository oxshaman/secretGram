import { useState, useRef } from 'react'
import { Send, Lock, AlertTriangle, Loader2 } from 'lucide-react'
import { encryptMessage, encryptGroupMessage } from '../lib/crypto'

export default function MessageInput({ onSend, keyPair, contactKey, groupKeyB64, encryptionEnabled, isPrivate, isGroup, chatReady }) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const inputRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || sending || !chatReady) return

    if ((isPrivate || isGroup) && !encryptionEnabled) {
      if (!confirm('Encryption is not active for this chat. Send as plaintext?')) return
    }

    setSending(true)
    try {
      let messageText = trimmed
      if (encryptionEnabled) {
        if (isGroup && groupKeyB64) {
          messageText = encryptGroupMessage(trimmed, groupKeyB64)
        } else if (contactKey?.publicKey && keyPair?.secretKey) {
          messageText = encryptMessage(trimmed, contactKey.publicKey, keyPair.secretKey)
        }
      }
      await onSend(messageText)
      setText('')
      inputRef.current?.focus()
    } catch (err) {
      console.error('Send failed:', err)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const noEncryptionReason = isPrivate && !contactKey
    ? 'No encryption key for this contact'
    : isGroup && !groupKeyB64
      ? 'No group encryption key'
      : null

  return (
    <form onSubmit={handleSubmit} className="px-4 py-3 border-t border-p2-border bg-p2-sidebar/80 glass shrink-0">
      {encryptionEnabled ? (
        <div className="text-[11px] text-p2-green mb-2.5 flex items-center gap-1.5 px-1">
          <Lock className="w-3 h-3" strokeWidth={2} />
          <span>End-to-end encrypted{isGroup ? ' (group key)' : ''}</span>
        </div>
      ) : noEncryptionReason ? (
        <div className="text-[11px] text-p2-warning mb-2.5 flex items-center gap-1.5 px-1">
          <AlertTriangle className="w-3 h-3" strokeWidth={2} />
          <span>{noEncryptionReason} — messages will be sent as plaintext</span>
        </div>
      ) : null}
      <div className="flex items-end gap-2.5">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={encryptionEnabled ? 'Encrypted message...' : 'Message (unencrypted)...'}
          rows={1}
          disabled={!chatReady}
          className="input-field flex-1 resize-none max-h-32 !py-2.5 disabled:opacity-30"
          style={{ minHeight: '42px' }}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending || !chatReady}
          className="p-2.5 rounded-xl bg-p2-accent text-white disabled:opacity-20 hover:bg-p2-accent-hover active:scale-95 transition-all duration-150 shrink-0"
        >
          {sending ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" strokeWidth={1.5} />
          )}
        </button>
      </div>
    </form>
  )
}
