/**
 * CodeShield Cache System — SQLite WAL Backend
 *
 * Reemplaza el cache en memoria por una base de datos SQLite embebida.
 * Modo WAL (Write-Ahead Logging) permite múltiples procesos concurrentes
 * leer y escribir sin race conditions — diseñado para entornos multi-agente.
 *
 * DB path: ~/.codeshield/index_cache.db
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import type { IndexResult } from "./detection/index.js";

// ============================================
// DATABASE INITIALIZATION
// ============================================

const CODESHIELD_DIR = path.join(os.homedir(), ".codeshield");
const DB_PATH = path.join(CODESHIELD_DIR, "index_cache.db");

// Default TTL: 5 minutes (in milliseconds)
const DEFAULT_TTL = 5 * 60 * 1000;

// Lazy-initialized database instance
let _db: import("better-sqlite3").Database | null = null;

/**
 * Get (or initialize) the SQLite database instance.
 * Uses lazy initialization so the DB is only opened when first needed.
 */
function getDb(): import("better-sqlite3").Database {
  if (_db) return _db;

  // Ensure ~/.codeshield directory exists
  if (!fs.existsSync(CODESHIELD_DIR)) {
    fs.mkdirSync(CODESHIELD_DIR, { recursive: true });
  }

  // Dynamic import to support ESM — better-sqlite3 is a CommonJS native addon
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Database = require("better-sqlite3") as typeof import("better-sqlite3");
  _db = new Database(DB_PATH);

  // === WAL Mode: permits concurrent reads from multiple processes ===
  _db.pragma("journal_mode = WAL");
  _db.pragma("synchronous = NORMAL");
  _db.pragma("foreign_keys = ON");

  // Create table if not exists
  _db.exec(`
    CREATE TABLE IF NOT EXISTS project_index (
      path         TEXT PRIMARY KEY,
      data         TEXT NOT NULL,
      last_updated INTEGER NOT NULL,
      ttl          INTEGER NOT NULL DEFAULT ${DEFAULT_TTL}
    )
  `);

  return _db;
}

// ============================================
// PUBLIC API — same signatures as before
// ============================================

/**
 * Get cached index for a directory.
 * Returns null if not found or expired.
 */
export function getCachedIndex(
  directory: string,
  ttl = DEFAULT_TTL
): IndexResult | null {
  try {
    const db = getDb();
    const row = db
      .prepare(
        "SELECT data, last_updated, ttl FROM project_index WHERE path = ?"
      )
      .get(directory) as
      | { data: string; last_updated: number; ttl: number }
      | undefined;

    if (!row) return null;

    // Check TTL — use the provided ttl parameter for expiry check
    const age = Date.now() - row.last_updated;
    const effectiveTtl = ttl ?? row.ttl;
    if (age > effectiveTtl) {
      // Expired — delete and return null
      db.prepare("DELETE FROM project_index WHERE path = ?").run(directory);
      return null;
    }

    return JSON.parse(row.data) as IndexResult;
  } catch {
    // If SQLite fails (e.g., missing binary), degrade gracefully to null
    return null;
  }
}

/**
 * Store index in the SQLite cache.
 * Uses UPSERT (INSERT OR REPLACE) for idempotency.
 */
export function setCachedIndex(
  directory: string,
  index: IndexResult,
  ttl = DEFAULT_TTL
): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT OR REPLACE INTO project_index (path, data, last_updated, ttl)
       VALUES (?, ?, ?, ?)`
    ).run(directory, JSON.stringify(index), Date.now(), ttl);
  } catch {
    // Degrade gracefully — cache miss on next read, but no crash
  }
}

/**
 * Invalidate cache for a specific directory.
 */
export function invalidateIndex(directory: string): void {
  try {
    getDb().prepare("DELETE FROM project_index WHERE path = ?").run(directory);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all cached indices.
 */
export function clearCache(): void {
  try {
    getDb().prepare("DELETE FROM project_index").run();
  } catch {
    // Ignore errors
  }
}

/**
 * Get cache statistics.
 * Preserves the original return shape for compatibility with server.ts.
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
  oldest: number | null;
} {
  try {
    const db = getDb();
    const rows = db
      .prepare("SELECT path, last_updated FROM project_index ORDER BY last_updated ASC")
      .all() as { path: string; last_updated: number }[];

    return {
      size: rows.length,
      entries: rows.map((r) => r.path),
      oldest: rows.length > 0 ? rows[0].last_updated : null,
    };
  } catch {
    return { size: 0, entries: [], oldest: null };
  }
}