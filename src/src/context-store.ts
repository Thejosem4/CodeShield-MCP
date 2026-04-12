import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

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

function getLockPath(): string {
  return path.join(os.homedir(), '.codeshield', '.store.lock');
}

interface LockFile {
  pid: number;
  acquiredAt: string;
}

function acquireLock(): void {
  const lockPath = getLockPath();
  const lockDir = path.dirname(lockPath);

  // Ensure directory exists
  if (!fs.existsSync(lockDir)) {
    fs.mkdirSync(lockDir, { recursive: true, mode: 0o755 });
  }

  // Try to create lock file exclusively
  try {
    const fd = fs.openSync(lockPath, 'wx');
    const lockData: LockFile = { pid: process.pid, acquiredAt: new Date().toISOString() };
    fs.writeSync(fd, JSON.stringify(lockData));
    fs.closeSync(fd);
    return;
  } catch (e: any) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }

  // Lock exists - check if process is still alive
  try {
    const lockContent = fs.readFileSync(lockPath, 'utf-8');
    const lockData: LockFile = JSON.parse(lockContent);

    // Check if process is alive
    try {
      process.kill(lockData.pid, 0);
      // Process alive, lock is valid - wait and retry
      throw new Error(`Store locked by process ${lockData.pid}`);
    } catch (killErr: any) {
      if (killErr.code !== 'ESRCH') {
        throw killErr;
      }
      // Process is dead, remove stale lock and retry
      fs.unlinkSync(lockPath);
      acquireLock(); // Recursive retry
      return;
    }
  } catch (e: any) {
    if (e.code === 'ENOENT') {
      // Lock disappeared, retry
      acquireLock();
      return;
    }
    throw e;
  }
}

function releaseLock(): void {
  const lockPath = getLockPath();
  try {
    if (fs.existsSync(lockPath)) {
      const lockContent = fs.readFileSync(lockPath, 'utf-8');
      const lockData: LockFile = JSON.parse(lockContent);
      if (lockData.pid === process.pid) {
        fs.unlinkSync(lockPath);
      }
    }
  } catch {
    // Ignore cleanup errors
  }
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
    // Try to recover from backup
    const dir = path.dirname(storePath);
    const backups = fs.readdirSync(dir).filter(f => f.startsWith('context-store.json.backup.'));
    if (backups.length > 0) {
      // Sort by timestamp (newest first)
      backups.sort().reverse();
      const latestBackup = path.join(dir, backups[0]);
      try {
        const backupData = fs.readFileSync(latestBackup, 'utf-8');
        return JSON.parse(backupData) as ContextStore;
      } catch {
        // Fall through to empty store
      }
    }
    return { contexts: [] };
  }
}

function writeStore(store: ContextStore): void {
  ensureDir();
  const storePath = getStorePath();
  const tempPath = storePath + '.tmp.' + crypto.randomBytes(8).toString('hex');
  try {
    fs.writeFileSync(tempPath, JSON.stringify(store, null, 2), 'utf-8');
    fs.renameSync(tempPath, storePath);
  } catch (e) {
    // Clean up temp file on failure
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    throw e;
  }
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

  acquireLock();
  try {
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
  } finally {
    releaseLock();
  }
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
  acquireLock();
  try {
    const store = readStore();
    const initialLength = store.contexts.length;
    store.contexts = store.contexts.filter((c) => c.name !== name);
    writeStore(store);
    return store.contexts.length < initialLength;
  } finally {
    releaseLock();
  }
}

export async function exportContexts(): Promise<string> {
  const store = readStore();
  return JSON.stringify(store, null, 2);
}

export async function importContexts(json: string): Promise<{ success: boolean; imported: number }> {
  acquireLock();
  try {
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
  } finally {
    releaseLock();
  }
}
