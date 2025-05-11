# Deployment

Run `deploy:base-sepolia:<n>` scripts one by one, filling the address values in config file after each deployment.

Register PLAYER_API_ADAPTER_ADDRESS as consumer in https://functions.chain.link/base-sepolia/<subscription-id>

Update CHAINLINK_SUBSCRIPTION_CONSUMER_ADDRESS with PLAYER_API_ADAPTER_ADDRESS in backend secrets

`npm run exec -- --network baseSepolia ./deploy/base-sepolia/set-rewards-distribution-fee-adapter.ts` to allow api adapter to update rewards distribution state
