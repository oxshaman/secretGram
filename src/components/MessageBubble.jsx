import { useMemo } from 'react'
import { Lock, KeyRound, Image, Video, FileText, Smile, Mic, Film, Play } from 'lucide-react'
import {
  isDMEncrypted,
  isGroupEncrypted,
  isGroupKeyMessage,
  decryptMessage,
  decryptGroupMessage,
} from '../lib/crypto'

function formatTime(timestamp) {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function MessageBubble({ message, isOwn, keyPair, contactKey, contactKeys, groupKeyB64, isGroup }) {
  const rawText = message.content?.text?.text || ''
  const dmEncrypted = isDMEncrypted(rawText)
  const groupEncrypted = isGroupEncrypted(rawText)
  const isGkeyMsg = isGroupKeyMessage(rawText)
  const isEncrypted = dmEncrypted || groupEncrypted

  const displayText = useMemo(() => {
    if (isGkeyMsg) return null

    if (groupEncrypted) {
      if (!groupKeyB64) return null
      return decryptGroupMessage(rawText, groupKeyB64)
    }

    if (dmEncrypted) {
      if (!keyPair?.secretKey) return null

      if (contactKey?.publicKey) {
        const result = decryptMessage(rawText, contactKey.publicKey, keyPair.secretKey)
        if (result) return result
      }

      if (isGroup && contactKeys) {
        const senderId = String(message.sender_id?.user_id || '')
        const senderKey = contactKeys.find((ck) => ck.userId === senderId)
        if (senderKey) {
          return decryptMessage(rawText, senderKey.publicKey, keyPair.secretKey)
        }
      }
      return null
    }

    return rawText
  }, [rawText, dmEncrypted, groupEncrypted, isGkeyMsg, contactKey, contactKeys, keyPair, groupKeyB64, isGroup, message.sender_id?.user_id])

  if (isGkeyMsg) {
    return (
      <div className="flex justify-center my-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-p2-muted bg-p2-surface/60 px-3.5 py-1.5 rounded-full border border-p2-border/50">
          <KeyRound className="w-3 h-3" strokeWidth={2} />
          {isOwn ? 'You distributed' : 'Received'} an encryption key
        </span>
      </div>
    )
  }

  if (!rawText && message.content?._ !== 'messageText') {
    const typeMap = {
      messagePhoto: { icon: Image, label: 'Photo' },
      messageVideo: { icon: Video, label: 'Video' },
      messageDocument: { icon: FileText, label: 'Document' },
      messageSticker: { icon: Smile, label: message.content?.sticker?.emoji || 'Sticker' },
      messageVoiceNote: { icon: Mic, label: 'Voice message' },
      messageVideoNote: { icon: Film, label: 'Video message' },
      messageAnimation: { icon: Play, label: 'GIF' },
    }
    const entry = typeMap[message.content?._] || { icon: FileText, label: 'Unsupported' }
    const TypeIcon = entry.icon

    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-md px-3.5 py-2.5 rounded-2xl text-sm ${
            isOwn
              ? 'bg-p2-bubble-out rounded-br-md'
              : 'bg-p2-bubble rounded-bl-md'
          }`}
        >
          <span className="text-p2-muted italic flex items-center gap-1.5 text-xs">
            <TypeIcon className="w-3.5 h-3.5" strokeWidth={1.5} />
            {entry.label}
          </span>
          <div className="text-[10px] text-p2-muted/60 text-right mt-1">
            {formatTime(message.date)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-md px-3.5 py-2 rounded-2xl text-[14px] leading-relaxed ${
          isOwn
            ? 'bg-p2-bubble-out rounded-br-md'
            : 'bg-p2-bubble rounded-bl-md'
        }`}
      >
        {isEncrypted ? (
          <div>
            {displayText ? (
              <div className="flex items-start gap-2">
                <Lock className="w-3 h-3 text-p2-green mt-1 shrink-0" strokeWidth={2} />
                <span className="whitespace-pre-wrap break-words">{displayText}</span>
              </div>
            ) : (
              <span className="text-p2-muted italic flex items-center gap-1.5 text-sm">
                <Lock className="w-3 h-3" strokeWidth={2} />
                Encrypted message (no key)
              </span>
            )}
          </div>
        ) : (
          <span className="whitespace-pre-wrap break-words">{rawText}</span>
        )}
        <div className="text-[10px] text-p2-muted/50 text-right mt-1 flex items-center justify-end gap-1">
          {isEncrypted && displayText && (
            <Lock className="w-2.5 h-2.5 text-p2-green" strokeWidth={2} />
          )}
          {formatTime(message.date)}
        </div>
      </div>
    </div>
  )
}
