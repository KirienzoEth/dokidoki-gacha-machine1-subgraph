import {
  Transfer as TransferEvent
} from "../generated/AzukiToken/AzukiToken"
import { Transfer, Transaction } from "../generated/schema"

export function handleTransfer(
  event: TransferEvent
): void {
  let transactionHash = event.transaction.hash.toHex()
  let transaction = Transaction.load(transactionHash)
  if (transaction == null) {
    transaction = new Transaction(transactionHash)
    transaction.timestamp = event.block.timestamp
    transaction.transfers = []
  }

  let transfer = new Transfer(transactionHash + '-' + event.logIndex.toString())
  transfer.from = event.params.from
  transfer.to = event.params.to
  transfer.value = event.params.value
  transfer.currencyAddress = event.address
  transfer.logIndex = event.logIndex
  transfer.transaction = transactionHash
  transfer.timestamp = transaction.timestamp
  transfer.save()

  transaction.transfers = transaction.transfers.concat([transfer.id])
  transaction.save()
}
