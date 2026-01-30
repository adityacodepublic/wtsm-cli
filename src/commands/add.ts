import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import { loadSessions, saveSessions } from "../lib/session";
import { Tab } from "../types";

export async function addToSession(sessionName: string, cwd: string): Promise<void> {
  const sessions = loadSessions();
  if (!sessions[sessionName]) {
    console.log(
      chalk.red(
        `Session '${sessionName}' not found. Use 's create ${sessionName}' first.`,
      ),
    );
    return;
  }

  const handleExit = (str: string, key: { ctrl?: boolean; name?: string }) => {
    if (
      key &&
      ((key.ctrl && key.name === "c") ||
        key.name === "q" ||
        key.name === "escape")
    ) {
      process.exit(0);
    }
  };
  process.stdin.on("keypress", handleExit);

  try {
    const { command } = await inquirer.prompt([
      {
        type: "input",
        name: "command",
        message: " Command to run on start (optional):",
      },
    ]);

    const newTab: Tab = {
      path: cwd,
      command: command.trim() || null,
    };

    sessions[sessionName].push(newTab);
    saveSessions(sessions);
    console.log(chalk.green(`Added current path to session '${sessionName}'.`));
  } finally {
    process.stdin.removeListener("keypress", handleExit);
  }
}

export function addCommand(): Command {
  const cmd = new Command("add");
  cmd.arguments("[name]");
  cmd.description("Add current path to a session");
  cmd.action(async (nameOrIndex: string | undefined) => {
      const sessions = loadSessions();
      const sessionNames = Object.keys(sessions);

      if (sessionNames.length === 0) {
        console.log(
          chalk.red("No sessions found. Create one first with 's create <name>'"),
        );
        return;
      }

      let targetSession = nameOrIndex;

      if (!targetSession) {
        console.log(chalk.cyan.bold("  Available Sessions"));
        console.log(chalk.gray("  ------------------"));
        sessionNames.forEach((name, idx) => {
          console.log(`  ${chalk.yellow(idx + 1)}. ${chalk.white(name)}`);
        });
        console.log();

        const handleExit = (str: string, key: { ctrl?: boolean; name?: string }) => {
          if (
            key &&
            ((key.ctrl && key.name === "c") ||
              key.name === "q" ||
              key.name === "escape")
          ) {
            process.exit(0);
          }
        };
        process.stdin.on("keypress", handleExit);

        let answer: { input: string };
        try {
          answer = await inquirer.prompt([
            {
              type: "input",
              name: "input",
              message: " Select session (number or name):",
              validate: (input: string) => {
                if (input === "q") return true;
                if (!input) return "Please enter a value";
                const num = parseInt(input, 10);
                if (!isNaN(num)) {
                  if (num < 1 || num > sessionNames.length)
                    return "Invalid number";
                } else {
                  if (!sessions[input]) return "Session not found";
                }
                return true;
              },
            },
          ]);
        } finally {
          process.stdin.removeListener("keypress", handleExit);
        }

        if (answer.input === "q") process.exit(0);

        const num = parseInt(answer.input, 10);
        if (!isNaN(num)) {
          targetSession = sessionNames[num - 1];
        } else {
          targetSession = answer.input;
        }
      } else {
        if (nameOrIndex) {
          const num = parseInt(nameOrIndex, 10);
          if (!isNaN(num)) {
            if (num >= 1 && num <= sessionNames.length) {
              targetSession = sessionNames[num - 1];
            }
          }
        }
      }

      if (targetSession) {
        await addToSession(targetSession, process.cwd());
      }
    });
  return cmd;
}
