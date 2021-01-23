
import { Address, BigInt, Bytes } from '@graphprotocol/graph-ts'
import { Machine, MachineDayData, MachineRun, Player, Nft, MachineNft, Collection, ProfitAddress, MachineProfitAddress, ProfitAddressDayData, MachineProfitAddressDayData } from "../generated/schema"
import {
  Collection as CollectionBinding,
} from "../generated/templates/Collection/Collection"
import {
  Collection as CollectionTemplate,
} from "../generated/templates"

export function initializeMachineDayData(
  dayId: BigInt,
  gameMachineId: string,
): MachineDayData {
  let machineDayData = new MachineDayData(dayId.toString() + '-' + gameMachineId)
  machineDayData.machine = gameMachineId
  machineDayData.date = dayId
  machineDayData.amountSpent = BigInt.fromI32(0)
  machineDayData.playTimes = BigInt.fromI32(0)
  machineDayData.profitAmount = BigInt.fromI32(0)
  machineDayData.save()

  return machineDayData
}

export function initializeMachine(
  machineAddress: string,
  machineIndexId: BigInt,
  playOncePrice: BigInt,
  currencyTokenAddress: string
): Machine {
  let gameMachine = new Machine(machineAddress)
  gameMachine.indexId = machineIndexId
  gameMachine.playOncePrice = playOncePrice
  gameMachine.currencyToken = currencyTokenAddress
  gameMachine.playTimes = BigInt.fromI32(0)
  gameMachine.amountSpent = BigInt.fromI32(0)
  gameMachine.profitAmount = BigInt.fromI32(0)
  gameMachine.locked = true

  return gameMachine
}

export function createMachineRun(
  logIndex: BigInt,
  transactionHash: string,
  machineAddress: string,
  playTimes: BigInt,
  timestamp: BigInt,
  playOncePrice: BigInt,
  playerAddress: string
): MachineRun {
  let player = Player.load(playerAddress)
  if (player === null) {
    player = new Player(playerAddress)
    player.save()
  }

  let run = new MachineRun(transactionHash + '-' + logIndex.toString())
  run.machine = machineAddress
  run.playTimes = playTimes
  run.player = playerAddress
  run.transaction = transactionHash
  run.timestamp = timestamp
  run.priceOnRun = playOncePrice

  return run
}

export function handleAddNftToMachine(
  nftId: BigInt,
  gameMachine: Machine,
  collectionAddress: Address,
  addedAmount: BigInt
): void {
  let collectionBinding = CollectionBinding.bind(collectionAddress)

  let collection = Collection.load(collectionAddress.toHexString())
  if (collection === null) {
    collection = new Collection(collectionAddress.toHexString()) as Collection
  
    // Create the tracked contract based on the template to track machine minting
    CollectionTemplate.create(collectionAddress)
    collection.name = collectionBinding.name()
    collection.save()
  }

  let nft = Nft.load(collectionAddress.toHexString() + '-' + nftId.toString())
  if (nft === null) {
    nft = new Nft(collectionAddress.toHexString() + '-' + nftId.toString())
    nft.collection = collection.id
    nft.maxAmount = collectionBinding.tokenMaxQuantityWithId(nftId)
    nft.uri = collectionBinding.uri(nftId)
    nft.save()
  }

  let machineNft = MachineNft.load(gameMachine.id + '-' + nft.id)
  if (machineNft === null) {
    machineNft = new MachineNft(gameMachine.id + '-' + nft.id)
    machineNft.machine = gameMachine.id
    machineNft.nft = nft.id
    machineNft.maxAmount = BigInt.fromI32(0)
    machineNft.currentAmount = BigInt.fromI32(0)
  }

  machineNft.maxAmount = machineNft.maxAmount.plus(addedAmount)
  machineNft.currentAmount = machineNft.currentAmount.plus(addedAmount)
  machineNft.save()
}

export function changeMachineLockStatus(
  machinAddress: string,
  isLocked: boolean
): void {
  let gameMachine = Machine.load(machinAddress)
  // if game machine doesn't exist, that means, there is no cards in it, so we don't care for it
  if (gameMachine === null) {
    return;
  }

  gameMachine.locked = isLocked
  gameMachine.save()
}

export function getProfitAddress(
  walletAddress: Bytes, 
  currencyAddress: string
): ProfitAddress {
  let profitAddress = ProfitAddress.load(walletAddress.toHexString() + '-' + currencyAddress)
  if (profitAddress === null) {
    profitAddress = new ProfitAddress(walletAddress.toHexString() + '-' + currencyAddress)
    profitAddress.token = currencyAddress
    profitAddress.walletAddress = walletAddress
    profitAddress.profitAmount = BigInt.fromI32(0)
  }

  return profitAddress as ProfitAddress
}

export function getMachineProfitAddress(
  machineId: string,
  profitAddressId: string
): MachineProfitAddress {
  let machineProfitAddress = MachineProfitAddress.load(machineId + '-' + profitAddressId)
  if (machineProfitAddress === null) {
    machineProfitAddress = new MachineProfitAddress(machineId + '-' + profitAddressId)
    machineProfitAddress.machine = machineId
    machineProfitAddress.profitAddress = profitAddressId
    machineProfitAddress.profitAmount = BigInt.fromI32(0)
  }

  return machineProfitAddress as MachineProfitAddress
}

export function getProfitAddressDayData(
  dayId: BigInt,
  profitAddressId: string
): ProfitAddressDayData {
  let profitAddressDayData = ProfitAddressDayData.load(dayId.toString() + '-' + profitAddressId)
  if (profitAddressDayData === null) {
    profitAddressDayData = new ProfitAddressDayData(dayId.toString() + '-' + profitAddressId)
    profitAddressDayData.profitAddress = profitAddressId
    profitAddressDayData.date = dayId
    profitAddressDayData.profitAmount = BigInt.fromI32(0)
  }

  return profitAddressDayData as ProfitAddressDayData
}

export function getMachineProfitAddressDayData(
  dayId: BigInt,
  machineProfitAddressId: string
): MachineProfitAddressDayData {
  let machineProfitAddressDayData = MachineProfitAddressDayData.load(dayId.toString() + '-' + machineProfitAddressId)
  if (machineProfitAddressDayData === null) {
    machineProfitAddressDayData = new MachineProfitAddressDayData(dayId.toString() + '-' + machineProfitAddressId)
    machineProfitAddressDayData.machineProfitAddress = machineProfitAddressId
    machineProfitAddressDayData.date = dayId
    machineProfitAddressDayData.profitAmount = BigInt.fromI32(0)
  }

  return machineProfitAddressDayData as MachineProfitAddressDayData
}