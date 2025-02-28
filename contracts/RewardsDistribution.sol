// similar to SunTokenDistribution
// but with a 'claim' mechanism, rather than sending funds directly to shareholders
// whoever calls 'payoutDividend' (or whatever the name is) function locks funds into the contract, available for a given users
//  in theory everyone could call it, as long as he sends funds to the contract, we'll do it from the fees wallet (manually or automatically via lambda)
//  funds === platform token
// token balances kept in contract state
// player stats matter only if the user owns a given player at the time of distribution (like stock dividends)
// claim action will transfer the assigned share of funds from contract to tx caller wallet
// backdoor for pulling funds from distribution contract (nasty) in case of emergencies / errors when sendnig funds to the account
//    how? as this will break the internal balance book?
//    pull from everyone's balance?

// TODO:
// we need to know when the last distribution happened, so we ignore player stats past that point in time?
// what is data is not available at the time of calling, but later is added / edited?
