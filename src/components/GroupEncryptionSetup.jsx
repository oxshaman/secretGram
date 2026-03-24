import { useState, useEffect } from 'react'
import { api } from '../lib/api'
import { X, ShieldCheck, KeyRound, Fingerprint, UserCheck, UserX, Loader2, RefreshCw, Send } from 'lucide-react'
import {
  generateGroupKey,
  encryptGroupKeyForMember,
  getPublicKeyFingerprint,
} from '../lib/crypto'
import { saveGroupKey } from '../lib/keyStore'

export default function GroupEncryptionSetup({ chatId, keyPair, contactKeys, groupKeys, onClose, onKeysChanged }) {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [distributing, setDistributing] = useState(false)
  const [status, setStatus] = useState('')
  const existingKey = groupKeys[String(chatId)]

  useEffect(() => {
    api.getChatMembers(chatId).then((m) => {
      setMembers(m)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [chatId])

  const contactKeyMap = {}
  for (const ck of contactKeys) contactKeyMap[ck.userId] = ck

  const membersWithKeys = members.filter((m) => contactKeyMap[String(m.userId)])
  const membersWithoutKeys = members.filter((m) => !contactKeyMap[String(m.userId)])

  const handleDistribute = async () => {
    if (membersWithKeys.length === 0) return
    setDistributing(true)
    setStatus('Generating group key...')

    try {
      const groupKeyB64 = generateGroupKey()

      await saveGroupKey(String(chatId), groupKeyB64)

      let sent = 0
      for (const member of membersWithKeys) {
        const ck = contactKeyMap[String(member.userId)]
        if (!ck) continue

        setStatus(`Sending key to ${member.firstName}... (${sent + 1}/${membersWithKeys.length})`)

        const encryptedKeyMsg = encryptGroupKeyForMember(
          groupKeyB64,
          ck.publicKey,
          keyPair.secretKey,
        )
        await api.sendMessage(chatId, encryptedKeyMsg)
        sent++
      }

      setStatus(`Done! Key distributed to ${sent} member${sent !== 1 ? 's' : ''}.`)
      await onKeysChanged()

      setTimeout(onClose, 1500)
    } catch (err) {
      setStatus(`Error: ${err.message}`)
      setDistributing(false)
    }
  }

  const handleRotate = async () => {
    if (!confirm('Generate a new group key? All members will need to receive the new key.')) return
    await handleDistribute()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
      <div className="absolute inset-0 bg-p2-overlay" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-p2-sidebar rounded-2xl shadow-modal flex flex-col max-h-[80vh] animate-scale-in border border-p2-border/50">
        <div className="px-5 py-4 border-b border-p2-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-p2-accent" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-p2-text">
              {existingKey ? 'Group Encryption' : 'Set Up Group Encryption'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-p2-hover text-p2-muted hover:text-p2-text transition-all duration-150"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {existingKey && (
            <div className="p-4 rounded-xl bg-p2-green-dim border border-p2-green/20">
              <div className="text-sm font-medium text-p2-green flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" strokeWidth={2} />
                Group encryption is active
              </div>
              <div className="text-[11px] text-p2-muted mt-1.5 flex items-center gap-1.5">
                <Fingerprint className="w-3 h-3" />
                Key: {getPublicKeyFingerprint(existingKey)}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2.5 text-p2-muted text-sm py-8">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Loading members...</span>
            </div>
          ) : (
            <>
              <div>
                <h3 className="text-sm font-medium mb-2.5 text-p2-green flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" strokeWidth={1.5} />
                  Members with known keys ({membersWithKeys.length})
                </h3>
                {membersWithKeys.length === 0 ? (
                  <p className="text-xs text-p2-muted py-2">
                    No group members have known public keys. Add their keys in the Key Manager first.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {membersWithKeys.map((m) => (
                      <div key={m.userId} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-p2-surface border border-p2-border text-sm">
                        <KeyRound className="w-3.5 h-3.5 text-p2-green shrink-0" strokeWidth={2} />
                        <span className="text-p2-text">{m.firstName} {m.lastName}</span>
                        <span className="text-[11px] text-p2-muted font-mono ml-auto flex items-center gap-1">
                          <Fingerprint className="w-2.5 h-2.5" />
                          {getPublicKeyFingerprint(contactKeyMap[String(m.userId)].publicKey)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {membersWithoutKeys.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium mb-2.5 text-p2-warning flex items-center gap-1.5">
                    <UserX className="w-4 h-4" strokeWidth={1.5} />
                    Members without keys ({membersWithoutKeys.length})
                  </h3>
                  <p className="text-xs text-p2-muted mb-2">
                    These members won't be able to decrypt messages until you exchange personal keys with them.
                  </p>
                  <div className="space-y-1.5">
                    {membersWithoutKeys.map((m) => (
                      <div key={m.userId} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-p2-surface border border-p2-border text-sm">
                        <UserX className="w-3.5 h-3.5 text-p2-muted shrink-0" strokeWidth={1.5} />
                        <span className="text-p2-text-secondary">{m.firstName} {m.lastName}</span>
                        <span className="text-[11px] text-p2-muted ml-auto">ID: {m.userId}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {status && (
                <div className="text-sm text-p2-accent text-center py-2 flex items-center justify-center gap-2">
                  {distributing && <Loader2 className="w-4 h-4 animate-spin" />}
                  {status}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-p2-border shrink-0 space-y-2.5">
          {existingKey ? (
            <button
              onClick={handleRotate}
              disabled={distributing || membersWithKeys.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              <RefreshCw className="w-4 h-4" />
              Rotate Group Key
            </button>
          ) : (
            <button
              onClick={handleDistribute}
              disabled={distributing || membersWithKeys.length === 0}
              className="btn-primary w-full flex items-center justify-center gap-2 text-sm disabled:opacity-40"
            >
              {distributing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Distributing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Generate & Distribute Key ({membersWithKeys.length} member{membersWithKeys.length !== 1 ? 's' : ''})
                </>
              )}
            </button>
          )}
          <p className="text-[11px] text-p2-muted text-center">
            The group key is encrypted individually for each member using NaCl box.
          </p>
        </div>
      </div>
    </div>
  )
}
