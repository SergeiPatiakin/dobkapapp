const path = require('path')
const cwd = process.cwd()


function inDev() {
  return process.env.NODE_ENV == 'development'
}

module.exports = {
  inDev,
}
