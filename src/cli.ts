import { Command } from "commander";
import { createCommand } from "./commands/create";
import { addCommand, addToSession } from "./commands/add";
import { listCommand } from "./commands/list";
import { restoreSession } from "./commands/restore";
import { setupKeypressEvents } from "./lib/utils";

setupKeypressEvents();

export function createCLI(): Command {
  const program = new Command();
  program
    .name("s")
    .description("Windows Terminal Session Manager")
    .version("1.1.1");

  program.addCommand(createCommand());
  program.addCommand(addCommand());
  program.addCommand(listCommand());

  return program;
}

const rawArgs = process.argv.slice(2);
const knownCommands = [
  "create",
  "add",
  "ls",
  "list",
  "help",
  "--help",
  "-h",
  "--version",
  "-V",
];

if (rawArgs.length > 0 && !knownCommands.includes(rawArgs[0])) {
  const sessionName = rawArgs[0];
  const secondArg = rawArgs[1];

  if (secondArg === "add") {
    addToSession(sessionName, process.cwd());
  } else {
    // Check for user provided flag
    const isCurrentWindow = rawArgs.includes("--current") || rawArgs.includes("-c");
    restoreSession(sessionName, { currentWindow: isCurrentWindow });
  }
} else {
  const program = createCLI();
  program.parse(process.argv);
}
