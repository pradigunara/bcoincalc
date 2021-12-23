const axios = require('axios')
const _ = require('lodash')
const moment = require('moment')

const COVALENT_API_KEY = process.env.COVALENT_API_KEY
const BASE_URL = 'https://api.covalenthq.com'
const BCOIN_ADDRESS = '0x00e1656e45f18ec6747F5a8496Fd39B50b38396D'

exports.getBcoinHistoricalPrice = async (startTimestamp, endTimestamp) => {
    const formatTS = (ts) => moment.unix(ts).format('YYYY-MM-DD')

    const params = {
        'quote-currency': 'USD',
        format: 'JSON',
        from: formatTS(startTimestamp),
        to: formatTS(endTimestamp),
        'page-number': 1,
        'page-size': 1000,
        key: COVALENT_API_KEY
    }

    const url = `${BASE_URL}/v1/pricing/historical_by_addresses_v2/56/USD/${BCOIN_ADDRESS}/`

    return axios
        .get(url, { params })
        .then(_.property('data.data[0].prices'))
}