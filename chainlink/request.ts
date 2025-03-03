// Refer to: https://github.com/smartcontractkit/smart-contract-examples/blob/main/functions-examples/examples/2-call-api/request.js

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
const consumerAddress = process.env.CHAINLINK_SUBSCRIPTION_CONSUMER_ADDRESS || ''
const subscriptionId = process.env.CHAINLINK_SUBSCRIPTION_ID || ''

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

  // load signer
  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)
  const wallet = new ethers.Wallet(privateKey)
  const signer = wallet.connect(provider)

  // load chainlink fn source
  const source = (await fs.readFile(path.resolve(__dirname, 'functions', 'fetch-game-stats.ts'))).toString('utf-8')

  const args = [process.env.DATA_API_KEY || '', fixtureId.toString()]
  const gasLimit = 300_000

  // simulate tx
  // Note: runs script locally in Deno, as if it is being executed in DON
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
    const returnType = ReturnType.string
    const responseBytesHexstring = response.responseBytesHexstring || ''
    if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
      const decodedResponse = decodeResult(
        responseBytesHexstring,
        returnType
      )
      console.log(`✅ Decoded response to ${returnType}: `, decodedResponse)
    }
  }

  // estimate request costs
  const subscriptionManager = new SubscriptionManager({
    signer: signer,
    linkTokenAddress: linkTokenAddress,
    functionsRouterAddress: routerAddress,
  })
  await subscriptionManager.initialize()

  const gasPriceWei = await signer.getGasPrice() // get gasPrice in wei
  const estimatedCostInJuels =
    await subscriptionManager.estimateFunctionsRequestCost({
      donId: donId, // ID of the DON to which the Functions request will be sent
      subscriptionId: subscriptionId, // Subscription ID
      callbackGasLimit: gasLimit, // Total gas used by the consumer contract's callback
      gasPriceWei: BigInt(gasPriceWei.toString()), // Gas price in gWei
    })

  console.log(
    `Fulfillment cost estimated to ${ethers.utils.formatEther(
      estimatedCostInJuels
    )} LINK`
  )

  // request through call to adapter contract
  // Note: DON will execute fn script 3 times in order to come up with response consensus
  const playerApiAdapter = new ethers.Contract(
    consumerAddress,
    playerApiAdapterConfig.abi,
    signer
  )

  const transaction = await playerApiAdapter.sendRequest(
    source, // code to be executed in DON Deno
    '0x', // user hosted secrets - encryptedSecretsUrls - empty in this example
    0, // don hosted secrets - slot ID - empty in this example
    0, // don hosted secrets - version - empty in this example
    args,
    [], // bytesArgs - arguments can be encoded off-chain to bytes.
    subscriptionId,
    gasLimit,
    ethers.utils.formatBytes32String(donId) // jobId is bytes32 representation of donId
  )

  console.log(
    `\n✅ Functions request sent! Transaction hash ${transaction.hash}. Waiting for a response...`
  )
  console.log(
    `See your request in the explorer ${explorerUrl}/tx/${transaction.hash}`
  )

  const responseListener = new ResponseListener({
    provider: provider,
    functionsRouterAddress: routerAddress,
  });
  (async () => {
    try {
      const response: any = await new Promise((resolve, reject) => {
        responseListener
          .listenForResponseFromTransaction(transaction.hash)
          .then((response) => {
            resolve(response)
          })
          .catch((error) => {
            reject(error)
          })
      })

      const fulfillmentCode = response.fulfillmentCode

      if (fulfillmentCode === FulfillmentCode.FULFILLED) {
        console.log(
          `\n✅ Request ${
            response.requestId
          } successfully fulfilled. Cost is ${ethers.utils.formatEther(
            response.totalCostInJuels
          )} LINK.Complete reponse: `,
          response
        )
      } else if (fulfillmentCode === FulfillmentCode.USER_CALLBACK_ERROR) {
        console.log(
          `\n⚠️ Request ${
            response.requestId
          } fulfilled. However, the consumer contract callback failed. Cost is ${ethers.utils.formatEther(
            response.totalCostInJuels
          )} LINK.Complete reponse: `,
          response
        )
      } else {
        console.log(
          `\n❌ Request ${
            response.requestId
          } not fulfilled. Code: ${fulfillmentCode}. Cost is ${ethers.utils.formatEther(
            response.totalCostInJuels
          )} LINK.Complete reponse: `,
          response
        )
      }

      const errorString = response.errorString
      if (errorString) {
        console.log(`\n❌ Error during the execution: `, errorString)
      } else {
        const responseBytesHexstring = response.responseBytesHexstring
        const returnType = ReturnType.string
        if (ethers.utils.arrayify(responseBytesHexstring).length > 0) {
          const decodedResponse = decodeResult(
            response.responseBytesHexstring,
            returnType
          )
          console.log(
            `\n✅ Decoded response to ${returnType}: `,
            decodedResponse
          );
        }
      }
    } catch (error) {
      console.error("Error listening for response:", error);
    }
  })()
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
