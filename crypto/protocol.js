/*
 * p2chat cryptographic protocol — the ONLY file that touches secret key material.
 *
 * TRUST BOUNDARY: This module is the security-critical core of p2chat.
 * It MUST satisfy these invariants:
 *   - Imports ONLY from ./vendor/ (vendored, hash-verified NaCl)
 *   - Contains NO network calls, NO DOM access, NO side effects
 *   - Every export is a pure function: (input) → output
 *
 * Algorithms:
 *   DM messages  — nacl.box   (Curve25519 + XSalsa20-Poly1305)
 *   Group messages — nacl.secretbox (XSalsa20-Poly1305)
 *   Group key wrap — nacl.box per recipient
 *   Fingerprints  — SHA-512 (via nacl.hash) of raw public key bytes
 *
 * Protocol spec: see crypto/README.md
 */

import nacl from './vendor/tweetnacl.cjs'
import naclUtil from './vendor/tweetnacl-util.cjs'

const { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } = naclUtil

// Wire format prefixes — changing these is a breaking protocol change
const PREFIX_DM = 'p2p:v1:'
const PREFIX_GROUP = 'p2p:v1:g:'
const PREFIX_GKEY = 'p2p:v1:gkey:'

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

export function generateKeyPair() {
  const pair = nacl.box.keyPair()
  return {
    publicKey: encodeBase64(pair.publicKey),
    secretKey: encodeBase64(pair.secretKey),
  }
}

export function generateGroupKey() {
  return encodeBase64(nacl.randomBytes(nacl.secretbox.keyLength))
}

// ---------------------------------------------------------------------------
// 1-to-1 DM encryption (NaCl box: Curve25519 + XSalsa20-Poly1305)
// ---------------------------------------------------------------------------

export function encryptMessage(plaintext, recipientPublicKeyB64, senderSecretKeyB64) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const messageBytes = decodeUTF8(plaintext)
  const recipientPub = decodeBase64(recipientPublicKeyB64)
  const senderSec = decodeBase64(senderSecretKeyB64)

  const encrypted = nacl.box(messageBytes, nonce, recipientPub, senderSec)
  if (!encrypted) throw new Error('Encryption failed')

  return PREFIX_DM + encodeBase64(nonce) + ':' + encodeBase64(encrypted)
}

export function decryptMessage(ciphertext, senderPublicKeyB64, recipientSecretKeyB64) {
  if (!isDMEncrypted(ciphertext)) return null

  try {
    const payload = ciphertext.slice(PREFIX_DM.length)
    if (payload.startsWith('g:') || payload.startsWith('gkey:')) return null

    const colonIdx = payload.indexOf(':')
    if (colonIdx === -1) return null

    const nonce = decodeBase64(payload.slice(0, colonIdx))
    const encrypted = decodeBase64(payload.slice(colonIdx + 1))
    const senderPub = decodeBase64(senderPublicKeyB64)
    const recipientSec = decodeBase64(recipientSecretKeyB64)

    const decrypted = nacl.box.open(encrypted, nonce, senderPub, recipientSec)
    if (!decrypted) return null

    return encodeUTF8(decrypted)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Group encryption (NaCl secretbox: XSalsa20-Poly1305 with shared key)
// ---------------------------------------------------------------------------

export function encryptGroupMessage(plaintext, groupKeyB64) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const messageBytes = decodeUTF8(plaintext)
  const key = decodeBase64(groupKeyB64)

  const encrypted = nacl.secretbox(messageBytes, nonce, key)
  if (!encrypted) throw new Error('Group encryption failed')

  return PREFIX_GROUP + encodeBase64(nonce) + ':' + encodeBase64(encrypted)
}

export function decryptGroupMessage(ciphertext, groupKeyB64) {
  if (!isGroupEncrypted(ciphertext)) return null

  try {
    const payload = ciphertext.slice(PREFIX_GROUP.length)
    const colonIdx = payload.indexOf(':')
    if (colonIdx === -1) return null

    const nonce = decodeBase64(payload.slice(0, colonIdx))
    const encrypted = decodeBase64(payload.slice(colonIdx + 1))
    const key = decodeBase64(groupKeyB64)

    const decrypted = nacl.secretbox.open(encrypted, nonce, key)
    if (!decrypted) return null

    return encodeUTF8(decrypted)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Group key distribution (wrap group key per-recipient using NaCl box)
// ---------------------------------------------------------------------------

export function encryptGroupKeyForMember(groupKeyB64, recipientPublicKeyB64, senderSecretKeyB64) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const groupKeyBytes = decodeBase64(groupKeyB64)
  const recipientPub = decodeBase64(recipientPublicKeyB64)
  const senderSec = decodeBase64(senderSecretKeyB64)

  const encrypted = nacl.box(groupKeyBytes, nonce, recipientPub, senderSec)
  if (!encrypted) throw new Error('Group key encryption failed')

  return PREFIX_GKEY + encodeBase64(nonce) + ':' + encodeBase64(encrypted)
}

export function tryDecryptGroupKey(message, senderPublicKeyB64, recipientSecretKeyB64) {
  if (!isGroupKeyMessage(message)) return null

  try {
    const payload = message.slice(PREFIX_GKEY.length)
    const colonIdx = payload.indexOf(':')
    if (colonIdx === -1) return null

    const nonce = decodeBase64(payload.slice(0, colonIdx))
    const encrypted = decodeBase64(payload.slice(colonIdx + 1))
    const senderPub = decodeBase64(senderPublicKeyB64)
    const recipientSec = decodeBase64(recipientSecretKeyB64)

    const decrypted = nacl.box.open(encrypted, nonce, senderPub, recipientSec)
    if (!decrypted || decrypted.length !== nacl.secretbox.keyLength) return null

    return encodeBase64(decrypted)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// Message type detection
// ---------------------------------------------------------------------------

export function isEncryptedMessage(text) {
  return typeof text === 'string' && text.startsWith(PREFIX_DM)
}

export function isDMEncrypted(text) {
  return isEncryptedMessage(text) && !isGroupEncrypted(text) && !isGroupKeyMessage(text)
}

export function isGroupEncrypted(text) {
  return typeof text === 'string' && text.startsWith(PREFIX_GROUP)
}

export function isGroupKeyMessage(text) {
  return typeof text === 'string' && text.startsWith(PREFIX_GKEY)
}

// ---------------------------------------------------------------------------
// Key fingerprints (SHA-512 of raw public key, displayed as hex)
// ---------------------------------------------------------------------------

export function getPublicKeyFingerprint(publicKeyB64) {
  const pubBytes = decodeBase64(publicKeyB64)
  const hash = nacl.hash(pubBytes) // SHA-512 → 64 bytes
  const hexPairs = []
  for (let i = 0; i < 8; i++) {
    hexPairs.push(hash[i].toString(16).padStart(2, '0'))
  }
  return hexPairs.join(':').toUpperCase()
}

// ---------------------------------------------------------------------------
// Internals exposed for self-test ONLY — not part of the public API
// ---------------------------------------------------------------------------

export const _internals = { nacl, naclUtil, PREFIX_DM, PREFIX_GROUP, PREFIX_GKEY }
