class WebSocketClient {
  constructor() {
    this.ws = null
    this.listeners = new Map()
    this.reconnectTimer = null
  }

  connect() {
    clearTimeout(this.reconnectTimer)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const url = `${proto}//${window.location.host}/ws`

    this.ws = new WebSocket(url)
    this.ws.onopen = () => this._emit('connected')
    this.ws.onclose = () => {
      this._emit('disconnected')
      this._scheduleReconnect()
    }
    this.ws.onmessage = (event) => {
      try {
        const { type, data } = JSON.parse(event.data)
        this._emit(type, data)
      } catch { /* ignore malformed */ }
    }
  }

  _scheduleReconnect() {
    clearTimeout(this.reconnectTimer)
    this.reconnectTimer = setTimeout(() => this.connect(), 3000)
  }

  on(event, callback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event).add(callback)
    return () => this.listeners.get(event)?.delete(callback)
  }

  _emit(event, data) {
    const cbs = this.listeners.get(event)
    if (cbs) cbs.forEach((cb) => cb(data))
  }

  disconnect() {
    clearTimeout(this.reconnectTimer)
    if (this.ws) {
      this.ws.onclose = null
      this.ws.close()
      this.ws = null
    }
  }
}

export const wsClient = new WebSocketClient()
