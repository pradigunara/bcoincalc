const axios = require('axios')
const _ = require('lodash')

const BSCSCAN_API_KEY = process.env.BSCSCAN_API_KEY
const BASE_URL = 'https://api.bscscan.com/api'
const BCOIN_ADDRESS = '0x00e1656e45f18ec6747F5a8496Fd39B50b38396D'

exports.getBlockNumByTime = async (timestamp) => {
  const params = {
    module: 'block',
    action: 'getblocknobytime',
    timestamp,
    closest: 'before',
    apikey: BSCSCAN_API_KEY
  }

  return axios
    .get(BASE_URL, { params })
    .then(_.property('data.result'))
}

exports.getBcoinTransferEvents = async (address, startBlock) => {
  const params = {
    module: 'account',
    action: 'tokentx',
    contractaddress: BCOIN_ADDRESS,
    address,
    startblock: startBlock,
    endblock: 999999999,
    sort: 'asc',
    apiKey: BSCSCAN_API_KEY
  }

  return axios
    .get(BASE_URL, { params })
    .then(_.property('data.result'))
}