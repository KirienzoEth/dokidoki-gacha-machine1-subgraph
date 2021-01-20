import { BigInt } from '@graphprotocol/graph-ts'
import {
  GameMachine,
  RunMachineSuccessfully as RunMachineSuccessfullyEvent,
  AddCardMinted as AddCardMintedEvent,
  AddCardNotMinted as AddCardNotMintedEvent,
  LockMachine as LockMachineEvent,
} from "../generated/GameMachine1/GameMachine"
import { Transfer, Transaction, Machine, MachineDayData } from "../generated/schema"
import { initializeMachine, createMachineRun, initializeMachineDayData, handleAddNftToMachine, changeMachineLockStatus, getProfitAddress, getMachineProfitAddress, getProfitAddressDayData, getMachineProfitAddressDayData } from './helpers'

const BURN_ADDRESS = "0x0000000000000000000000000000000000000000"

export function handleRunMachineSuccessfully(
  event: RunMachineSuccessfullyEvent
): void {
  let machineBinding = GameMachine.bind(event.address)
  let gameMachine = Machine.load(event.address.toHexString())
  let dayIdTruncated = event.block.timestamp.toI32() / 86400
  let dayId = BigInt.fromI32(dayIdTruncated * 86400)

  gameMachine.title = machineBinding.machineTitle()
  gameMachine.description = machineBinding.machineDescription()
  gameMachine.playOncePrice = machineBinding.playOncePrice()

  let machineDayData = MachineDayData.load(dayId.toString() + '-' + gameMachine.id)
  if (machineDayData === null) {
    machineDayData = initializeMachineDayData(dayId, gameMachine.id)
    machineDayData.burnAmount = BigInt.fromI32(0)
  }

  machineDayData.playTimes = machineDayData.playTimes.plus(event.params.times)
  gameMachine.playTimes = gameMachine.playTimes.plus(event.params.times)

  let transactionHash = event.transaction.hash.toHex()

  let run = createMachineRun(event.logIndex, transactionHash, event.address.toHexString(), event.params.times, event.block.timestamp, machineBinding.playOncePrice(), event.params.account.toHexString())
  let transferAmountLimit = run.priceOnRun.times(event.params.times)
  
  // Transaction must exists as Azuki transfers are done before this event is triggered
  let transaction = Transaction.load(transactionHash)
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
        machineDayData.amountSpent = machineDayData.amountSpent.plus(transfer.value)
        transfer.machineRun = run.id
        transfer.save()

        if (transfer.to.toHexString() != event.address.toHexString()) {
          let profitAddress = getProfitAddress(transfer.to, machineBinding.currencyToken().toHexString())
          profitAddress.profitAmount = profitAddress.profitAmount.plus(transfer.value)
    
          let machineProfitAddress = getMachineProfitAddress(gameMachine.id, profitAddress.id)
          machineProfitAddress.profitAmount = machineProfitAddress.profitAmount.plus(transfer.value)

          let profitAddressDayData = getProfitAddressDayData(dayId, profitAddress.id)
          profitAddressDayData.profitAmount = profitAddressDayData.profitAmount.plus(transfer.value)
    
          let machineProfitAddressDayData = getMachineProfitAddressDayData(dayId, machineProfitAddress.id)
          machineProfitAddressDayData.profitAmount = machineProfitAddressDayData.profitAmount.plus(transfer.value)

          machineDayData.profitAmount = machineDayData.profitAmount.plus(transfer.value)
          gameMachine.amountSpent = gameMachine.amountSpent.plus(transfer.value)
          gameMachine.profitAmount = gameMachine.profitAmount.plus(transfer.value)
    
          profitAddress.save()
          machineProfitAddress.save()
          profitAddressDayData.save()
          machineProfitAddressDayData.save()
        }
      }
    }

    if (transfer.to.toHexString() == event.address.toHexString()) {
      gameMachine.burnAmount = gameMachine.burnAmount.plus(transfer.value)
      gameMachine.amountSpent = gameMachine.amountSpent.plus(transfer.value)
      machineDayData.burnAmount = machineDayData.burnAmount.plus(transfer.value)
    }
  }

  gameMachine.save()
  machineDayData.save()
  run.save();
}

export function handleAddCardMinted(event: AddCardMintedEvent): void {
  let machineBinding = GameMachine.bind(event.address)
  let gameMachine = Machine.load(event.address.toHexString())
  if (gameMachine === null) {
    gameMachine = initializeMachine(event.address.toHexString(), event.block.timestamp, machineBinding.playOncePrice(), machineBinding.currencyToken().toHexString())
  }

  let momijiTokenAddress = machineBinding.momijiToken()
  handleAddNftToMachine(event.params.cardId, gameMachine as Machine, momijiTokenAddress, event.params.amount)
  gameMachine.save()
}

export function handleAddCardNotMinted(event: AddCardNotMintedEvent): void {
  let machineBinding = GameMachine.bind(event.address)
  let gameMachine = Machine.load(event.address.toHexString())
  if (gameMachine === null) {
    gameMachine = initializeMachine(event.address.toHexString(), event.block.timestamp, machineBinding.playOncePrice(), machineBinding.currencyToken().toHexString())
  }

  let momijiTokenAddress = machineBinding.momijiToken()
  handleAddNftToMachine(event.params.cardId, gameMachine as Machine, momijiTokenAddress, event.params.amount)
  gameMachine.save()
}

export function handleLockMachine(event: LockMachineEvent): void {
  changeMachineLockStatus(event.address.toHexString(), event.params.locked)
}