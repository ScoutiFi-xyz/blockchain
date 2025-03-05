// Refer to https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code

const { ethers } = await import('npm:ethers@6.10.0')

const xRapidApiHost = 'v3.football.api-sports.io'

if (!secrets.dataApiKey) {
  throw Error(
    "DATA_API_KEY environment variable not found in secrets"
  )
}

// const fixtureId = 1035038;
const fixtureId = parseInt(args[0], 10);
const playerId = parseInt(args[1], 10);

const url = `https://${xRapidApiHost}/fixtures/players`;
console.log(`HTTP GET Request to ${url}?fixture=${fixtureId}`);

const cryptoCompareRequest = Functions.makeHttpRequest({
  url: url,
  headers: {
    'Content-Type': 'application/json',
    'x-rapidapi-host': xRapidApiHost,
    'x-rapidapi-key': secrets.dataApiKey
  },
  params: {
    fixture: fixtureId,
  },
});

const res = await cryptoCompareRequest;
if (res.error) {
  console.error(res.error);
  throw Error('Request failed');
}

const data = res['data'];
const errors = data.errors;
if (
  (Array.isArray(errors) && errors.length) ||
  (typeof errors === 'object' && Object.keys(errors).length)
) {
  console.error(errors);
  throw Error(`Api error: ${JSON.stringify(errors)}`);
}

// Note: 256 bytes max response (512 hex characters)
// https://docs.chain.link/chainlink-functions/tutorials/abi-decoding
// we need to return per player response, as data for all players in the game cannot fit within this limit
const response = data.response;
const ratings = response.flatMap(
  (side: any) => side.players.map((playerEntry: any) => ({
    externalId: playerEntry.player.id,
    name: playerEntry.player.name,
    rating: playerEntry.statistics[0].games.rating ? Math.round(parseFloat(playerEntry.statistics[0].games.rating) * 100) : 0,
    ratedAt: new Date(side.team.update).valueOf(),
  })
));
console.log(`Ratings in fixture ${JSON.stringify(ratings)}`);

const abiCoder = ethers.AbiCoder.defaultAbiCoder()

const player = ratings.find((player: any) => player.externalId === playerId)
if (!player) {
  console.log(`Player ${playerId} did not play in this fixture`);

  const encoded = abiCoder.encode(
    ['bytes32', 'uint16', 'uint64'],
    [ethers.encodeBytes32String(''), 0, 0]
  )

  return Functions.encodeString(encoded);
}

const encoded = abiCoder.encode(
  ['bytes32', 'uint16', 'uint64'],
  [ethers.encodeBytes32String(player.name), player.rating, player.ratedAt]
)

return Functions.encodeString(encoded);
