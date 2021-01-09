import { BigInt } from '@graphprotocol/graph-ts'
import {
  GameMachine,
  RunMachineSuccessfully as RunMachineSuccessfullyEvent,
} from "../generated/GameMachine/GameMachine"
import { MachineRun, Player, Transfer, Transaction, Machine, ProfitAddress, MachineProfitAddress, ProfitAddressDayData, MachineProfitAddressDayData, MachineDayData } from "../generated/schema"

const BURN_ADDRESS = "0x0000000000000000000000000000000000000000"

export function handleRunMachineSuccessfully(
  event: RunMachineSuccessfullyEvent
): void {
  let machineBinding = GameMachine.bind(event.address)
  let gameMachine = Machine.load(event.address.toHexString())
  let dayId = event.block.timestamp.toI32() / 86400
  dayId = dayId * 86400
  if (gameMachine == null) {
    gameMachine = new Machine(event.address.toHexString())
    gameMachine.createdDate = event.block.timestamp
    gameMachine.playOncePrice = machineBinding.playOncePrice()
    gameMachine.currencyToken = machineBinding.currencyToken().toHexString()
    gameMachine.burnAmount = BigInt.fromI32(0)
  }

  gameMachine.title = machineBinding.machineTitle()
  gameMachine.description = machineBinding.machineDescription()

  let machineDayData = MachineDayData.load(dayId.toString() + '-' + gameMachine.id)
  if (machineDayData == null) {
    machineDayData = new MachineDayData(dayId.toString() + '-' + gameMachine.id)
    machineDayData.machine = gameMachine.id
    machineDayData.date = BigInt.fromI32(dayId)
    machineDayData.amountSpent = BigInt.fromI32(0)
    machineDayData.playTimes = BigInt.fromI32(0)
    machineDayData.profitAmount = BigInt.fromI32(0)
    machineDayData.burnAmount = BigInt.fromI32(0)
  }
  machineDayData.playTimes = machineDayData.playTimes.plus(event.params.times)

  if (machineBinding.playOncePrice() != gameMachine.playOncePrice) {
    gameMachine.playOncePrice = machineBinding.playOncePrice()
  }

  let playerAddress = event.params.account.toHex()
  let transactionHash = event.transaction.hash.toHex()

  // transaction should never be null, it would mean no token transfer before the run
  let player = Player.load(playerAddress)
  if (player == null) {
    player = new Player(playerAddress)
    player.save()
  }

  let runId = transactionHash + '-' + event.logIndex.toString()
  let run = new MachineRun(runId)
  run.machine = event.address.toHex()
  run.playTimes = event.params.times.toI32()
  run.player = player.id
  run.transaction = transactionHash
  run.timestamp = event.block.timestamp
  run.priceOnRun = machineBinding.playOncePrice()

  let transferAmountLimit = run.priceOnRun.times(event.params.times)
  
  // Order by log index descending
  let transaction = Transaction.load(transactionHash)
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
        machineDayData.amountSpent = machineDayData.amountSpent.plus(transfer.value)
        transfer.machineRun = runId
        transfer.save()

        if (transfer.to.toHexString() != event.address.toHexString()) {
          let profitAddress = ProfitAddress.load(transfer.to.toHexString() + '-' + machineBinding.currencyToken().toHexString())
          if (profitAddress == null) {
            profitAddress = new ProfitAddress(transfer.to.toHexString() + '-' + machineBinding.currencyToken().toHexString())
            profitAddress.token = machineBinding.currencyToken().toHexString()
            profitAddress.walletAddress = transfer.to
            profitAddress.profitAmount = BigInt.fromI32(0)
          }
          profitAddress.profitAmount = profitAddress.profitAmount.plus(transfer.value)
    
          let machineProfitAddress = MachineProfitAddress.load(gameMachine.id + '-' + profitAddress.id)
          if (machineProfitAddress == null) {
            machineProfitAddress = new MachineProfitAddress(gameMachine.id + '-' + profitAddress.id)
            machineProfitAddress.machine = gameMachine.id
            machineProfitAddress.profitAddress = profitAddress.id
          }

          let profitAddressDayData = ProfitAddressDayData.load(dayId.toString() + '-' + profitAddress.id)
          if (profitAddressDayData == null) {
            profitAddressDayData = new ProfitAddressDayData(dayId.toString() + '-' + profitAddress.id)
            profitAddressDayData.profitAddress = profitAddress.id
            profitAddressDayData.date = BigInt.fromI32(dayId)
            profitAddressDayData.profitAmount = BigInt.fromI32(0)
          }
          profitAddressDayData.profitAmount = profitAddressDayData.profitAmount.plus(transfer.value)
    
          let machineProfitAddressDayData = MachineProfitAddressDayData.load(dayId.toString() + '-' + machineProfitAddress.id)
          if (machineProfitAddressDayData == null) {
            machineProfitAddressDayData = new MachineProfitAddressDayData(dayId.toString() + '-' + machineProfitAddress.id)
            machineProfitAddressDayData.machineProfitAddress = machineProfitAddress.id
            machineProfitAddressDayData.date = BigInt.fromI32(dayId)
            machineProfitAddressDayData.profitAmount = BigInt.fromI32(0)
          }
          machineProfitAddressDayData.profitAmount = machineProfitAddressDayData.profitAmount.plus(transfer.value)

          machineDayData.profitAmount = machineDayData.profitAmount.plus(transfer.value)
    
          profitAddress.save()
          machineProfitAddress.save()
          profitAddressDayData.save()
          machineProfitAddressDayData.save()
        }
      }
    }

    if (transfer.to.toHexString() == event.address.toHexString()) {
      gameMachine.burnAmount = gameMachine.burnAmount.plus(transfer.value)
      machineDayData.burnAmount = machineDayData.burnAmount.plus(transfer.value)
    }
  }

  gameMachine.save()
  machineDayData.save()
  run.save();
}