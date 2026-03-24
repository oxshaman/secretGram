import { useState } from 'react'
import { X, Copy, Check, RefreshCw, UserPlus, Trash2, KeyRound, Fingerprint, Info } from 'lucide-react'
import { generateKeyPair, getPublicKeyFingerprint } from '../lib/crypto'
import {
  saveMyKeyPair,
  saveContactKey,
  removeContactKey,
} from '../lib/keyStore'

export default function KeyManager({ keyPair, contactKeys, onClose, onKeysChanged, prefillUserId, prefillName }) {
  const hasPrefill = !!prefillUserId
  const [newContactUserId, setNewContactUserId] = useState(prefillUserId || '')
  const [newContactKey, setNewContactKey] = useState('')
  const [newContactName, setNewContactName] = useState(prefillName || '')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState(hasPrefill ? 'contacts' : 'myKey')

  const handleCopyPublicKey = async () => {
    if (!keyPair?.publicKey) return
    await navigator.clipboard.writeText(keyPair.publicKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleRegenerate = async () => {
    if (!confirm('Generate a new keypair? You will need to re-exchange keys with all contacts.')) return
    const newPair = generateKeyPair()
    await saveMyKeyPair(newPair.publicKey, newPair.secretKey)
    await onKeysChanged()
  }

  const handleAddContact = async (e) => {
    e.preventDefault()
    setError('')
    const userId = newContactUserId.trim()
    const pubKey = newContactKey.trim()
    const name = newContactName.trim()

    if (!userId || !pubKey) {
      setError('User ID and public key are required')
      return
    }

    try {
      atob(pubKey)
      if (atob(pubKey).length !== 32) throw new Error('bad length')
    } catch {
      setError('Invalid public key (must be 44-char base64)')
      return
    }

    await saveContactKey(userId, pubKey, name)
    setNewContactUserId('')
    setNewContactKey('')
    setNewContactName('')
    await onKeysChanged()
  }

  const handleRemoveContact = async (userId) => {
    if (!confirm('Remove this contact key?')) return
    await removeContactKey(userId)
    await onKeysChanged()
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in">
      <div className="absolute inset-0 bg-p2-overlay" onClick={onClose} />
      <div className="relative ml-auto w-full max-w-md bg-p2-sidebar h-full flex flex-col shadow-modal animate-slide-in-right">
        <div className="px-5 py-4 border-b border-p2-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-5 h-5 text-p2-accent" strokeWidth={1.5} />
            <h2 className="text-base font-semibold text-p2-text">Encryption Keys</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-p2-hover text-p2-muted hover:text-p2-text transition-all duration-150"
          >
            <X className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex border-b border-p2-border shrink-0">
          <button
            onClick={() => setTab('myKey')}
            className={`flex-1 py-3 text-sm font-medium transition-all duration-150 relative ${
              tab === 'myKey'
                ? 'text-p2-accent'
                : 'text-p2-muted hover:text-p2-text'
            }`}
          >
            My Key
            {tab === 'myKey' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-p2-accent rounded-full" />
            )}
          </button>
          <button
            onClick={() => setTab('contacts')}
            className={`flex-1 py-3 text-sm font-medium transition-all duration-150 relative ${
              tab === 'contacts'
                ? 'text-p2-accent'
                : 'text-p2-muted hover:text-p2-text'
            }`}
          >
            Contacts ({contactKeys.length})
            {tab === 'contacts' && (
              <div className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-p2-accent rounded-full" />
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'myKey' && (
            <div className="space-y-5 animate-fade-in">
              <div>
                <label className="flex items-center gap-1.5 text-[11px] text-p2-muted mb-2 uppercase tracking-wider font-medium">
                  <Fingerprint className="w-3 h-3" />
                  Your Public Key
                </label>
                <p className="text-xs text-p2-text-secondary mb-3">
                  Share this with contacts so they can send you encrypted messages.
                </p>
                <div className="bg-p2-input rounded-xl p-3.5 font-mono text-xs break-all select-all text-p2-text-secondary border border-p2-border">
                  {keyPair?.publicKey || 'Generating...'}
                </div>
                {keyPair && (
                  <div className="text-[11px] text-p2-muted mt-2 flex items-center gap-1.5">
                    <Fingerprint className="w-3 h-3" />
                    {getPublicKeyFingerprint(keyPair.publicKey)}
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyPublicKey}
                  className="btn-primary flex-1 flex items-center justify-center gap-2 text-sm"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Public Key
                    </>
                  )}
                </button>
                <button
                  onClick={handleRegenerate}
                  className="btn-ghost flex items-center gap-2 text-sm !px-3"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-2 p-4 rounded-xl bg-p2-surface border border-p2-border">
                <h3 className="text-sm font-medium mb-2 flex items-center gap-1.5 text-p2-text">
                  <Info className="w-3.5 h-3.5 text-p2-accent" />
                  How key exchange works
                </h3>
                <ol className="text-xs text-p2-text-secondary space-y-1.5 list-decimal list-inside leading-relaxed">
                  <li>Copy your public key above</li>
                  <li>Send it to your contact via regular Telegram or email</li>
                  <li>Ask them to send their public key back to you</li>
                  <li>Add their key in the "Contacts" tab with their Telegram user ID</li>
                  <li>Both sides must have each other's keys to communicate</li>
                </ol>
              </div>
            </div>
          )}

          {tab === 'contacts' && (
            <div className="space-y-5 animate-fade-in">
              <form onSubmit={handleAddContact} className="space-y-3">
                <h3 className="text-sm font-medium flex items-center gap-1.5 text-p2-text">
                  <UserPlus className="w-4 h-4 text-p2-accent" />
                  Add Contact Key
                </h3>
                <input
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Display name (optional)"
                  className="input-field"
                />
                <input
                  value={newContactUserId}
                  onChange={(e) => setNewContactUserId(e.target.value)}
                  placeholder="Telegram User ID (numeric)"
                  className="input-field"
                />
                <textarea
                  value={newContactKey}
                  onChange={(e) => setNewContactKey(e.target.value)}
                  placeholder="Paste their public key (base64)"
                  rows={2}
                  className="input-field font-mono resize-none"
                />
                {error && (
                  <div className="flex items-center gap-2 text-p2-danger text-xs bg-p2-danger-dim rounded-xl px-3 py-2">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="btn-primary w-full flex items-center justify-center gap-2 text-sm"
                >
                  <UserPlus className="w-4 h-4" />
                  Add Contact Key
                </button>
              </form>

              <div className="border-t border-p2-border pt-5">
                <h3 className="text-sm font-medium mb-3 text-p2-text">
                  Saved Keys ({contactKeys.length})
                </h3>
                {contactKeys.length === 0 ? (
                  <p className="text-xs text-p2-muted py-4 text-center">
                    No contact keys yet. Add a contact's public key to start encrypted messaging.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {contactKeys.map((ck) => (
                      <div
                        key={ck.userId}
                        className="bg-p2-surface rounded-xl p-3.5 flex items-start justify-between gap-3 border border-p2-border"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-p2-text">
                            {ck.displayName || `User ${ck.userId}`}
                          </div>
                          <div className="text-[11px] text-p2-muted mt-0.5">
                            ID: {ck.userId}
                          </div>
                          <div className="text-[11px] font-mono text-p2-muted truncate mt-0.5 flex items-center gap-1">
                            <Fingerprint className="w-2.5 h-2.5 shrink-0" />
                            {getPublicKeyFingerprint(ck.publicKey)}
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveContact(ck.userId)}
                          className="text-p2-danger/60 hover:text-p2-danger p-1 rounded-lg hover:bg-p2-danger-dim transition-all duration-150 shrink-0"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
