import { Command } from "commander";
import chalk from "chalk";
import { loadSessions, saveSessions } from "../lib/session";

export function createCommand(): Command {
  const cmd = new Command("create");
  cmd.arguments("<name>");
  cmd.description("Create a new session config");
  cmd.action((name: string) => {
    const sessions = loadSessions();
    if (sessions[name]) {
      console.log(chalk.yellow(`Session '${name}' already exists.`));
      return;
    }
    sessions[name] = [];
    saveSessions(sessions);
    console.log(chalk.green(`Session '${name}' created.`));
  });
  return cmd;
}
