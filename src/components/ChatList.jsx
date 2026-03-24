import { Loader2 } from 'lucide-react'
import ChatListItem from './ChatListItem'

export default function ChatList({ chats, activeChatId, onSelectChat }) {
  if (!chats.length) {
    return (
      <div className="flex-1 flex items-center justify-center text-p2-muted text-sm gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span>Loading chats...</span>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto py-1">
      {chats.map((chat) => (
        <ChatListItem
          key={chat.id}
          chat={chat}
          isActive={chat.id === activeChatId}
          onClick={() => onSelectChat(chat.id)}
        />
      ))}
    </div>
  )
}
