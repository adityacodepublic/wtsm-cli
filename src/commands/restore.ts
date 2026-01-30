import { spawn } from "child_process";
import chalk from "chalk";
import { loadSessions } from "../lib/session";
import { Tab } from "../types";

export function restoreSession(sessionName: string): void {
  const sessions = loadSessions();
  if (!sessions[sessionName]) {
    console.log(chalk.red(`Session '${sessionName}' not found.`));
    console.log("Available sessions:", Object.keys(sessions).join(", "));
    return;
  }

  const tabs = sessions[sessionName];
  if (tabs.length === 0) {
    console.log(chalk.yellow(`Session '${sessionName}' is empty.`));
    return;
  }

  const args: string[] = [];

  tabs.forEach((tab: Tab, index: number) => {
    if (index > 0) {
      args.push(";");
      args.push("new-tab");
    }

    args.push("-p");
    args.push("Windows PowerShell");

    if (tab.path) {
      args.push("-d");
      args.push(tab.path);
    }

    if (tab.command) {
      args.push("powershell");
      args.push("-NoExit");
      args.push("-Command");
      args.push(tab.command);
    }
  });

  console.log(chalk.blue(`Launching session '${sessionName}'...`));
  const subprocess = spawn("wt", args, {
    detached: true,
    stdio: "ignore",
    shell: false,
  });
  subprocess.unref();
}
