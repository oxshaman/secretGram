import { Lock, Key, Image, Video, FileText, Smile, Mic, Film, Play } from 'lucide-react'
import { isEncryptedMessage, isGroupKeyMessage } from '../lib/crypto'

function getInitials(title) {
  return title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

function formatTime(timestamp) {
  if (!timestamp) return ''
  const d = new Date(timestamp * 1000)
  const now = new Date()
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function getLastMessagePreview(msg) {
  if (!msg) return ''
  const text = msg.content?.text?.text || ''
  if (isGroupKeyMessage(text)) return { icon: Key, label: 'Encryption key' }
  if (isEncryptedMessage(text)) return { icon: Lock, label: 'Encrypted message' }
  if (msg.content?._ === 'messagePhoto') return { icon: Image, label: 'Photo' }
  if (msg.content?._ === 'messageVideo') return { icon: Video, label: 'Video' }
  if (msg.content?._ === 'messageDocument') return { icon: FileText, label: 'Document' }
  if (msg.content?._ === 'messageSticker') return { icon: Smile, label: msg.content.sticker?.emoji || 'Sticker' }
  if (msg.content?._ === 'messageVoiceNote') return { icon: Mic, label: 'Voice message' }
  if (msg.content?._ === 'messageVideoNote') return { icon: Film, label: 'Video message' }
  if (msg.content?._ === 'messageAnimation') return { icon: Play, label: 'GIF' }
  return text || '[Unsupported message]'
}

const COLORS = [
  'from-rose-500 to-pink-600',
  'from-emerald-500 to-teal-600',
  'from-amber-400 to-orange-500',
  'from-sky-500 to-blue-600',
  'from-violet-500 to-purple-600',
  'from-pink-400 to-rose-500',
  'from-cyan-400 to-teal-500',
  'from-orange-400 to-red-500',
]

function getAvatarGradient(id) {
  return COLORS[Math.abs(id) % COLORS.length]
}

export default function ChatListItem({ chat, isActive, onClick }) {
  const preview = getLastMessagePreview(chat.last_message)
  const time = formatTime(chat.last_message?.date)
  const unread = chat.unread_count || 0
  const isIconPreview = preview && typeof preview === 'object'

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all duration-150 mx-auto ${
        isActive
          ? 'bg-p2-accent/15'
          : 'hover:bg-p2-hover'
      }`}
    >
      <div
        className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarGradient(chat.id)} flex items-center justify-center text-white font-semibold text-xs shrink-0 shadow-sm`}
      >
        {getInitials(chat.title || '?')}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-baseline gap-2">
          <span className={`text-[13px] font-medium truncate ${isActive ? 'text-p2-accent' : 'text-p2-text'}`}>
            {chat.title}
          </span>
          <span className="text-[11px] text-p2-muted shrink-0">{time}</span>
        </div>
        <div className="flex justify-between items-center gap-2 mt-0.5">
          <span className="text-xs text-p2-muted truncate flex items-center gap-1.5">
            {isIconPreview ? (
              <>
                <preview.icon className="w-3 h-3 shrink-0" strokeWidth={2} />
                <span>{preview.label}</span>
              </>
            ) : (
              preview
            )}
          </span>
          {unread > 0 && (
            <span className="bg-p2-accent text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center shrink-0 leading-tight">
              {unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
