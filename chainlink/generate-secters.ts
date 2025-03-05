// Refer to: https://github.com/smartcontractkit/smart-contract-examples/blob/main/functions-examples/examples/7-use-secrets-url/gen-offchain-secrets.js

import * as dotenv from 'dotenv';
dotenv.config({ path: `${__dirname}/../.env` })

import fs from 'fs/promises'
import path from 'path'
import { SecretsManager } from '@chainlink/functions-toolkit'
import * as ethers from 'ethers-v5'

const generateOffchainSecretsFile = async () => {
  // Network based vars (Base Sepolia)
  const routerAddress = '0xf9B8fc078197181C841c296C876945aaa425B278'
  const donId = 'fun-base-sepolia-1'

  const secrets = { dataApiKey: process.env.DATA_API_KEY || '' }

  // Signer is deployer of consumer contract, will be called later on with file encrypted url
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey)
    throw new Error('private key not provided - check your environment variables');

  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl)
    throw new Error(`rpcUrl not provided  - check your environment variables`);

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl)

  const wallet = new ethers.Wallet(privateKey)
  const signer = wallet.connect(provider)

  const secretsManager = new SecretsManager({
    signer: signer,
    functionsRouterAddress: routerAddress,
    donId: donId,
  })
  await secretsManager.initialize()

  const encryptedSecretsObj = await secretsManager.encryptSecrets(
    secrets
  )

  const rootDir = process.cwd();
  const secretsFilePath = path.resolve(rootDir, 'offchain-secrets.json')
  try {
    await fs.writeFile(secretsFilePath, JSON.stringify(encryptedSecretsObj), 'utf-8')
    console.log("Encrypted secrets object written to " + secretsFilePath);
  } catch (error) {
    console.error(error)
  }
}

generateOffchainSecretsFile().catch((e) => {
  console.error(e)
  process.exit(1)
})
