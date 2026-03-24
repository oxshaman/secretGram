/*
 * TRUST ZONE 3 — App-level re-export.
 *
 * This file re-exports the cryptographic protocol from the auditable
 * crypto/ module. All crypto operations are defined in crypto/protocol.js.
 * This file exists only so existing app imports continue to work.
 */

export {
  generateKeyPair,
  generateGroupKey,
  encryptMessage,
  decryptMessage,
  encryptGroupMessage,
  decryptGroupMessage,
  encryptGroupKeyForMember,
  tryDecryptGroupKey,
  isEncryptedMessage,
  isDMEncrypted,
  isGroupEncrypted,
  isGroupKeyMessage,
  getPublicKeyFingerprint,
} from '../../crypto/protocol.js'
