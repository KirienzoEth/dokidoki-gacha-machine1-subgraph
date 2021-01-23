import { BigInt } from '@graphprotocol/graph-ts'
import {
  GameMachine,
  RunMachineSuccessfully as RunMachineSuccessfullyEvent,
  AddCardMinted as AddCardMintedEvent,
  AddCardNotMinted as AddCardNotMintedEvent,
  LockMachine as LockMachineEvent,
} from "../generated/GameMachine3/GameMachine"
import { Machine, MachineDayData } from "../generated/schema"
import { initializeMachine, createMachineRun, initializeMachineDayData, handleAddNftToMachine, changeMachineLockStatus, getProfitAddress, getMachineProfitAddress, getProfitAddressDayData, getMachineProfitAddressDayData } from './helpers'

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

  if (gameMachine.createdDate === null) {
    gameMachine.createdDate = event.block.timestamp
  }

  let machineDayData = MachineDayData.load(dayId.toString() + '-' + gameMachine.id)
  if (machineDayData === null) {
    machineDayData = initializeMachineDayData(dayId, gameMachine.id)
  }

  machineDayData.playTimes = machineDayData.playTimes.plus(event.params.times)
  gameMachine.playTimes = gameMachine.playTimes.plus(event.params.times)

  let transactionHash = event.transaction.hash.toHex()

  let run = createMachineRun(event.logIndex, transactionHash, event.address.toHexString(), event.params.times, event.block.timestamp, machineBinding.playOncePrice(), event.params.account.toHexString())

  let toArtist = machineBinding.forArtistRate().times(machineBinding.playOncePrice()).div(BigInt.fromI32(100)).times(event.params.times)
  let toBuyback = machineBinding.forDokiBuybackRate().times(machineBinding.playOncePrice()).div(BigInt.fromI32(100)).times(event.params.times)
  // TODO add to tracking, consider as profit address but not as profit amount ? Tag profit address as "dev" ?
  let toDev = machineBinding.playOncePrice().minus(toArtist).minus(toBuyback).times(event.params.times)

  let profitAddress = getProfitAddress(machineBinding.artistAccount(), 'eth')
  profitAddress.profitAmount = profitAddress.profitAmount.plus(toArtist)

  let machineProfitAddress = getMachineProfitAddress(gameMachine.id, profitAddress.id)
  machineProfitAddress.profitAmount = machineProfitAddress.profitAmount.plus(toArtist)

  let profitAddressDayData = getProfitAddressDayData(dayId, profitAddress.id)
  profitAddressDayData.profitAmount = profitAddressDayData.profitAmount.plus(toArtist)

  let machineProfitAddressDayData = getMachineProfitAddressDayData(dayId, machineProfitAddress.id)
  machineProfitAddressDayData.profitAmount = machineProfitAddressDayData.profitAmount.plus(toArtist)

  machineDayData.amountSpent = machineDayData.amountSpent.plus(machineBinding.playOncePrice().times(event.params.times))
  machineDayData.profitAmount = machineDayData.profitAmount.plus(toArtist)
  machineDayData.buybackAmount = machineDayData.buybackAmount.plus(toBuyback)
  gameMachine.amountSpent = gameMachine.amountSpent.plus(machineBinding.playOncePrice().times(event.params.times))
  gameMachine.profitAmount = gameMachine.profitAmount.plus(toArtist)
  gameMachine.buybackAmount = gameMachine.buybackAmount.plus(toBuyback)

  profitAddress.save()
  machineProfitAddress.save()
  profitAddressDayData.save()
  machineProfitAddressDayData.save()
  gameMachine.save()
  machineDayData.save()
  run.save()
}

export function handleAddCardMinted(event: AddCardMintedEvent): void {
  let machineBinding = GameMachine.bind(event.address)
  let gameMachine = Machine.load(event.address.toHexString())
  if (gameMachine === null) {
    gameMachine = initializeMachine(event.address.toHexString(), event.block.timestamp, machineBinding.playOncePrice(), 'eth')
  }

  let momijiTokenAddress = machineBinding.momijiToken()
  handleAddNftToMachine(event.params.cardId, gameMachine as Machine, momijiTokenAddress, event.params.amount)
  gameMachine.save()
}

export function handleAddCardNotMinted(event: AddCardNotMintedEvent): void {
  let machineBinding = GameMachine.bind(event.address)
  let gameMachine = Machine.load(event.address.toHexString())
  if (gameMachine === null) {
    gameMachine = initializeMachine(event.address.toHexString(), machineBinding.machineId(), machineBinding.playOncePrice(), 'eth')
  }

  let momijiTokenAddress = machineBinding.momijiToken()
  handleAddNftToMachine(event.params.cardId, gameMachine as Machine, momijiTokenAddress, event.params.amount)
  gameMachine.save()
}

export function handleLockMachine(event: LockMachineEvent): void {
  changeMachineLockStatus(event.address.toHexString(), event.params.locked)
}