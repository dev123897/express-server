const mariadb = require('mariadb')
const socketio = require('./socket')

const pool = mariadb.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  // Do not return ES2020 BigInt for MariaDB BIGINT. This will prevent query
  // https://github.com/mariadb-corporation/mariadb-connector-nodejs/blob/master/documentation/promise-api.md#migrating-from-2x-or-mysqlmysql2-to-3x
  // https://github.com/mariadb-corporation/mariadb-connector-nodejs/blob/master/documentation/promise-api.md#bigintasnumber
  bigIntAsNumber: true,

  // Serialize insertId as Number
  // https://github.com/mariadb-corporation/mariadb-connector-nodejs/blob/master/documentation/promise-api.md#migrating-from-2x-or-mysqlmysql2-to-3x
  insertIdAsNumber: true,
  connectionLimit: 5 // Maximum number of connection in pool
})

let conn

async function connect() {
  try {
    console.log('Connecting to MariaDB...')

    conn = await pool.getConnection()

    console.log('Connection established')
  } catch (e) {
    console.error('ERROR failed to connect to MariaDB:', e.message)
    console.error(e.stack)

    process.exit(1)
  }
}

async function query(sql, params) {
  console.log('[INFO] -- SQL COMMAND --\n' + sql, `[${params?.join() ?? ''}]\n`)

  const rows = params instanceof Array
    ? await conn.query(sql, params)
    : await conn.query(sql)

  return rows
}

function disconnect() {
  conn.release()
  console.log('\nDisconnected from MariaDB')
}

process.on('SIGINT', async function() {
  disconnect()
  console.log(await socketio.close())
})

module.exports = {
  connect,
  query
}
