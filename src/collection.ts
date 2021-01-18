import {
  TransferSingle as TransferSingleEvent
} from "../generated/templates/Collection/Collection"
import { MachineNft, Machine } from "../generated/schema"

export function handleTransferSingle(
  event: TransferSingleEvent
): void {
  // If it's not from a machine, the transfer is not the result of a run
  let gameMachine = Machine.load(event.params._operator.toHexString())
  if (gameMachine === null) {
    return;
  }

  let machineNft = MachineNft.load(gameMachine.id + '-' + event.address.toHexString() + '-' + event.params._id.toString())
  machineNft.currentAmount = machineNft.currentAmount.minus(event.params._amount)
  machineNft.save()
}
