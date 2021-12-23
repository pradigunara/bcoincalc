// can be found with csv export
// https://bscscan.com/token/0x00e1656e45f18ec6747f5a8496fd39b50b38396d#balances
const _ = require('lodash')
const fs = require('fs')

const parseRow = row => {
  const [address, balance] = row.split(',').map(el => _.trim(el, '"'))

  return { address, balance: Number(balance) || 0 }
}

const parseCsv = csv => _.chain(csv)
  .split('\n') // split to row
  .drop(1) // drop header
  .compact()
  .map(parseRow)
  .sortBy('balance')
  .reverse() // sort from biggest balance
  .slice(0, 100) // get top 100
  .map('address')
  .value()

const file = fs.readFileSync('./holders.csv')

module.exports = parseCsv(file)