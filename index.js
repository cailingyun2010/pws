(function() {
  function PersistentWebSocket(url, protocols, WebSocket) {
    if (typeof protocols === 'function') {
      WebSocket = protocols
      protocols = null
    }

    if (!WebSocket)
      WebSocket = typeof window !== 'undefined' && window.WebSocket

    if (!WebSocket)
      throw new Error('Please supply a websocket library to use')

    var connection = null
      , reconnecting = false
      , reconnectTimer = null
      , heartbeatTimer = null
      , binaryType = null

    var api = {
      CONNECTING: WebSocket.CONNECTING,
      OPEN: WebSocket.OPEN,
      CLOSING: WebSocket.CLOSING,
      CLOSED: WebSocket.CLOSED,
      get readyState() { return connection.readyState },
      get protocol() { return connection.protocol },
      get extensions() { return connection.extensions },
      get bufferedAmount() { return connection.bufferedAmount },
      get binaryType() { return connection.binaryType },
      set binaryType(type) {
        binaryType = type
        connection.binaryType = type
      },
      connect: connect,
      url: url,
      pingTimeout: 30 * 1000,
      maxTimeout: 5 * 60 * 1000,
      maxRetries: 0,
      retries: 0,
      nextReconnectDelay: function reconnectTimeout(retries) {
        return Math.min(Math.random() * Math.pow(2, retries) * 1000, api.maxTimeout)
      },
      send: function() {
        connection.send.apply(connection, arguments)
      },
      close: function() {
        connection.close.apply(connection, arguments)
      },
      onopen: noop,
      onclose: noop,
      onerror: noop,
      onmessage: noop
    }

    function noop() {
      // noop
    }

    function connect(url) {
      clearTimeout(reconnectTimer)

      if (url)
        api.url = url

      if (connection)
        clean(connection)

      reconnecting = false
      connection = new WebSocket(api.url, protocols)

      if (binaryType)
        connection.binaryType = binaryType

      connection.onopen = function() {
        heartbeat()
        api.retries = 0
        api.onopen.apply(connection, arguments)
      }

      connection.onclose = function(event) {
        event.reconnectDelay = Math.ceil(reconnect())
        api.onclose.call(connection, event)
      }

      connection.onerror = function() {
        api.onerror.apply(connection, arguments)
      }

      connection.onmessage = function() {
        heartbeat()
        api.onmessage.apply(connection, arguments)
      }
    }

    function heartbeat() {
      if (!api.pingTimeout)
        return

      clearTimeout(heartbeatTimer)
      heartbeatTimer = setTimeout(function() {
        connection.close()
      }, api.pingTimeout)
    }

    function reconnect() {
      if (reconnecting)
        return

      reconnecting = true
      api.retries++

      if (api.maxRetries && api.retries >= api.maxRetries)
        return

      var delay = api.nextReconnectDelay(api.retries)

      reconnectTimer = setTimeout(connect, delay)

      return delay
    }

    function clean(connection) {
      connection.onclose = null
      connection.onopen = null
      connection.onerror = null
      connection.onmessage = null

      connection.close()
    }

    if (url)
      connect()

    return api
  }

  var root = typeof self == 'object' && self.self === self && self ||
             typeof global == 'object' && global.global === global && global ||
             this ||
             {}

  if (typeof exports != 'undefined' && !exports.nodeType) {
    if (typeof module != 'undefined' && !module.nodeType && module.exports) {
      exports = module.exports = PersistentWebSocket
    }
    exports.PersistentWebSocket = PersistentWebSocket
  } else {
    root.PersistentWebSocket = PersistentWebSocket
  }
}());