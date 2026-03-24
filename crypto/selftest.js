/*
 * Cryptographic self-test for p2chat.
 *
 * Runs known-answer vectors and roundtrip tests against crypto/protocol.js.
 * Called at app startup to detect tampered builds or broken crypto.
 *
 * Usage:
 *   Browser:  import and call runSelfTest() from crypto/selftest.js
 *   CLI:      node crypto/selftest.js
 */

import {
  generateKeyPair,
  generateGroupKey,
  encryptMessage,
  decryptMessage,
  encryptGroupMessage,
  decryptGroupMessage,
  encryptGroupKeyForMember,
  tryDecryptGroupKey,
  isDMEncrypted,
  isGroupEncrypted,
  isGroupKeyMessage,
  getPublicKeyFingerprint,
  _internals,
} from './protocol.js'

import { ALICE, BOB, DM_VECTOR, GROUP_VECTOR, GKEY_VECTOR } from './vectors.js'

function assert(condition, name) {
  if (!condition) throw new Error(`FAIL: ${name}`)
}

function runKnownAnswerTests() {
  const { nacl, naclUtil } = _internals
  const { decodeBase64, encodeBase64, decodeUTF8 } = naclUtil

  // 1. Keypair derivation: known secret key → expected public key
  const aliceKP = nacl.box.keyPair.fromSecretKey(decodeBase64(ALICE.secretKey))
  assert(
    encodeBase64(aliceKP.publicKey) === ALICE.publicKey,
    'Alice keypair derivation'
  )

  const bobKP = nacl.box.keyPair.fromSecretKey(decodeBase64(BOB.secretKey))
  assert(
    encodeBase64(bobKP.publicKey) === BOB.publicKey,
    'Bob keypair derivation'
  )

  // 2. DM encryption: known inputs → expected ciphertext
  const dmNonce = decodeBase64(DM_VECTOR.nonce)
  const dmCipher = nacl.box(
    decodeUTF8(DM_VECTOR.plaintext),
    dmNonce,
    decodeBase64(BOB.publicKey),
    decodeBase64(ALICE.secretKey)
  )
  assert(
    encodeBase64(dmCipher) === DM_VECTOR.ciphertext,
    'DM known-answer ciphertext'
  )

  // 3. Group encryption: known inputs → expected ciphertext
  const groupNonce = decodeBase64(GROUP_VECTOR.nonce)
  const groupCipher = nacl.secretbox(
    decodeUTF8(GROUP_VECTOR.plaintext),
    groupNonce,
    decodeBase64(GROUP_VECTOR.groupKey)
  )
  assert(
    encodeBase64(groupCipher) === GROUP_VECTOR.ciphertext,
    'Group known-answer ciphertext'
  )

  // 4. Group key wrap: known inputs → expected ciphertext
  const gkeyNonce = decodeBase64(GKEY_VECTOR.nonce)
  const gkeyWrapped = nacl.box(
    decodeBase64(GKEY_VECTOR.wrappedGroupKey),
    gkeyNonce,
    decodeBase64(BOB.publicKey),
    decodeBase64(ALICE.secretKey)
  )
  assert(
    encodeBase64(gkeyWrapped) === GKEY_VECTOR.ciphertext,
    'Group key wrap known-answer ciphertext'
  )
}

function runProtocolTests() {
  // 5. DM wire format and decryption roundtrip
  assert(isDMEncrypted(DM_VECTOR.wire), 'DM wire detected as DM encrypted')
  assert(!isGroupEncrypted(DM_VECTOR.wire), 'DM wire not detected as group')
  assert(!isGroupKeyMessage(DM_VECTOR.wire), 'DM wire not detected as gkey')

  const dmDecrypted = decryptMessage(DM_VECTOR.wire, ALICE.publicKey, BOB.secretKey)
  assert(dmDecrypted === DM_VECTOR.plaintext, 'DM decrypt from wire format')

  // 6. Group wire format and decryption roundtrip
  assert(isGroupEncrypted(GROUP_VECTOR.wire), 'Group wire detected as group encrypted')
  assert(!isGroupKeyMessage(GROUP_VECTOR.wire), 'Group wire not detected as gkey')

  const groupDecrypted = decryptGroupMessage(GROUP_VECTOR.wire, GROUP_VECTOR.groupKey)
  assert(groupDecrypted === GROUP_VECTOR.plaintext, 'Group decrypt from wire format')

  // 7. Group key unwrap roundtrip
  assert(isGroupKeyMessage(GKEY_VECTOR.wire), 'GKey wire detected as gkey message')

  const unwrappedKey = tryDecryptGroupKey(GKEY_VECTOR.wire, ALICE.publicKey, BOB.secretKey)
  assert(unwrappedKey === GKEY_VECTOR.wrappedGroupKey, 'Group key unwrap roundtrip')

  // 8. Fingerprints
  assert(
    getPublicKeyFingerprint(ALICE.publicKey) === ALICE.fingerprint,
    'Alice fingerprint'
  )
  assert(
    getPublicKeyFingerprint(BOB.publicKey) === BOB.fingerprint,
    'Bob fingerprint'
  )
}

function runLiveRoundtripTests() {
  // 9. Full encrypt→decrypt roundtrip with freshly generated keys
  const sender = generateKeyPair()
  const recipient = generateKeyPair()
  const plaintext = 'roundtrip test ' + Date.now()

  const encrypted = encryptMessage(plaintext, recipient.publicKey, sender.secretKey)
  assert(isDMEncrypted(encrypted), 'Live DM has correct prefix')
  const decrypted = decryptMessage(encrypted, sender.publicKey, recipient.secretKey)
  assert(decrypted === plaintext, 'Live DM roundtrip')

  // 10. Group roundtrip with fresh key
  const gk = generateGroupKey()
  const gEncrypted = encryptGroupMessage(plaintext, gk)
  assert(isGroupEncrypted(gEncrypted), 'Live group has correct prefix')
  const gDecrypted = decryptGroupMessage(gEncrypted, gk)
  assert(gDecrypted === plaintext, 'Live group roundtrip')

  // 11. Group key distribution roundtrip
  const wrapped = encryptGroupKeyForMember(gk, recipient.publicKey, sender.secretKey)
  assert(isGroupKeyMessage(wrapped), 'Live gkey has correct prefix')
  const unwrapped = tryDecryptGroupKey(wrapped, sender.publicKey, recipient.secretKey)
  assert(unwrapped === gk, 'Live group key distribution roundtrip')

  // 12. Wrong key fails gracefully
  const wrongKey = generateKeyPair()
  const wrongDecrypt = decryptMessage(encrypted, wrongKey.publicKey, recipient.secretKey)
  assert(wrongDecrypt === null, 'Wrong sender key returns null')
}

export function runSelfTest() {
  const results = []

  const suites = [
    { name: 'Known-answer tests', fn: runKnownAnswerTests },
    { name: 'Protocol format tests', fn: runProtocolTests },
    { name: 'Live roundtrip tests', fn: runLiveRoundtripTests },
  ]

  let allPassed = true
  for (const suite of suites) {
    try {
      suite.fn()
      results.push({ name: suite.name, passed: true })
    } catch (err) {
      results.push({ name: suite.name, passed: false, error: err.message })
      allPassed = false
    }
  }

  return { passed: allPassed, results }
}

// Allow running directly: node crypto/selftest.js
const isCLI = typeof process !== 'undefined' &&
  typeof process.argv !== 'undefined' &&
  process.argv[1]?.endsWith('selftest.js')

if (isCLI) {
  const { passed, results } = runSelfTest()
  for (const r of results) {
    console.log(r.passed ? `  PASS  ${r.name}` : `  FAIL  ${r.name}: ${r.error}`)
  }
  console.log(passed ? '\nAll crypto self-tests passed.' : '\nSELF-TEST FAILURE — crypto may be compromised.')
  process.exit(passed ? 0 : 1)
}
