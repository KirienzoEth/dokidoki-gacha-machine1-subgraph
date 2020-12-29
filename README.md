Subgraph for the first machine of the DokiDoki DeGacha project

Visit https://degacha.com/introduce/gacha for more information

# What does this track ?

## Player

An entity Player has an ID (its public address) and all the runs from any machine included in this subgraph.

## Transaction

A transaction that contained one or multiple "Transfer" events from the tracked tokens.
It also contains all the machine runs that were done in this transaction.

## Transfer

A simple transfer event between 2 addresses from the tracked tokens. If `runMachine` is not `null` that means the value of the transaction was spent while running a machine.

## MachineRun

A machine run ties all of this together. You have the player, the transfers for this run, how many run the player paid for, the price at the time of the run, the timestamp etc.

Note: When running a machine, the balance of the machine is burned, this is not counted in the transfers of the `runMachine` entity, as they are from the previous player. Thus, the tokens sent to the machine's address in this transaction are the ones that will be burned the next time someone run the machine.

# Development
## How to deploy

  1. Clone this repo

  2. graph deploy --access-token YOUR_ACCESS_TOKEN \
    --debug \
    --node https://api.thegraph.com/deploy/ \
    --ipfs https://api.thegraph.com/ipfs/ \
    kirienzoeth/dokidoki-degacha-machine1

Subgraph endpoints:
Queries (HTTP):     http://localhost:8000/subgraphs/name/KirienzoEth/DokidokiDeGachaMachine1
Subscriptions (WS): http://localhost:8001/subgraphs/name/KirienzoEth/DokidokiDeGachaMachine1

Make sure to visit the documentation on https://thegraph.com/docs/ for further information.