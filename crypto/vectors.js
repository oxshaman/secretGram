/*
 * Known-answer test vectors for the p2chat cryptographic protocol.
 *
 * These vectors use deterministic keys and nonces so the expected
 * ciphertext is reproducible. Any change to the underlying NaCl
 * implementation or protocol encoding will cause a mismatch.
 *
 * Key derivation:
 *   Alice SK = bytes [1..32]   → nacl.box.keyPair.fromSecretKey
 *   Bob   SK = bytes [33..64]  → nacl.box.keyPair.fromSecretKey
 */

export const ALICE = {
  secretKey: 'AQIDBAUGBwgJCgsMDQ4PEBESExQVFhcYGRobHB0eHyA=',
  publicKey: 'B6N8vBQgk8i3VdwbEOhstCY3StFqqFPtC9/AsrhtHHw=',
  fingerprint: 'BD:EC:E9:E2:BE:20:DB:8C',
}

export const BOB = {
  secretKey: 'ISIjJCUmJygpKissLS4vMDEyMzQ1Njc4OTo7PD0+P0A=',
  publicKey: 'WGmv9FBUlzLLqu1eXfmzCm2jHLDldCutWtShp2jxpns=',
  fingerprint: '63:20:4F:1C:47:0F:A8:61',
}

export const DM_VECTOR = {
  name: 'DM encrypt (nacl.box)',
  nonce: 'ZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7',
  plaintext: 'Hello, Bob!',
  ciphertext: 'c5Dd84JcTdvDGpRdkbYbgrZQw54C9YGC7Cbn',
  wire: 'p2p:v1:ZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7:c5Dd84JcTdvDGpRdkbYbgrZQw54C9YGC7Cbn',
}

export const GROUP_VECTOR = {
  name: 'Group encrypt (nacl.secretbox)',
  groupKey: 'yMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5uc=',
  nonce: 'lpeYmZqbnJ2en6ChoqOkpaanqKmqq6yt',
  plaintext: 'Hello, group!',
  ciphertext: 'm6Aa7wA1GG44h90+IqG2dP+ipi3LfxuWUxbabyY=',
  wire: 'p2p:v1:g:lpeYmZqbnJ2en6ChoqOkpaanqKmqq6yt:m6Aa7wA1GG44h90+IqG2dP+ipi3LfxuWUxbabyY=',
}

export const GKEY_VECTOR = {
  name: 'Group key distribution (nacl.box wrapping secretbox key)',
  nonce: 'MjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJ',
  wrappedGroupKey: 'yMnKy8zNzs/Q0dLT1NXW19jZ2tvc3d7f4OHi4+Tl5uc=',
  ciphertext: 'n6qdPpl24vLYl4Er0chCumMruSGnvrPQQY52zgQHVLOztBxVp3whRIRSCzx2oc0d',
  wire: 'p2p:v1:gkey:MjM0NTY3ODk6Ozw9Pj9AQUJDREVGR0hJ:n6qdPpl24vLYl4Er0chCumMruSGnvrPQQY52zgQHVLOztBxVp3whRIRSCzx2oc0d',
}
