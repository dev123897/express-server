const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const apicache = require('apicache')

require('./tools/config')

const app = express()
const db = require('./tools/db')

; (async function() {
  await db.connect() // exit server if unable to connect to db
})();

app.use(bodyParser.json()) // enable parsing of application/json
app.use(bodyParser.urlencoded({ extended: true })) // enable parsing of application/x-www-form-urlencoded
app.use(cors())

if (process.env.CACHE_ENABLED) {
  const cache = apicache.middleware
  const cacheDuration = '1 day'

  app.get('*', cache(cacheDuration), (req, res, next) => {
    console.log('caching GET', req.originalUrl, 'for', cacheDuration)
    next()
  })

  console.log('cache enabled')
}
else console.log('--- caching disabled ---')

// Checks if the specified content types are acceptable, based on the request’s Accept HTTP header
app.use((req, res, next) => {
  if (req.accepts('application/json')) next()
  else res.sendStatus(406)
})

app.use('/v1', require('./routes'))

// Error-handling middleware
app.use((err, req, res, next) => { // eslint-disable-line
  console.error(err.stack)
  res.sendStatus(500)
})

app.listen(process.env.PORT, console.log(`Example app listening on port ${process.env.PORT}`))

// Create socket server
require('./tools/socket.js').startServer(process.env.SOCKET_PORT)
