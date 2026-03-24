# p2chat Security & Threat Model

This document honestly describes what p2chat protects, what it does not
protect, and what assumptions it makes. Read this before trusting p2chat
with sensitive communications.

## What We Protect

**Message content** is encrypted in the browser using NaCl (Curve25519 +
XSalsa20-Poly1305) before it reaches the local server or Telegram's network.
Neither the p2chat server nor Telegram can read message plaintext.

**Encryption keys never leave the browser.** Secret keys and group keys are
stored in IndexedDB on the user's device. The server code (`server/`) never
imports the crypto module and has no access to key material.

**Integrity and authentication.** NaCl box provides authenticated encryption:
a tampered ciphertext will fail to decrypt. DM messages are authenticated
to the sender's Curve25519 key.

## What We Do NOT Protect

**Metadata.** Telegram sees who sends messages to whom, when, how often,
and the approximate size of each message. p2chat does not hide any of this.

**Message ordering and delivery.** Telegram controls whether messages are
delivered, in what order, and can silently drop messages. p2chat has no
mechanism to detect missing messages.

**Device security.** If an attacker has access to your browser or device
(malware, physical access, browser extensions), they can read your keys
and plaintext. p2chat cannot protect you in this scenario.

**Server authentication.** The local server (`localhost:3001`) has no access
control. Any process on the same machine can use the REST API and WebSocket.
In production, the server should only be accessible on localhost.

## Known Limitations

### No forward secrecy

p2chat uses static Curve25519 keypairs. If a secret key is compromised,
all past messages encrypted with that key can be decrypted. Signal-style
ratcheting (Double Ratchet) would mitigate this but is not implemented.

### No key rotation mechanism

There is no automatic key rotation. Users must manually regenerate keys
and re-exchange them with contacts. Group keys can be manually rotated
via the UI.

### Manual key exchange is vulnerable to MITM

Public keys are exchanged by copy/paste. If the channel used for exchange
is compromised (e.g., an attacker intercepts and substitutes keys), the
attacker can perform a man-in-the-middle attack. Users should verify
fingerprints via a separate trusted channel (in person, voice call, etc.).

### Group key compromise is total

If a group symmetric key is compromised, all past messages encrypted with
that key can be read. There is no per-message key derivation within a group.
Rotating the group key protects future messages only.

### No protection against traffic analysis

Message sizes, timing patterns, and communication graphs are visible to
Telegram and any network observer. p2chat does not pad messages or add
cover traffic.

## Trust Assumptions

1. **Your browser is not compromised.** JavaScript executing in the browser
   has access to all key material and plaintext.
2. **Your device is not compromised.** IndexedDB is accessible to any code
   running in the same browser origin.
3. **The system CSPRNG is sound.** `crypto.getRandomValues` provides
   cryptographically secure random bytes.
4. **NaCl primitives are secure.** Curve25519, XSalsa20, and Poly1305 are
   well-studied and widely trusted.
5. **Telegram delivers messages.** p2chat relies on Telegram for transport
   and cannot detect silent message suppression.

## Trust Zones

The codebase is organized into explicit trust zones:

| Zone | Directory | Trust Level | Description |
|------|-----------|-------------|-------------|
| 1 | `crypto/` | **Critical** | All cryptographic operations. Pure functions, no I/O. Audit this first. |
| 2 | `src/lib/keyStore.js` | **Security-adjacent** | Stores keys in IndexedDB. No network access. |
| 3 | `src/lib/api.js`, `src/lib/ws.js`, `server/` | **Untrusted** | Network transport. Handles only ciphertext. |
| 3 | `src/components/` | **Untrusted** | UI layer. Calls crypto functions but does not implement crypto. |

## Reporting Vulnerabilities

If you find a security issue, please report it responsibly. Open an issue
or contact the maintainers directly.
