const { Server } = require("socket.io")

const io = new Server({
  connectionStateRecovery: {/* this enables state restore for a reconnected socket */},
  cors: {
    // must allow cors requests for the front end since they are not served on the same port
    origin: `${process.env.FRONT_END_ADDR}:${process.env.FRONT_END_PORT}`
  }
})

function startServer(port) {
  io.listen(port)

  console.log('socket server listening at port:', port)

  // need to wait for server to start before connecting listeners to the engine
  io.engine.on("connection_error", console.error)
}

function close() {
  // Must wrap in promise since sockets do not always disconnect immediately
  return new Promise(resolve => io.close(() => resolve('socket.io disconnected successfully')))
}

module.exports = {
  io,
  startServer,
  close
}
