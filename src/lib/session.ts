import fs from "fs";
import path from "path";
import os from "os";
import { Sessions } from "../types";

const SESSION_FILE = path.join(os.homedir(), ".wts-sessions.json");

export function loadSessions(): Sessions {
  if (!fs.existsSync(SESSION_FILE)) {
    return {};
  }
  try {
    const data = fs.readFileSync(SESSION_FILE, "utf-8");
    return JSON.parse(data) as Sessions;
  } catch {
    console.error("Error reading session file.");
    return {};
  }
}

export function saveSessions(sessions: Sessions): void {
  fs.writeFileSync(SESSION_FILE, JSON.stringify(sessions, null, 2));
}
