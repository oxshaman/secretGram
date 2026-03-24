# p2chat Audit Guide

Step-by-step checklist for verifying p2chat's security claims.
Designed for security auditors and skeptical users alike.

## Prerequisites

- Node.js 18+
- A terminal with `shasum` (macOS) or `sha256sum` (Linux)
- About 15 minutes

## Step 1: Verify the Crypto Core

Read `crypto/protocol.js`. This is the **only file** that performs
cryptographic operations. It should be approximately 180 lines.

Verify these properties:

- [ ] Only imports from `./vendor/tweetnacl.cjs` and `./vendor/tweetnacl-util.cjs`
- [ ] Contains no `fetch`, `XMLHttpRequest`, `WebSocket`, or any network calls
- [ ] Contains no `document`, `window`, `localStorage`, or DOM access
- [ ] Contains no `indexedDB` or storage calls
- [ ] Every exported function is pure: takes inputs, returns output, no side effects
- [ ] Uses only standard NaCl primitives: `nacl.box`, `nacl.secretbox`, `nacl.box.open`, `nacl.secretbox.open`, `nacl.hash`, `nacl.randomBytes`

## Step 2: Verify Vendored Dependencies

The crypto module vendors two files from npm. Verify they match the official releases:

```bash
# Check hashes of vendored files
shasum -a 256 crypto/vendor/tweetnacl.cjs crypto/vendor/tweetnacl-util.cjs

# Compare against CHECKSUMS.sha256
cat crypto/vendor/CHECKSUMS.sha256
```

To independently verify against npm:

```bash
npm pack tweetnacl@1.0.3
tar xf tweetnacl-1.0.3.tgz
shasum -a 256 package/nacl-fast.js
# Must match: 6bcd37a3b20dce913f82d4b23e4e2b661058b4b953df8a3f8c45d56ac4f72447

npm pack tweetnacl-util@0.15.1
tar xf tweetnacl-util-0.15.1.tgz
shasum -a 256 package/nacl-util.js
# Must match: 8ee674c29b10a199dd30913cfdac498ac405e6f94d8cbd5853b8b0b7b54b206c

rm -rf package tweetnacl-*.tgz
```

## Step 3: Verify Crypto Isolation

Run the automated isolation checker:

```bash
node audit/check-crypto-isolation.js
```

Or manually verify:

```bash
# crypto/ must not import from src/, server/, or node_modules (except vendor/)
grep -rn "import.*from" crypto/protocol.js
# Should only show imports from './vendor/'

# server/ must not import from crypto/
grep -rn "import.*crypto" server/
# Should return nothing
```

## Step 4: Run the Self-Test

The self-test runs known-answer vectors against the crypto functions:

```bash
node crypto/selftest.js
```

Expected output:

```
  PASS  Known-answer tests
  PASS  Protocol format tests
  PASS  Live roundtrip tests

All crypto self-tests passed.
```

If any test fails, the crypto module may have been tampered with or
the vendored NaCl library may be corrupted.

## Step 5: Verify the Server Cannot Access Keys

```bash
# The server directory must not import from the crypto module
grep -rn "import.*crypto\|require.*crypto" server/
# The only result should be Node's built-in 'crypto' in tdlib.js (if any)

# The server must not import from keyStore
grep -rn "keyStore\|indexedDB" server/
# Should return nothing
```

## Step 6: Verify the Build

Check that building from source produces deterministic output:

```bash
bash audit/check-build.sh
```

## Step 7: Inspect Content Security Policy

After starting the server, verify CSP headers prevent external script injection:

```bash
curl -sI http://localhost:3001 | grep -i content-security-policy
# Should show: script-src 'self'; object-src 'none'; base-uri 'self'
```

## Step 8: Network Inspection

The most direct verification: watch what goes over the wire.

1. Start the app: `npm run dev`
2. Open browser DevTools → Network tab
3. Exchange keys with a contact and enable encryption
4. Send a message
5. Find the POST request to `/api/chats/{id}/messages`
6. The request body `text` field should start with `p2p:v1:` — pure ciphertext
7. No plaintext should appear anywhere in the request

## Step 9: Verify the Protocol Specification

Read `crypto/README.md` and confirm that `crypto/protocol.js` implements
exactly what the specification describes:

- [ ] DM wire format matches `p2p:v1:<nonce>:<ciphertext>`
- [ ] Group wire format matches `p2p:v1:g:<nonce>:<ciphertext>`
- [ ] Group key wire format matches `p2p:v1:gkey:<nonce>:<wrapped_key>`
- [ ] Fingerprints use SHA-512 of raw public key bytes, first 8 bytes as hex
- [ ] Nonces are 24 random bytes from `nacl.randomBytes`

## Automated Audit

Run all automated checks at once:

```bash
npm test
```

This runs the self-test and isolation checks as part of CI.
