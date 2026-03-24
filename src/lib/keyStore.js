const DB_NAME = 'p2chat-keys'
const DB_VERSION = 2
const STORE_KEYPAIR = 'myKeypair'
const STORE_CONTACTS = 'contactKeys'
const STORE_GROUP_KEYS = 'groupKeys'

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = (event) => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_KEYPAIR)) {
        db.createObjectStore(STORE_KEYPAIR, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_CONTACTS)) {
        db.createObjectStore(STORE_CONTACTS, { keyPath: 'userId' })
      }
      if (!db.objectStoreNames.contains(STORE_GROUP_KEYS)) {
        db.createObjectStore(STORE_GROUP_KEYS, { keyPath: 'chatId' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txGet(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.get(key)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txPut(db, storeName, value) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.put(value)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

function txGetAll(db, storeName) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly')
    const store = tx.objectStore(storeName)
    const req = store.getAll()
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txDelete(db, storeName, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite')
    const store = tx.objectStore(storeName)
    const req = store.delete(key)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

// --- Personal keypair ---

export async function getMyKeyPair() {
  const db = await openDB()
  return txGet(db, STORE_KEYPAIR, 'current')
}

export async function saveMyKeyPair(publicKey, secretKey) {
  const db = await openDB()
  return txPut(db, STORE_KEYPAIR, { id: 'current', publicKey, secretKey })
}

// --- Contact public keys ---

export async function getContactKeys() {
  const db = await openDB()
  return txGetAll(db, STORE_CONTACTS)
}

export async function getContactKey(userId) {
  const db = await openDB()
  return txGet(db, STORE_CONTACTS, String(userId))
}

export async function saveContactKey(userId, publicKey, displayName = '') {
  const db = await openDB()
  return txPut(db, STORE_CONTACTS, {
    userId: String(userId),
    publicKey,
    displayName,
  })
}

export async function removeContactKey(userId) {
  const db = await openDB()
  return txDelete(db, STORE_CONTACTS, String(userId))
}

// --- Group symmetric keys ---

export async function getGroupKeys() {
  const db = await openDB()
  return txGetAll(db, STORE_GROUP_KEYS)
}

export async function getGroupKey(chatId) {
  const db = await openDB()
  return txGet(db, STORE_GROUP_KEYS, String(chatId))
}

export async function saveGroupKey(chatId, groupKey) {
  const db = await openDB()
  return txPut(db, STORE_GROUP_KEYS, {
    chatId: String(chatId),
    groupKey,
    createdAt: Date.now(),
  })
}

export async function removeGroupKey(chatId) {
  const db = await openDB()
  return txDelete(db, STORE_GROUP_KEYS, String(chatId))
}
