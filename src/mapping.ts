import {
  GameMachine,
  RunMachineSuccessfully as RunMachineSuccessfullyEvent,
} from "../generated/GameMachine/GameMachine"
import { RunMachineSuccessfully } from "../generated/schema"

export function handleRunMachineSuccessfully(
  event: RunMachineSuccessfullyEvent
): void {
  let gameMachine = GameMachine.bind(event.address)

  let run = new RunMachineSuccessfully(event.transaction.hash.toHex() + '-' + event.logIndex.toString())
  run.blockNumber = event.block.number
  run.timestamp = event.block.timestamp
  run.times = event.params.times
  run.player = event.params.account

  run.priceOnRun = gameMachine.playOncePrice()
  run.amountSpent = gameMachine.playOncePrice().times(run.times)
    
  run.save();
}
