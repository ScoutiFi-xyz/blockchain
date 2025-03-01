// Refer to https://github.com/smartcontractkit/functions-hardhat-starter-kit#javascript-code

const leagueId = 39;
const seasonId = 2023;

const xRapidApiHost = 'v3.football.api-sports.io'
const xRapidApiKey = args[0]; // TODO: this should not be sent onchain, use chainlink secrets endpoint

// const fixtureId = 1035038;
const fixtureId = args[1];

const url = `https://v3.football.api-sports.io/fixtures/players`;
console.log(`HTTP GET Request to ${url}?fixture=${fixtureId}`);

const cryptoCompareRequest = Functions.makeHttpRequest({
  url: url,
  headers: {
    'Content-Type': 'application/json',
    'x-rapidapi-host': xRapidApiHost,
    'x-rapidapi-key': xRapidApiKey
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
const response = data.response;

const teamNames = response.map((entry: any) => entry.team.name).join(', ');
console.log(`Teams in fixture ${teamNames}`);

return Functions.encodeString(teamNames);
