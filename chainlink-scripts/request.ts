import fs from 'fs'
import path from 'path'
import ethers from 'ethers'
import {
  SubscriptionManager,
  simulateScript,
  ResponseListener,
  ReturnType,
  decodeResult,
  FulfillmentCode,
} from '@chainlink/functions-toolkit'
import playerApiAdapterConfig from '../artifacts/contracts/PlayerApiAdapter.sol/PlayerApiAdapter.json'

// const consumerAddress = "0x8dFf78B7EE3128D00E90611FBeD20A71397064D9"; // REPLACE this with your Functions consumer address
// const subscriptionId = 3; // REPLACE this with your subscription ID

const run = async () => {
  console.log('at least the imports work')

  // Network based variables
  // const routerAddress = "0xb83E47C2bC239B3bf370bc41e1459A34b41238D0";
  // const linkTokenAddress = "0x779877A7B0D9E8603169DdbD7836e478b4624789";
  // const donId = "fun-ethereum-sepolia-1";
  // const explorerUrl = "https://sepolia.etherscan.io";

  // TODO
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
})
