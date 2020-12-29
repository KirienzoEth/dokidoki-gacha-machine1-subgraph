import { BigInt, Bytes } from '@graphprotocol/graph-ts'
import {
  GameMachine,
  RunMachineSuccessfully as RunMachineSuccessfullyEvent,
} from "../generated/GameMachine/GameMachine"
import { MachineRun, Player, Transfer, Transaction } from "../generated/schema"

const BURN_ADDRESS = "0x0000000000000000000000000000000000000000"

export function handleRunMachineSuccessfully(
  event: RunMachineSuccessfullyEvent
): void {
  let gameMachine = GameMachine.bind(event.address)
  let playerAddress = event.params.account.toHex()
  let transactionHash = event.transaction.hash.toHex()

  // transaction should never be null, it would mean no token transfer before the run
  let transaction = Transaction.load(transactionHash)
  let player = Player.load(playerAddress)
  if (player == null) {
    player = new Player(playerAddress)
    player.save()
  }

  let runId = transactionHash + '-' + event.logIndex.toString()
  let run = new MachineRun(runId)
  run.machineAddress = event.address
  run.playTimes = event.params.times
  run.player = player.id
  run.transaction = transaction.id
  run.timestamp = transaction.timestamp
  run.priceOnRun = gameMachine.playOncePrice()

  let transferAmountLimit = run.priceOnRun.times(run.playTimes)
  
  // Order by log index descending
  transaction.transfers.reverse()

  // The only transfers that matter to the run are the ones the player made to play the machine
  // RunMachineSuccessfullyEvent is always called after everything is done, so we can assign it the transfers that precedes it, in the limit of what the player should have spent.
  // We ignore burning tokens as this is the burning of the tokens of the previous player
  let transfersAmountForRun = BigInt.fromI32(0)
  let transfers = transaction.transfers
  for(let i = 0, k = transfers.length; i < k; i++) {
    let transfer = Transfer.load(transfers[i])
    
    if (transfer.to.toHexString() != BURN_ADDRESS) {
      transfersAmountForRun = transfersAmountForRun.plus(transfer.value)

      if (transfer.logIndex < event.logIndex && transfersAmountForRun.le(transferAmountLimit)) {
        transfer.machineRun = runId
        transfer.save()
      }
    }
  }

  run.save();
}