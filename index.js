#!/usr/bin/env node

import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import readline from 'readline';

const SESSION_FILE = path.join(os.homedir(), '.wts-sessions.json');
const program = new Command();

// --- Data Helpers ---

function loadSessions() {
  if (!fs.existsSync(SESSION_FILE)) {
    return {};
  }
  try {
    return JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
  } catch (e) {
    console.error(chalk.red('Error reading session file.'));
    return {};
  }
}

function saveSessions(sessions) {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}

// --- Logic Helpers ---

async function addToSession(sessionName, cwd) {
  const sessions = loadSessions();
  if (!sessions[sessionName]) {
    console.log(chalk.red(`Session '${sessionName}' not found. Use 's create ${sessionName}' first.`));
    return;
  }

  const { command } = await inquirer.prompt([
    {
      type: 'input',
      name: 'command',
      message: ' Command to run on start (optional):',
    }
  ]);

  sessions[sessionName].push({
    path: cwd,
    command: command.trim() || null
  });

  saveSessions(sessions);
  console.log(chalk.green(`Added current path to session '${sessionName}'.`));
}

function restoreSession(sessionName) {
  const sessions = loadSessions();
  if (!sessions[sessionName]) {
    console.log(chalk.red(`Session '${sessionName}' not found.`));
    console.log('Available sessions:', Object.keys(sessions).join(', '));
    return;
  }

  const tabs = sessions[sessionName];
  if (tabs.length === 0) {
    console.log(chalk.yellow(`Session '${sessionName}' is empty.`));
    return;
  }

  const args = [];

  tabs.forEach((tab, index) => {
    if (index > 0) {
      args.push(';');
      args.push('new-tab');
    }

    // Force PowerShell profile
    args.push('-p');
    args.push('Windows PowerShell');

    if (tab.path) {
      args.push('-d');
      args.push(tab.path);
    }

    if (tab.command) {
      // PowerShell command execution
      args.push('powershell'); // Redundant if profile is set, but ensures command syntax works if profile is weird
      args.push('-NoExit');
      args.push('-Command');
      args.push(tab.command);
    }
  });

  console.log(chalk.blue(`Launching session '${sessionName}'...`));
  const subprocess = spawn('wt', args, { detached: true, stdio: 'ignore', shell: false });
  subprocess.unref();
}



async function interactiveList() {
  const sessions = loadSessions();
  const sessionNames = Object.keys(sessions);

  if (sessionNames.length === 0) {
    console.log("No sessions found.");
    return;
  }

  // State
  let view = 'sessions'; // 'sessions' | 'tabs'
  let selectedIndex = 0;
  let activeSessionName = null;
  let tabs = [];

  // Input Handling
  const { stdin, stdout } = process;
  readline.emitKeypressEvents(stdin); // Required for keypress events
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  // Helper to hide cursor
  stdout.write('\x1B[?25l');

  function cleanup() {
    stdout.write('\x1B[?25h'); // Show cursor
    stdin.setRawMode(false);
    stdin.pause();
    stdin.removeListener('keypress', handleInput);
  }

  function render() {
    // Clear screen for full-screen feel, or use clearDown if preferred.
    // console.clear() is robust.
    console.clear();

    if (view === 'sessions') {
      console.log(chalk.cyan.bold("  Windows Terminal Sessions"));
      console.log(chalk.gray("  -------------------------"));

      sessionNames.forEach((name, idx) => {
        if (idx === selectedIndex) {
          console.log(chalk.green.bold(`> ${name}`));
        } else {
          console.log(`  ${name}`);
        }
      });

      console.log(chalk.gray("\n  (↑/↓: Move, Enter/→: Open, Ctrl+D: Delete, q/Esc: Exit)"));

    } else if (view === 'tabs') {
      console.log(chalk.cyan.bold(`  Session: ${activeSessionName}`));
      console.log(chalk.gray("  -------------------------"));

      if (tabs.length === 0) {
        console.log("  (Empty Session)");
      } else {
        tabs.forEach((tab, idx) => {
          const title = tab.path + (tab.command ? ` [${tab.command}]` : '');
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

  const handleInput = (str, key) => {
    if (!key) return;

    // Ctrl+C (End of Text) or 'q' or Esc
    if (key.sequence === '\u0003' || key.name === 'q' || key.name === 'escape') {
      cleanup();
      process.exit(0);
    }

    // Ctrl+D (Delete)
    if (key.ctrl && key.name === 'd') {
      if (view === 'sessions') {
        const nameToDelete = sessionNames[selectedIndex];
        if (nameToDelete) {
          delete sessions[nameToDelete];
          saveSessions(sessions);
          // Refresh list
          const idx = sessionNames.indexOf(nameToDelete);
          sessionNames.splice(idx, 1);
          if (selectedIndex >= sessionNames.length) selectedIndex = Math.max(0, sessionNames.length - 1);
          render();
        }
      } else if (view === 'tabs') {
        const currentTabs = sessions[activeSessionName];
        if (currentTabs && currentTabs.length > 0) {
          currentTabs.splice(selectedIndex, 1);
          saveSessions(sessions);
          if (selectedIndex >= currentTabs.length) selectedIndex = Math.max(0, currentTabs.length - 1);
          render();
        }
      }
      return;
    }

    // Up Arrow
    if (key.name === 'up') {
      selectedIndex--;
      const max = view === 'sessions' ? sessionNames.length : (sessions[activeSessionName] || []).length;
      if (max > 0) {
        if (selectedIndex < 0) selectedIndex = max - 1; // Wrap top
        render();
      }
    }

    // Down Arrow
    if (key.name === 'down') {
      selectedIndex++;
      const max = view === 'sessions' ? sessionNames.length : (sessions[activeSessionName] || []).length;
      if (max > 0) {
        if (selectedIndex >= max) selectedIndex = 0; // Wrap bottom
        render();
      }
    }

    // Right Arrow or Enter
    if (key.name === 'right' || key.name === 'return' || key.name === 'enter') {
      if (view === 'sessions') {
        activeSessionName = sessionNames[selectedIndex];
        tabs = sessions[activeSessionName];
        if (tabs) { // Only switch if valid
          view = 'tabs';
          selectedIndex = 0; // Reset index for tabs list
          render();
        }
      }
    }

    // Left Arrow
    if (key.name === 'left') {
      if (view === 'tabs') {
        view = 'sessions';
        // Try to restore index of previous session
        const prevIdx = sessionNames.indexOf(activeSessionName);
        selectedIndex = prevIdx >= 0 ? prevIdx : 0;

        activeSessionName = null;
        tabs = [];
        render();
      }
    }
  };

  // Initial Render
  render();
  stdin.on('keypress', handleInput);

  // Return a promise that never resolves so the program waits for input
  return new Promise(() => { });
}




// --- Commands ---


program
  .name('s')
  .description('Windows Terminal Session Manager')
  .version('1.0.0');

// 1. s create <name>
program
  .command('create <name>')
  .description('Create a new session config')
  .action((name) => {
    const sessions = loadSessions();
    if (sessions[name]) {
      console.log(chalk.yellow(`Session '${name}' already exists.`));
      return;
    }
    sessions[name] = [];
    saveSessions(sessions);
    console.log(chalk.green(`Session '${name}' created.`));
  });

// 2. s add [name] (Modified)
program
  .command('add [name]')
  .description('Add current path to a session')
  .action(async (nameOrIndex) => {
    const sessions = loadSessions();
    const sessionNames = Object.keys(sessions);

    if (sessionNames.length === 0) {
      console.log(chalk.red("No sessions found. Create one first with 's create <name>'"));
      return;
    }

    let targetSession = nameOrIndex;

    if (!targetSession) {
      // Print numbered list
      console.log(chalk.cyan("Available Sessions:"));
      sessionNames.forEach((name, idx) => {
        console.log(`${chalk.bold(idx + 1)}. ${name}`);
      });

      const answer = await inquirer.prompt([
        {
          type: 'input',
          name: 'input',
          message: ' Select session number or name:',
          validate: (input) => {
            if (!input) return "Please enter a value";
            const num = parseInt(input, 10);
            if (!isNaN(num)) {
              if (num < 1 || num > sessionNames.length) return "Invalid number";
            } else {
              if (!sessions[input]) return "Session not found";
            }
            return true;
          }
        }
      ]);

      const num = parseInt(answer.input, 10);
      if (!isNaN(num)) {
        targetSession = sessionNames[num - 1];
      } else {
        targetSession = answer.input;
      }
    } else {
      // Check if user provided a number directly in CLI: `s add 1`
      const num = parseInt(nameOrIndex, 10);
      if (!isNaN(num)) {
        if (num >= 1 && num <= sessionNames.length) {
          targetSession = sessionNames[num - 1];
        }
      }
    }

    await addToSession(targetSession, process.cwd());
  });

// 5. s ls (Renamed & Interactive)
program
  .command('ls [name]')
  .alias('list')
  .description('List sessions (interactive) or tabs in a session')
  .action((name) => {
    if (!name) {
      // Interactive Mode
      interactiveList();
    } else {
      // List tabs in specific session (Legacy/Scriptable mode)
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
        tabs.forEach((tab, idx) => {
          console.log(`  ${chalk.bold(idx + 1)}. Path: ${tab.path}`);
          if (tab.command) console.log(`     Cmd:  ${chalk.gray(tab.command)}`);
        });
      }
    }
  });


// --- Custom Dispatcher ---
const rawArgs = process.argv.slice(2);
const knownCommands = ['create', 'add', 'ls', 'list', 'help', '--help', '-h', '--version', '-V'];

if (rawArgs.length > 0 && !knownCommands.includes(rawArgs[0])) {
  const sessionName = rawArgs[0];
  const secondArg = rawArgs[1];

  if (secondArg === 'add') {
    addToSession(sessionName, process.cwd());
  } else {
    restoreSession(sessionName);
  }
} else {
  program.parse(process.argv);
}
