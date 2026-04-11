import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface CursorPosition {
  file: string;
  line: number;
  column: number;
}

export interface CodingContext {
  name: string;
  createdAt: string;
  files: string[];
  cursor?: CursorPosition;
  notes?: string;
  lastEditedFile?: string;
}

interface ContextStore {
  contexts: CodingContext[];
}

function getStorePath(): string {
  return path.join(os.homedir(), '.codeshield', 'context-store.json');
}

function ensureDir(): void {
  const dir = path.join(os.homedir(), '.codeshield');
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
    }
  } catch (e) {
    console.error(`Failed to create ${dir}: ${e}`);
    throw new Error('Cannot create .codeshield directory');
  }
}

function readStore(): ContextStore {
  ensureDir();
  const storePath = getStorePath();
  if (!fs.existsSync(storePath)) {
    return { contexts: [] };
  }
  try {
    const data = fs.readFileSync(storePath, 'utf-8');
    return JSON.parse(data) as ContextStore;
  } catch (e) {
    const backupPath = storePath + '.backup.' + Date.now();
    fs.copyFileSync(storePath, backupPath);
    return { contexts: [] };
  }
}

function writeStore(store: ContextStore): void {
  ensureDir();
  const storePath = getStorePath();
  fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
}

export async function saveContext(
  name: string,
  files: string[],
  options?: {
    cursor?: CursorPosition;
    notes?: string;
    lastEditedFile?: string;
  }
): Promise<{ success: boolean; context: CodingContext }> {
  if (!name || name.trim().length === 0) {
    throw new Error('Context name is required');
  }
  if (name.length > 100) {
    throw new Error('Context name too long (max 100 chars)');
  }
  if (!Array.isArray(files)) {
    throw new Error('Files must be an array');
  }

  const store = readStore();

  const now = new Date().toISOString();
  const existing = store.contexts.findIndex((c) => c.name === name);

  const context: CodingContext = {
    name,
    createdAt: existing >= 0 ? store.contexts[existing].createdAt : now,
    files,
    cursor: options?.cursor,
    notes: options?.notes,
    lastEditedFile: options?.lastEditedFile,
  };

  if (existing >= 0) {
    store.contexts[existing] = context;
  } else {
    store.contexts.push(context);
  }

  writeStore(store);
  return { success: true, context };
}

export async function listContexts(): Promise<CodingContext[]> {
  const store = readStore();
  return store.contexts;
}

export async function getContext(name: string): Promise<CodingContext | null> {
  const store = readStore();
  return store.contexts.find((c) => c.name === name) ?? null;
}

export async function deleteContext(name: string): Promise<boolean> {
  const store = readStore();
  const initialLength = store.contexts.length;
  store.contexts = store.contexts.filter((c) => c.name !== name);
  writeStore(store);
  return store.contexts.length < initialLength;
}

export async function exportContexts(): Promise<string> {
  const store = readStore();
  return JSON.stringify(store, null, 2);
}

export async function importContexts(json: string): Promise<{ success: boolean; imported: number }> {
  try {
    const data = JSON.parse(json) as ContextStore;
    if (!Array.isArray(data.contexts)) {
      throw new Error('Invalid context store format');
    }
    const store = readStore();
    const newContexts = data.contexts.filter(
      (newCtx) => !store.contexts.some((existing) => existing.name === newCtx.name)
    );
    store.contexts.push(...newContexts);
    writeStore(store);
    return { success: true, imported: newContexts.length };
  } catch (e) {
    throw new Error(`Failed to import contexts: ${e}`);
  }
}
