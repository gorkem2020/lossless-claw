import { readFileSync } from "node:fs";

export type SessionJsonlEntry = Record<string, unknown> & {
  type: string;
  id?: string;
  parentId?: string | null;
  message?: unknown;
};

export type SessionJsonlFile = {
  header: Record<string, unknown> | null;
  entries: SessionJsonlEntry[];
  branch: SessionJsonlEntry[];
};

/** Read an OpenClaw session JSONL file and return its current branch entries. */
export function loadSessionJsonlSync(sessionFile: string): SessionJsonlFile {
  const entries = parseSessionJsonlEntries(readFileSync(sessionFile, "utf8"));
  const header = readSessionHeader(entries);
  const bodyEntries = entries.filter(isSessionJsonlEntry);
  return {
    header,
    entries: bodyEntries,
    branch: buildSessionBranch(bodyEntries),
  };
}

function parseSessionJsonlEntries(content: string): Record<string, unknown>[] {
  const entries: Record<string, unknown>[] = [];
  for (const line of content.trim().split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        entries.push(parsed as Record<string, unknown>);
      }
    } catch {
      // Match the host session reader: malformed lines are skipped.
    }
  }
  return entries;
}

function readSessionHeader(entries: Record<string, unknown>[]): Record<string, unknown> | null {
  const first = entries[0];
  return first?.type === "session" ? first : null;
}

function isSessionJsonlEntry(entry: Record<string, unknown>): entry is SessionJsonlEntry {
  return entry.type !== "session" && typeof entry.type === "string";
}

function buildSessionBranch(entries: SessionJsonlEntry[]): SessionJsonlEntry[] {
  const byId = new Map<string, SessionJsonlEntry>();
  let leafId: string | undefined;

  for (const entry of entries) {
    if (typeof entry.id !== "string" || !entry.id) {
      continue;
    }
    byId.set(entry.id, entry);
    leafId = entry.id;
  }

  if (!leafId) {
    return entries;
  }

  const branch: SessionJsonlEntry[] = [];
  let current = byId.get(leafId);
  while (current) {
    branch.unshift(current);
    const parentId = current.parentId;
    current = typeof parentId === "string" ? byId.get(parentId) : undefined;
  }
  return branch;
}
