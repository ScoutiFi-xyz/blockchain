import { ethers } from 'hardhat'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

const run = async () => {
  // feeWallet must be deployer as it will collect the fees
  const [_, feeWallet] = await ethers.getSigners()

  await deployV4Hooks(feeWallet)
}

const deployV4Hooks = async (deployer: HardhatEthersSigner) => {
  throw new Error('Hook addresses are deterministic as they have permissions encoded in the address. You need solidity to compute salt and use create2 for hook deployment.')
}

run()
