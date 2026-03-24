import { Lock, Unlock, KeyRound, ShieldCheck, ShieldAlert, Users } from 'lucide-react'

export default function ChatHeader({
  chatInfo,
  canEncrypt,
  encryptionEnabled,
  onToggleEncryption,
  onOpenKeyManager,
  onSetupGroupEncryption,
  contactKey,
  isPrivate,
  isGroup,
  peerUserId,
  hasGroupKey,
}) {
  const title = chatInfo?.chat?.title || 'Chat'

  let StatusIcon, statusText, statusColor
  if (canEncrypt && encryptionEnabled) {
    StatusIcon = ShieldCheck
    statusText = 'End-to-end encrypted'
    statusColor = 'text-p2-green'
  } else if (isPrivate && !contactKey) {
    StatusIcon = ShieldAlert
    statusText = 'No key exchanged'
    statusColor = 'text-p2-warning'
  } else if (isGroup && !hasGroupKey) {
    StatusIcon = ShieldAlert
    statusText = 'No group key'
    statusColor = 'text-p2-warning'
  } else {
    StatusIcon = Unlock
    statusText = 'Unencrypted'
    statusColor = 'text-p2-muted'
  }

  return (
    <div className="px-5 py-3 border-b border-p2-border flex items-center justify-between shrink-0 bg-p2-sidebar/80 glass">
      <div className="min-w-0">
        <div className="font-medium text-[15px] text-p2-text truncate">{title}</div>
        <div className={`text-xs flex items-center gap-1.5 mt-0.5 ${statusColor}`}>
          <StatusIcon className="w-3 h-3" strokeWidth={2} />
          <span>{statusText}</span>
          {isPrivate && peerUserId && (
            <span className="font-mono text-p2-muted opacity-60 ml-1">ID: {peerUserId}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {canEncrypt && (
          <button
            onClick={onToggleEncryption}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              encryptionEnabled
                ? 'bg-p2-green-dim text-p2-green'
                : 'bg-p2-surface text-p2-muted hover:text-p2-text'
            }`}
          >
            {encryptionEnabled ? (
              <Lock className="w-3 h-3" strokeWidth={2} />
            ) : (
              <Unlock className="w-3 h-3" strokeWidth={2} />
            )}
            {encryptionEnabled ? 'Encrypted' : 'Plain'}
          </button>
        )}
        {isPrivate && !contactKey && (
          <button
            onClick={onOpenKeyManager}
            className="btn-primary flex items-center gap-1.5 !px-3 !py-1.5 text-xs"
          >
            <KeyRound className="w-3 h-3" strokeWidth={2} />
            Exchange Keys
          </button>
        )}
        {isGroup && (
          <button
            onClick={onSetupGroupEncryption}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              hasGroupKey
                ? 'bg-p2-surface text-p2-muted hover:text-p2-text hover:bg-p2-hover'
                : 'bg-p2-accent text-white hover:bg-p2-accent-hover'
            }`}
          >
            {hasGroupKey ? (
              <>
                <KeyRound className="w-3 h-3" strokeWidth={2} />
                Group Key
              </>
            ) : (
              <>
                <Users className="w-3 h-3" strokeWidth={2} />
                Set Up Encryption
              </>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
