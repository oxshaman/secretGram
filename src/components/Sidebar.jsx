import { KeyRound, ShieldCheck, ShieldAlert } from 'lucide-react'
import { getPublicKeyFingerprint } from '../lib/crypto'
import ChatList from './ChatList'

export default function Sidebar({ chats, activeChatId, onSelectChat, me, keyPair, cryptoOk, onOpenKeyManager }) {
  return (
    <div className="w-80 min-w-[320px] bg-p2-sidebar flex flex-col border-r border-p2-border h-screen">
      <div className="p-3.5 flex items-center justify-between border-b border-p2-border shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-p2-accent/15 flex items-center justify-center text-sm font-semibold text-p2-accent shrink-0">
            {me?.first_name?.[0] || '?'}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate text-p2-text">
              {me?.first_name || 'Loading...'} {me?.last_name || ''}
            </div>
            {keyPair && (
              <div className="text-[11px] text-p2-muted font-mono mt-0.5">
                {getPublicKeyFingerprint(keyPair.publicKey)}
              </div>
            )}
          </div>
        </div>
          <button
          onClick={onOpenKeyManager}
          className="p-2 rounded-xl hover:bg-p2-hover text-p2-muted hover:text-p2-text transition-all duration-150 shrink-0"
          title="Manage encryption keys"
        >
          <KeyRound className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>
      </div>
      {cryptoOk !== null && (
        <div className={`px-3.5 py-1.5 border-b border-p2-border text-[11px] flex items-center gap-1.5 ${
          cryptoOk ? 'text-p2-green' : 'text-red-500'
        }`}>
          {cryptoOk
            ? <><ShieldCheck className="w-3 h-3" strokeWidth={2} /> Crypto self-test passed</>
            : <><ShieldAlert className="w-3 h-3" strokeWidth={2} /> Crypto self-test FAILED</>
          }
        </div>
      )}
      <ChatList
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={onSelectChat}
      />
    </div>
  )
}
