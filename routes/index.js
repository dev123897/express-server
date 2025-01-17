const path = require('path')

const thisFile = path.basename(__filename)

module.exports = require('fs')
  .readdirSync(__dirname)
  .filter(file => file !== thisFile && path.extname(file) !== '.swp')
  .map(file => require(path.join(__dirname, file)))
