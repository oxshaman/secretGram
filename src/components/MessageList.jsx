import { useEffect, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import MessageBubble from './MessageBubble'

export default function MessageList({ messages, loading, keyPair, contactKey, contactKeys, groupKeyB64, myId, isGroup }) {
  const bottomRef = useRef(null)
  const containerRef = useRef(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 200
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView()
  }, [messages.length > 0 && messages[0]?.chat_id])

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2.5 text-p2-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading messages...</span>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
      {messages.map((msg) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isOwn={msg.sender_id?.user_id === myId}
          keyPair={keyPair}
          contactKey={contactKey}
          contactKeys={contactKeys}
          groupKeyB64={groupKeyB64}
          isGroup={isGroup}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
