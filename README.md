# Windows Terminal Session Manager (`s`)

A CLI tool to define, save, and launch named Windows Terminal sessions with specific layouts and commands.

## Installation

Ensure the tool is linked globally:

```bash
npm link
```

## Usage Guide

### 1. Creating & Managing Sessions

**Create a new session:**

```bash
s create <name>
# Example:
s create work
```

**Add current directory to a session:**
Navigate to the folder you want to add, then run:

```bash
s add <name>
# Example:
cd C:\Projects\MyBackend
s add work
```

_It will ask for an optional startup command (e.g., `npm start` or `git status`)._

**Add interactively:**
If you don't provide a name, it will show a list:

```bash
s add
```

_(Type the number or name of the session to select it)_

### 2. Viewing Sessions

**Interactive Explorer:**

```bash
s ls
```

- **↑ / ↓**: Navigate the list of sessions.
- **→**: View tabs inside the selected session.
- **Ctrl+D**: Delete the selected session or tab.
- **q**, **Esc**, or **Ctrl+C**: Exit.

### 3. Launching Sessions

**Launch a session:**

```bash
s <name>
# Example:
s work
```

_Opens a new Windows Terminal window with all configured tabs._

### 4 Not implemented features

- currently only supports powershell - find the powershell profile if the default name not found else just normal powershell. find running info via the files
- clean scroll page,
- Pane capture command or path

- Automatically use current shell profile
