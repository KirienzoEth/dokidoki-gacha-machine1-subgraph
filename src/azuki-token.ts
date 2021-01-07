import { BigInt } from "@graphprotocol/graph-ts"
import {
  AzukiToken,
  Transfer as TransferEvent
} from "../generated/AzukiToken/AzukiToken"
import { Transfer, Transaction, Token, TokenDayData } from "../generated/schema"

const BURN_ADDRESS = "0x0000000000000000000000000000000000000000"

export function handleTransfer(
  event: TransferEvent
): void {
  let dayId = event.block.timestamp.toI32() / 86400
  dayId = dayId * 86400
  let transactionHash = event.transaction.hash.toHex()
  let transaction = Transaction.load(transactionHash)
  if (transaction == null) {
    transaction = new Transaction(transactionHash)
    transaction.timestamp = event.block.timestamp
    transaction.transfers = []
  }

  let token = Token.load(event.address.toHexString())
  if (token == null) {
    let tokenBinding = AzukiToken.bind(event.address)
    token = new Token(event.address.toHexString())
    token.name = tokenBinding.name()
    token.symbol = tokenBinding.symbol()
    token.decimals = tokenBinding.decimals()
    token.burnAmount = BigInt.fromI32(0)
  }

  let transfer = new Transfer(event.block.number.toString() + '-' + event.transaction.index.toString() + '-' + event.logIndex.toString())
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.value = event.params.value
  transfer.token = token.id
  transfer.logIndex = event.logIndex
  transfer.transaction = transactionHash
  transfer.timestamp = transaction.timestamp

  transaction.transfers = transaction.transfers.concat([transfer.id])

  if (transfer.to.toHexString() == BURN_ADDRESS) {
    token.burnAmount = token.burnAmount.plus(transfer.value)

    let tokenDayData = TokenDayData.load(dayId.toString() + '-' + token.id)
    if (tokenDayData == null) {
      tokenDayData = new TokenDayData(dayId.toString() + '-' + token.id)
      tokenDayData.date = BigInt.fromI32(dayId)
      tokenDayData.burnAmount = BigInt.fromI32(0)
      tokenDayData.token = token.id
    }

    tokenDayData.burnAmount = tokenDayData.burnAmount.plus(transfer.value)
    tokenDayData.save()
  }

  transfer.save()
  transaction.save()
  token.save()
}
