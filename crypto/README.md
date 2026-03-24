# p2chat Cryptographic Protocol Specification

This document is the single source of truth for p2chat's encryption protocol.
An auditor should be able to read this document and then verify that
`protocol.js` faithfully implements it — without reading any other file.

## Overview

p2chat adds a client-side encryption layer on top of Telegram. Messages are
encrypted in the browser before being sent as ordinary Telegram text messages.
The Telegram server (and p2chat's local relay server) only ever sees ciphertext.

## Algorithms

All cryptographic operations use **TweetNaCl** (vendored in `vendor/`):

| Operation            | Primitive                              | NaCl function        |
|----------------------|----------------------------------------|----------------------|
| DM encryption        | Curve25519 + XSalsa20-Poly1305         | `nacl.box`           |
| Group encryption     | XSalsa20-Poly1305                      | `nacl.secretbox`     |
| Group key wrapping   | Curve25519 + XSalsa20-Poly1305         | `nacl.box`           |
| Key fingerprints     | SHA-512                                | `nacl.hash`          |
| Random byte generation | System CSPRNG                        | `nacl.randomBytes`   |

No custom cryptographic constructions are used. Every operation maps directly
to a single NaCl primitive.

## Key Types

### Identity keypair (per user)

- **Algorithm:** Curve25519
- **Secret key:** 32 bytes, stored in browser IndexedDB
- **Public key:** 32 bytes, shared manually between users
- **Encoding:** Base64 when displayed or transmitted
- **Lifetime:** Static until user manually regenerates

### Group symmetric key (per chat)

- **Algorithm:** XSalsa20-Poly1305 (secretbox)
- **Key:** 32 random bytes
- **Distribution:** Wrapped per-member using NaCl box (see below)
- **Lifetime:** Static until manually rotated

## Wire Formats

All encrypted messages are sent as UTF-8 strings with a structured prefix.

### DM message

```
p2p:v1:<nonce_b64>:<ciphertext_b64>
```

- **Prefix:** `p2p:v1:` (7 bytes, literal)
- **Nonce:** 24 random bytes, base64-encoded
- **Separator:** `:` (1 byte)
- **Ciphertext:** `nacl.box(plaintext_bytes, nonce, recipient_pk, sender_sk)`, base64-encoded
- **Decryption:** `nacl.box.open(ciphertext, nonce, sender_pk, recipient_sk)`

### Group message

```
p2p:v1:g:<nonce_b64>:<ciphertext_b64>
```

- **Prefix:** `p2p:v1:g:` (10 bytes, literal)
- **Nonce:** 24 random bytes, base64-encoded
- **Separator:** `:` (1 byte)
- **Ciphertext:** `nacl.secretbox(plaintext_bytes, nonce, group_key)`, base64-encoded
- **Decryption:** `nacl.secretbox.open(ciphertext, nonce, group_key)`

### Group key distribution message

```
p2p:v1:gkey:<nonce_b64>:<wrapped_key_b64>
```

- **Prefix:** `p2p:v1:gkey:` (13 bytes, literal)
- **Nonce:** 24 random bytes, base64-encoded
- **Separator:** `:` (1 byte)
- **Payload:** `nacl.box(group_key_bytes, nonce, recipient_pk, sender_sk)`, base64-encoded
- **Unwrap:** `nacl.box.open(payload, nonce, sender_pk, recipient_sk)` → 32 bytes (the group key)
- **Validation:** Unwrapped result must be exactly 32 bytes

## Message Type Detection

Messages are identified by prefix:

1. Starts with `p2p:v1:gkey:` → group key distribution message
2. Starts with `p2p:v1:g:` → group encrypted message
3. Starts with `p2p:v1:` (and not the above) → DM encrypted message
4. None of the above → plaintext

The order matters: `p2p:v1:g:` is a prefix of `p2p:v1:gkey:`, and `p2p:v1:` is a prefix of both.

## Key Exchange

Public keys are exchanged **manually** between users (copy/paste via any
trusted channel). There is no automated key exchange protocol. Users must
verify fingerprints out-of-band to prevent MITM attacks.

## Key Fingerprints

Fingerprints provide a short, human-verifiable representation of a public key.

1. Decode the base64 public key to raw bytes (32 bytes)
2. Compute SHA-512 of the raw bytes → 64 bytes
3. Take the first 8 bytes
4. Format as uppercase hex pairs separated by colons

Example: `BD:EC:E9:E2:BE:20:DB:8C`

## Nonce Generation

All nonces are generated using `nacl.randomBytes()`, which reads from the
system CSPRNG (`crypto.getRandomValues` in browsers).

**Nonce reuse safety:** XSalsa20 uses 192-bit nonces. With random nonces, the
probability of collision after `n` messages is approximately `n² / 2^193`.
Even at 1 billion messages, the collision probability is ~2^{-133}, which is
negligible.

## What Is NOT Protected

- **Metadata:** Telegram sees who sends messages to whom, when, and the size of each message.
- **Message ordering and delivery:** Telegram controls message delivery and could drop, delay, or reorder messages.
- **Forward secrecy:** Static Curve25519 keys mean compromise of a secret key exposes all past and future messages encrypted with that key.
- **Key authenticity:** Without out-of-band fingerprint verification, a MITM could substitute public keys.
