// From v4-sdk
/**
 * The default factory enabled fee amounts, denominated in hundredths of bips.
 */
export enum FeeAmount {
  LOWEST = 100,
  LOW = 500,
  MEDIUM = 3000,
  HIGH = 10000,
}

/**
 * The default factory tick spacings by fee amount.
 */
export const TICK_SPACINGS: { [amount in FeeAmount]: number } = {
  [FeeAmount.LOWEST]: 1,
  [FeeAmount.LOW]: 10,
  [FeeAmount.MEDIUM]: 60,
  [FeeAmount.HIGH]: 200,
}

// full range tick boundaries (before adjusting for tick spacing)
export const FULL_RANGE_TICK_LOWER = -887272
export const FULL_RANGE_TICK_UPPER = 887272

// only commands we actually use in script
// check sdk files, or contracts for more
// universal router docs are not up to date
export const universalRouterCommands = {
  V4_SWAP: 0x10
}
export const v4RouterActions = {
  SWAP_EXACT_IN_SINGLE: 0x06,
  SETTLE_ALL: 0x0c,
  TAKE_ALL: 0x0f
}
export const positionManagerActions = {
  MINT_POSITION: 0x02,
  SETTLE_PAIR: 0x0d
}
