require('dotenv').config()

const _ = require('lodash')
const moment = require('moment')
const bscscan = require('./bscscan')
const topAddress = require('./topaddress')

const Discord = require('discord.js');
const listener = new Discord.Client();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_BOT_PREFIX = process.env.DISCORD_BOT_PREFIX

let cachedPMTimestamp = null
let cachedPMBlockNum = null

const rewardAddresses = new Set(topAddress)

const CHANNEL_WHITELISTS = new Set([
  'pesugihan-bijital'
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

  cachedPMTimestamp = timestamp
  cachedPMBlockNum = blockNum

  return blockNum
}

async function getTransferInByAddress(walletAddress) {
  const address = _.toLower(walletAddress)

  const result = await bscscan
    .getBcoinTransferEvents(address, await getPreviousMonthBlockStart())

  const withdrawals = _.chain(result)
    .filter({ to: address })
    .filter(res => rewardAddresses.has(res.from))
    .value()

  const totalAmount2Decimal = _.reduce(withdrawals, (acc, wd) => {
    const val = BigInt(wd.value) / BigInt(10 ** 16)

    return acc + val
  }, BigInt(0))

  const totalAmount = Number(totalAmount2Decimal) / 100

  const firstWithdraw = _.head(withdrawals)
  const { timeStamp: firstTimestamp, value: firstAmountRaw } = firstWithdraw
  const firstAmount = Number(BigInt(firstAmountRaw) / BigInt(10 ** 16)) / 100
  const dayDiff = moment().diff(moment.unix(firstTimestamp), 'days')

  return (totalAmount - firstAmount) / dayDiff
}

async function handleUserCommand(msg) {
  if (!_.startsWith(msg.content, DISCORD_BOT_PREFIX)) return

  const address = msg.content.split(' ')[1]

  const result = await getTransferInByAddress(address)
  
  msg.reply(`Your BCOIN average for last 30 days is ${result.toFixed(2)} BCOIN per day`)
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