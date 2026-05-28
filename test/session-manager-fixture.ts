import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { AgentMessage } from "../src/openclaw-bridge.js";

type SessionEntry = Record<string, unknown> & {
  type: string;
  id?: string;
  parentId?: string | null;
  message?: AgentMessage;
};

/** Minimal JSONL session writer for tests that need OpenClaw-shaped transcripts. */
export class SessionManager {
  private readonly sessionFile: string | null;
  private readonly header: Record<string, unknown>;
  private readonly entries: SessionEntry[];
  private leafId: string | null;

  private constructor(params: {
    sessionFile: string | null;
    cwd: string;
    header?: Record<string, unknown>;
    entries?: SessionEntry[];
  }) {
    this.sessionFile = params.sessionFile;
    this.header = params.header ?? createSessionHeader(params.cwd);
    this.entries = params.entries ?? [];
    this.leafId = readLeafId(this.entries);
  }

  /** Open or create a persisted test session file. */
  static open(sessionFile: string): SessionManager {
    const resolvedPath = resolve(sessionFile);
    if (!existsSync(resolvedPath)) {
      return new SessionManager({ sessionFile: resolvedPath, cwd: process.cwd() });
    }
    const parsed = parseSessionFile(readFileSync(resolvedPath, "utf8"));
    return new SessionManager({
      sessionFile: resolvedPath,
      cwd: process.cwd(),
      header: parsed.header,
      entries: parsed.entries,
    });
  }

  /** Create an in-memory test session. */
  static inMemory(cwd: string): SessionManager {
    return new SessionManager({ sessionFile: null, cwd });
  }

  /** Append a message entry and return its generated entry id. */
  appendMessage(message: AgentMessage): string {
    const id = randomUUID().slice(0, 8);
    const entry: SessionEntry = {
      type: "message",
      id,
      parentId: this.leafId,
      timestamp: new Date().toISOString(),
      message,
    };
    this.entries.push(entry);
    this.leafId = id;
    this.persist();
    return id;
  }

  /** Return the current branch entries in root-to-leaf order. */
  getBranch(): SessionEntry[] {
    const byId = new Map<string, SessionEntry>();
    for (const entry of this.entries) {
      if (typeof entry.id === "string") {
        byId.set(entry.id, entry);
      }
    }
    const branch: SessionEntry[] = [];
    let current = this.leafId ? byId.get(this.leafId) : undefined;
    while (current) {
      branch.unshift(current);
      current = typeof current.parentId === "string" ? byId.get(current.parentId) : undefined;
    }
    return branch;
  }

  /** Return the session header entry. */
  getHeader(): Record<string, unknown> {
    return this.header;
  }

  /** Move the current leaf so the next appended message starts a new branch. */
  branch(branchFromId: string): void {
    if (!this.entries.some((entry) => entry.id === branchFromId)) {
      throw new Error(`Entry ${branchFromId} not found`);
    }
    this.leafId = branchFromId;
  }

  private persist(): void {
    if (!this.sessionFile) {
      return;
    }
    const serialized = [this.header, ...this.entries].map((entry) => JSON.stringify(entry)).join("\n");
    writeFileSync(this.sessionFile, `${serialized}\n`, "utf8");
  }
}

function createSessionHeader(cwd: string): Record<string, unknown> {
  return {
    type: "session",
    version: 3,
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    cwd,
  };
}

function readLeafId(entries: SessionEntry[]): string | null {
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const id = entries[index]?.id;
    if (typeof id === "string") {
      return id;
    }
  }
  return null;
}

function parseSessionFile(content: string): {
  header: Record<string, unknown>;
  entries: SessionEntry[];
} {
  const records: Record<string, unknown>[] = [];
  for (const line of content.trim().split("\n")) {
    if (!line.trim()) {
      continue;
    }
    records.push(JSON.parse(line) as Record<string, unknown>);
  }
  const header = records[0]?.type === "session" ? records[0] : createSessionHeader(process.cwd());
  const entries = records.filter((record): record is SessionEntry => {
    return record.type !== "session" && typeof record.type === "string";
  });
  return { header, entries };
}
