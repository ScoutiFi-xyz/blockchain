import * as dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../.env` });

import fs from 'fs/promises'
import path from 'path'
import * as ethers from 'ethers-v5'
import {
  SubscriptionManager,
  simulateScript,
  ResponseListener,
  ReturnType,
  decodeResult,
  FulfillmentCode,
} from '@chainlink/functions-toolkit'
import playerApiAdapterConfig from '../artifacts/contracts/PlayerApiAdapter.sol/PlayerApiAdapter.json'

// Network based vars (Base Sepolia)
const routerAddress = '0xf9B8fc078197181C841c296C876945aaa425B278'
const linkTokenAddress = '0x779877A7B0D9E8603169DdbD7836e478b4624789'
const donId = 'fun-base-sepolia-1'
// const donIdOnChain = 0x66756e2d626173652d7365706f6c69612d310000000000000000000000000000
const explorerUrl = 'https://sepolia.basescan.org'

// Subscription based vars
const consumerAddress = process.env.CHAINLINK_SUBSCRIPTION_CONSUMER_ADDRESS
const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID

const run = async () => {
  const fixtureId = 1035038

  // load env
  const privateKey = process.env.PRIVATE_KEY
  if (!privateKey)
    throw new Error(
      "PRIVATE_KEY not provided - check your environment variables"
    )

  const rpcUrl = process.env.RPC_URL
  if (!rpcUrl)
    throw new Error(`RPC_URL not provided  - check your environment variables`)

  // load chainlink fn source
  const source = (await fs.readFile(path.resolve(__dirname, 'functions', 'fetch-game-stats.ts'))).toString('utf-8')

  const args = [process.env.DATA_API_KEY || '', fixtureId.toString()]
  const gasLimit = 300_000

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(privateKey)
  const signer = wallet.connect(provider)

  // simulate tx
  console.log('Start simulation...')

  const response = await simulateScript({
    source: source,
    args: args,
    bytesArgs: [], // bytesArgs - arguments can be encoded off-chain to bytes.
    secrets: {}, // no secrets in this example
  })

  console.log('Simulation result', response)
  const errorString = response.errorString
  if (errorString) {
    console.log(`❌ Error during simulation: `, errorString)
  } else {
    const returnType = ReturnType.string;
    const responseBytesHexstring = response.responseBytesHexstring || '';
    if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
      const decodedResponse = decodeResult(
        responseBytesHexstring,
        returnType
      );
      console.log(`✅ Decoded response to ${returnType}: `, decodedResponse);
    }
  }

  // estimate request costs
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
})
