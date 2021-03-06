require('dotenv').config()

const _ = require('lodash')
const moment = require('moment')
const bscscan = require('./bscscan')
const covalent = require('./covalent')
const topAddress = require('./topaddress')
const helper = require('./helper')

const Discord = require('discord.js');
const listener = new Discord.Client();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_BOT_PREFIX = process.env.DISCORD_BOT_PREFIX

let cachedPMTimestamp = null
let cachedPMBlockNum = null
let cachedPriceByDate = null

const rewardAddresses = new Set(topAddress)
rewardAddresses.delete('0xd76026a78a2a9af2f9f57fe6337eed26bfc26aed') // pcs busd
rewardAddresses.delete('0x2eebe0c34da9ba65521e98cbaa7d97496d05f489') // pcs wbnb

const CHANNEL_WHITELISTS = new Set([
  'pesugihan-bijital', 'general'
])

function getPreviousMonthTimestamp() {
  return moment().subtract(30, 'days').utcOffset(7).startOf('day').unix()
}

async function getPreviousMonthBlockStart() {
  const timestamp = getPreviousMonthTimestamp()

  if (timestamp == cachedPMTimestamp) {
    return cachedPMBlockNum
  }

  const blockNum = await bscscan.getBlockNumByTime(timestamp)
  const prices = await covalent.getBcoinHistoricalPrice(timestamp, moment().unix())
  const priceByDate = prices.reduce((acc, p) => ({ ...acc, [p.date]: p.price }), {})

  cachedPMTimestamp = timestamp
  cachedPMBlockNum = blockNum
  cachedPriceByDate = priceByDate

  return blockNum
}

async function getBcoinWithdrawals(walletAddress) {
  const address = _.toLower(walletAddress)

  const result = await bscscan
    .getBcoinTransferEvents(address, await getPreviousMonthBlockStart())

  const withdrawals = _.chain(result)
    .filter({ to: address })
    .filter(res => rewardAddresses.has(res.from))
    .value()

  return withdrawals
}

function getNumberAmount(rawValue) {
  return Number(BigInt(rawValue) / BigInt(10 ** 16)) / 100
}

function totalAmountFromWithdrawals(withdrawals) {
  const totalAmount2Decimal = _.reduce(withdrawals, (acc, wd) => {
    const val = BigInt(wd.value) / BigInt(10 ** 16)

    return acc + val
  }, BigInt(0))

  return Number(totalAmount2Decimal) / 100
}

// take first withdrawal in past 30 days as starting point
function calculateAverageEarning(last30dWithdrawals) {
  const first = _.head(last30dWithdrawals)
  const last = _.last(last30dWithdrawals)

  const firstAmount = helper.rawValueToDecimal(first.value)
  const totalAmount = _.chain(last30dWithdrawals)
    .map(wd => helper.rawValueToDecimal(wd.value))
    .sum()
    .value()

  const dayDiff = moment
    .unix(last.timeStamp)
    .diff(moment.unix(first.timeStamp), 'days')

  return (totalAmount - firstAmount) / dayDiff
}

function calculateTotalEarning(withdrawals) {
  return _.chain(withdrawals)
    .map(wd => {
      const txDate = moment.unix(wd.timeStamp).format('YYYY-MM-DD')
      const price = cachedPriceByDate[txDate]
      const withdrawAmount = helper.rawValueToDecimal(wd.value)

      return price * withdrawAmount
    })
    .sum()
    .value()
}

async function getAddressResult(walletAddress) {
  const withdrawals = await getBcoinWithdrawals(walletAddress)

  const total = totalAmountFromWithdrawals(withdrawals)
  const average = calculateAverageEarning(withdrawals)
  const earning = calculateTotalEarning(withdrawals)

  return { total, average, earning }
}

async function handleUserCommand(msg) {
  if (!_.startsWith(msg.content, DISCORD_BOT_PREFIX)) return

  const address = msg.content.split(' ')[1]

  const result = await getAddressResult(address)

  msg.reply(`
  Your BCOIN average for last 30 days is ${result.average.toFixed(2)} BCOIN per day, with a total of ${result.total.toFixed(2)} BCOIN.
  You earned approx. $${result.earning.toFixed(2)} assuming same day selling.
  `)
}

function main() {
  listener.on('ready', () => {
    console.log(`Logged in as ${listener.user.tag}!`);
  });

  listener.on('message', async msg => {
    if (!CHANNEL_WHITELISTS.has(msg.channel.name)) return;

    console.log({
      content: msg.content,
      username: msg.author.username,
      timestamp: msg.createdTimestamp,
      embeds: JSON.stringify(msg.embeds, null, 2)
    })

    handleUserCommand(msg);
  });

  listener.login(DISCORD_BOT_TOKEN);
}

main()