import { spawn } from "child_process";
import chalk from "chalk";
import { loadSessions } from "../lib/session";
import { Tab } from "../types";

export function restoreSession(
  sessionName: string,
  options: { currentWindow?: boolean } = {}
): void {
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

  // We will build args for tabs first, then decide on launch strategy
  const tabArgs: string[] = [];

  tabs.forEach((tab: Tab, index: number) => {
    if (index > 0) {
      tabArgs.push(";");
      tabArgs.push("new-tab");
    }

    tabArgs.push("-p");
    tabArgs.push("Windows PowerShell");

    if (tab.path) {
      tabArgs.push("-d");
      tabArgs.push(tab.path);
    }

    if (tab.command) {
      tabArgs.push("powershell");
      tabArgs.push("-NoExit");
      tabArgs.push("-Command");
      tabArgs.push(tab.command);
    }
  });

  /*
   * Logic:
   * 1. If --current is requested AND we are in Windows Terminal (WT_SESSION allows checking this), try -w 0.
   * 2. If --current is requested but NOT in WT, fall back to new window immediately.
   * 3. If -w 0 fails (exit code != 0), fall back to new window.
   */
  const isWindowsTerminal = !!process.env.WT_SESSION;

  const launch = (inCurrentWindow: boolean) => {
    // Rigid check: Only allow -w 0 if we are actually inside a WT session
    const canUseCurrentWindow = inCurrentWindow && isWindowsTerminal;
    const finalArgs = canUseCurrentWindow ? ["-w", "0", ...tabArgs] : tabArgs;

    // If not using current window (either user didn't ask, OR we forced fallback), default to detached spawn
    if (!canUseCurrentWindow) {
      if (inCurrentWindow && !isWindowsTerminal) {
        console.log(chalk.yellow("Not running in Windows Terminal. Opening in new window..."));
      } else {
        console.log(chalk.blue(`Launching session '${sessionName}' in new window...`));
      }

      const subprocess = spawn("wt", finalArgs, {
        detached: true,
        stdio: "ignore",
        shell: false,
      });
      subprocess.unref();
      return;
    }

    // WE ARE in Windows Terminal AND user requested --current.
    console.log(chalk.blue(`Attempting to launch session '${sessionName}' in current window...`));
    const subprocess = spawn("wt", finalArgs, {
      stdio: "inherit",
      shell: false
    });

    subprocess.on("error", (err) => {
      console.log(chalk.yellow(`Failed to launch in current window. Opening new window...`));
      launch(false);
    });

    subprocess.on("exit", (code) => {
      if (code !== 0) {
        console.log(chalk.yellow(`Could not target current window (exit code ${code}). Opening new window...`));
        launch(false);
      }
    });
  };

  launch(!!options.currentWindow);
}
