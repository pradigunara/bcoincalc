require('dotenv').config()

const _ = require('lodash')
const moment = require('moment')
const bscscan = require('./bscscan')

const Discord = require('discord.js');
const listener = new Discord.Client();

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN
const DISCORD_BOT_PREFIX = process.env.DISCORD_BOT_PREFIX

let cachedPMTimestamp = null
let cachedPMBlockNum = null

const rewardAddresses = new Set([
  '0x52d2124ab6e2aa2886751c8424bc61a51f1e2ed4',
  '0xfa6bce1c7bbe759567f3b0211f3f695d340a888c',
  '0x52b76d0937132144ec27a591ed0876b77926778d',
  '0x966d1cca4cf740ed9056bab436f1e40ecd759aef',
  '0x1349197f97af359d096f76782ccb0055676da077',
  '0x0b6b208e51bcca1eaa2dc58c5d46f684f683d4b3',
  '0x09f0f48d12cdc1436ea83df269b42d726fe4c001',
  '0xb1284db011c41bc5296c49f99c41f13ba1f36a48',
])

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