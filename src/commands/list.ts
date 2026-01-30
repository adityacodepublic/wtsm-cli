import { Command } from "commander";
import chalk from "chalk";
import readline from "readline";
import { spawn } from "child_process";
import { loadSessions, saveSessions } from "../lib/session";
import { Sessions, Tab } from "../types";

type View = "sessions" | "tabs";

function interactiveList(): Promise<void> {
  const sessions = loadSessions();
  const sessionNames = Object.keys(sessions);

  if (sessionNames.length === 0) {
    console.log("No sessions found.");
    return Promise.resolve();
  }

  let view: View = "sessions";
  let selectedIndex = 0;
  let activeSessionName: string | null = null;
  let tabs: Tab[] = [];

  const { stdin, stdout } = process;
  
  if (!process.stdin.isTTY) {
    console.log(chalk.red("Interactive mode requires a TTY. Please run in a terminal."));
    return Promise.resolve();
  }
  
  readline.emitKeypressEvents(stdin);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding("utf8");

  stdout.write("\x1B[?25l");

  function cleanup(): void {
    stdout.write("\x1B[?25h");
    stdin.setRawMode(false);
    stdin.pause();
    stdin.removeListener("keypress", handleInput);
  }

  function render(): void {
    console.clear();

    if (view === "sessions") {
      console.log(chalk.cyan.bold("  Windows Terminal Sessions"));
      console.log(chalk.gray("  -------------------------"));

      sessionNames.forEach((name, idx) => {
        if (idx === selectedIndex) {
          console.log(chalk.green.bold(`> ${name}`));
        } else {
          console.log(`  ${name}`);
        }
      });

      console.log(
        chalk.gray(
          "\n  (↑/↓: Move, Enter/→: Open, Ctrl+D: Delete, q/Esc: Exit)",
        ),
      );
    } else if (view === "tabs") {
      console.log(chalk.cyan.bold(`  Session: ${activeSessionName}`));
      console.log(chalk.gray("  -------------------------"));

      if (tabs.length === 0) {
        console.log("  (Empty Session)");
      } else {
        tabs.forEach((tab, idx) => {
          const title = tab.path + (tab.command ? ` [${tab.command}]` : "");
          if (idx === selectedIndex) {
            console.log(chalk.green.bold(`> ${idx + 1}. ${title}`));
          } else {
            console.log(`  ${idx + 1}. ${title}`);
          }
        });
      }

      console.log(chalk.gray("\n  (←: Back, Ctrl+D: Delete, q/Esc: Exit)"));
    }
  }

  const handleInput = (str: string, key: { ctrl?: boolean; name?: string; sequence?: string }) => {
    if (!key) return;

    if (
      key.sequence === "\u0003" ||
      key.name === "q" ||
      key.name === "escape"
    ) {
      cleanup();
      process.exit(0);
    }

    if (key.ctrl && key.name === "d") {
      if (view === "sessions") {
        const nameToDelete = sessionNames[selectedIndex];
        if (nameToDelete) {
          delete sessions[nameToDelete];
          saveSessions(sessions);
          const idx = sessionNames.indexOf(nameToDelete);
          sessionNames.splice(idx, 1);
          if (selectedIndex >= sessionNames.length)
            selectedIndex = Math.max(0, sessionNames.length - 1);
          render();
        }
      } else if (view === "tabs") {
        const currentTabs = sessions[activeSessionName!];
        if (currentTabs && currentTabs.length > 0) {
          currentTabs.splice(selectedIndex, 1);
          saveSessions(sessions);
          tabs = currentTabs;
          if (selectedIndex >= tabs.length)
            selectedIndex = Math.max(0, tabs.length - 1);
          render();
        }
      }
      return;
    }

    if (key.name === "up") {
      selectedIndex--;
      const max =
        view === "sessions"
          ? sessionNames.length
          : (sessions[activeSessionName!] || []).length;
      if (max > 0) {
        if (selectedIndex < 0) selectedIndex = max - 1;
        render();
      }
    }

    if (key.name === "down") {
      selectedIndex++;
      const max =
        view === "sessions"
          ? sessionNames.length
          : (sessions[activeSessionName!] || []).length;
      if (max > 0) {
        if (selectedIndex >= max) selectedIndex = 0;
        render();
      }
    }

    if (key.name === "right" || key.name === "return" || key.name === "enter") {
      if (view === "sessions") {
        activeSessionName = sessionNames[selectedIndex];
        tabs = sessions[activeSessionName];
        if (tabs) {
          view = "tabs";
          selectedIndex = 0;
          render();
        }
      }
    }

    if (key.name === "left") {
      if (view === "tabs") {
        view = "sessions";
        const prevIdx = sessionNames.indexOf(activeSessionName!);
        selectedIndex = prevIdx >= 0 ? prevIdx : 0;
        activeSessionName = null;
        tabs = [];
        render();
      }
    }
  };

  render();
  stdin.on("keypress", handleInput);

  return new Promise(() => {});
}

export function listCommand(): Command {
  const cmd = new Command("ls");
  cmd.alias("list");
  cmd.arguments("[name]");
  cmd.description("List sessions (interactive) or tabs in a session");
  cmd.action((name: string | undefined) => {
      if (!name) {
        interactiveList();
      } else {
        const sessions = loadSessions();
        if (!sessions[name]) {
          console.log(chalk.red(`Session '${name}' not found.`));
          return;
        }
        console.log(chalk.cyan(`Session: ${name}`));
        const tabs = sessions[name];
        if (tabs.length === 0) {
          console.log("  (Empty)");
        } else {
          tabs.forEach((tab: Tab, idx: number) => {
            console.log(`  ${chalk.bold(idx + 1)}. Path: ${tab.path}`);
            if (tab.command) console.log(`     Cmd:  ${chalk.gray(tab.command)}`);
          });
        }
      }
    });
  return cmd;
}
