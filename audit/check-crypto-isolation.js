#!/usr/bin/env node

/*
 * Verifies that crypto/protocol.js is properly isolated:
 *   1. Only imports from ./vendor/
 *   2. Contains no network, DOM, or storage APIs
 *   3. server/ does not import from crypto/
 *
 * Exit code 0 = all checks pass, 1 = isolation violation found.
 */

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
    .replace(/\/\/.*$/gm, '')            // line comments
}

let failures = 0

function fail(msg) {
  console.error(`  FAIL  ${msg}`)
  failures++
}

function pass(msg) {
  console.log(`  PASS  ${msg}`)
}

// --- Check 1: protocol.js imports only from ./vendor/ ---

const protocolSrcRaw = readFileSync(join(ROOT, 'crypto/protocol.js'), 'utf-8')
const protocolSrc = stripComments(protocolSrcRaw)
const importRegex = /import\s+.*from\s+['"]([^'"]+)['"]/g
let match
const imports = []
while ((match = importRegex.exec(protocolSrc)) !== null) {
  imports.push(match[1])
}

const badImports = imports.filter(i => !i.startsWith('./vendor/'))
if (badImports.length > 0) {
  fail(`protocol.js imports from outside vendor/: ${badImports.join(', ')}`)
} else {
  pass(`protocol.js imports only from ./vendor/ (${imports.length} imports)`)
}

// --- Check 2: No forbidden APIs in protocol.js ---

const forbiddenPatterns = [
  { pattern: /\bfetch\s*\(/, name: 'fetch()' },
  { pattern: /\bXMLHttpRequest\b/, name: 'XMLHttpRequest' },
  { pattern: /\bWebSocket\b/, name: 'WebSocket' },
  { pattern: /\bdocument\b/, name: 'document' },
  { pattern: /\bwindow\b/, name: 'window' },
  { pattern: /\blocalStorage\b/, name: 'localStorage' },
  { pattern: /\bsessionStorage\b/, name: 'sessionStorage' },
  { pattern: /\bindexedDB\b/, name: 'indexedDB' },
  { pattern: /\bnavigator\b/, name: 'navigator' },
  { pattern: /\bnew\s+Worker\b/, name: 'Worker' },
  { pattern: /\beval\s*\(/, name: 'eval()' },
  { pattern: /\bFunction\s*\(/, name: 'Function()' },
]

const protocolLinesRaw = protocolSrcRaw.split('\n')
let hasForbidden = false
let inBlockComment = false
for (let i = 0; i < protocolLinesRaw.length; i++) {
  const line = protocolLinesRaw[i]
  if (line.includes('/*')) inBlockComment = true
  if (line.includes('*/')) { inBlockComment = false; continue }
  if (inBlockComment || line.trimStart().startsWith('*') || line.trimStart().startsWith('//')) continue
  for (const { pattern, name } of forbiddenPatterns) {
    if (pattern.test(line)) {
      fail(`protocol.js line ${i + 1} uses forbidden API: ${name}`)
      hasForbidden = true
    }
  }
}
if (!hasForbidden) {
  pass('protocol.js contains no forbidden APIs (network, DOM, storage, eval)')
}

// --- Check 3: server/ does not import from crypto/ ---

const serverDir = join(ROOT, 'server')
let serverFiles
try {
  serverFiles = readdirSync(serverDir).filter(f => f.endsWith('.js'))
} catch {
  serverFiles = []
}

let serverClean = true
for (const file of serverFiles) {
  const src = readFileSync(join(serverDir, file), 'utf-8')
  if (/import\s+.*from\s+['"].*crypto\//.test(src) ||
      /require\s*\(\s*['"].*crypto\//.test(src)) {
    fail(`server/${file} imports from crypto/ — server must not access crypto module`)
    serverClean = false
  }
}
if (serverClean) {
  pass(`server/ does not import from crypto/ (${serverFiles.length} files checked)`)
}

// --- Check 4: vectors.js and selftest.js only import from crypto/ ---

for (const file of ['crypto/vectors.js', 'crypto/selftest.js']) {
  const src = readFileSync(join(ROOT, file), 'utf-8')
  const codeOnly = stripComments(src)
  const fileImports = []
  const re = /import\s+.*from\s+['"]([^'"]+)['"]/g
  let m
  while ((m = re.exec(codeOnly)) !== null) {
    fileImports.push(m[1])
  }
  const external = fileImports.filter(i => !i.startsWith('./'))
  if (external.length > 0) {
    fail(`${file} imports from outside crypto/: ${external.join(', ')}`)
  } else {
    pass(`${file} imports only from within crypto/`)
  }
}

// --- Summary ---

console.log('')
if (failures > 0) {
  console.error(`Crypto isolation check: ${failures} violation(s) found.`)
  process.exit(1)
} else {
  console.log('Crypto isolation check: all clear.')
  process.exit(0)
}
