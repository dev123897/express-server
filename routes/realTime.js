const express = require('express')
const router = express.Router()
const wrap = require('../tools/wrap')
const { io } = require('../tools/socket')

// Simulate data
const rand = max => Math.floor(Math.random() * max)
const randomCdrData = () => ({
  trunk: rand(100),
  cc: rand(100),
  avgDuration: rand(100),
  longestConcurrentCall: rand(100),
  date: Date.now(),
  longestCall: rand(100),
  dt: rand(100),
  lcr: rand(100)
})

io.on("connection", (socket) => {
  console.log('new socket connection:', socket.id)

  socket.on('refresh_cdrs', () => socket.emit('data', [randomCdrData(), randomCdrData(), randomCdrData()]))

  socket.on('disconnect', reason => {
    console.log('socket', socket.id, 'disconnected successfully.', reason)
  })

  socket.on("error", (err) => {
    console.error(err, 'asdf')
    // if (err && err.message === "unauthorized event") socket.disconnect()
  })
})

router.get('/cdrs', wrap(async (req, res, next) => { // eslint-disable-line
  res.status(202).json({
    links: {
      rel: 'self',
      href: '/cdrs',
      action: 'GET',
      types: ['text/plain']
    }
  })
}))

module.exports = router
