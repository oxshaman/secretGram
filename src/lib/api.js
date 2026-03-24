/*
 * TRUST ZONE 3 — Untrusted transport.
 *
 * This module sends and receives data over HTTP. It handles only
 * ciphertext and metadata — it NEVER imports or accesses crypto keys.
 * An auditor does NOT need to trust this module for message secrecy.
 */

const BASE = '/api'

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

export const api = {
  getAuthState: () => request('/auth/state'),
  submitPhone: (phone) =>
    request('/auth/phone', { method: 'POST', body: JSON.stringify({ phone }) }),
  submitCode: (code) =>
    request('/auth/code', { method: 'POST', body: JSON.stringify({ code }) }),
  submitPassword: (password) =>
    request('/auth/password', { method: 'POST', body: JSON.stringify({ password }) }),
  getMe: () => request('/me'),
  getChats: (limit = 30) => request(`/chats?limit=${limit}`),
  getChat: (id) => request(`/chats/${id}`),
  getMessages: (chatId, fromMessageId = 0, limit = 50) =>
    request(`/chats/${chatId}/messages?from_message_id=${fromMessageId}&limit=${limit}`),
  sendMessage: (chatId, text) =>
    request(`/chats/${chatId}/messages`, { method: 'POST', body: JSON.stringify({ text }) }),
  getUser: (id) => request(`/user/${id}`),
  getChatMembers: (chatId) => request(`/chats/${chatId}/members`),
}
