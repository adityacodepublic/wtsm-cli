import readline from "readline";

export function setupKeypressEvents(): void {
  readline.emitKeypressEvents(process.stdin);
}
