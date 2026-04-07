/**
 * CodeShield Cache System
 *
 * Sistema de cache en memoria para índices de proyectos.
 * Persiste entre llamadas MCP dentro del mismo proceso.
 */

import type { IndexResult } from "./detection/index.js";

interface CacheEntry {
  index: IndexResult;
  timestamp: number;
  ttl: number; // milliseconds
}

// Default TTL: 5 minutes
const DEFAULT_TTL = 5 * 60 * 1000;

// In-memory cache
const indexCache = new Map<string, CacheEntry>();

/**
 * Get cached index for a directory
 */
export function getCachedIndex(
  directory: string,
  ttl = DEFAULT_TTL
): IndexResult | null {
  const entry = indexCache.get(directory);

  if (!entry) {
    return null;
  }

  // Check if expired
  const age = Date.now() - entry.timestamp;
  if (age > ttl) {
    indexCache.delete(directory);
    return null;
  }

  return entry.index;
}

/**
 * Store index in cache
 */
export function setCachedIndex(
  directory: string,
  index: IndexResult,
  ttl = DEFAULT_TTL
): void {
  indexCache.set(directory, {
    index,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Invalidate cache for a specific directory
 */
export function invalidateIndex(directory: string): void {
  indexCache.delete(directory);
}

/**
 * Clear all cached indices
 */
export function clearCache(): void {
  indexCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  size: number;
  entries: string[];
  oldest: number | null;
} {
  const entries = Array.from(indexCache.keys());
  let oldest: number | null = null;

  for (const entry of indexCache.values()) {
    if (oldest === null || entry.timestamp < oldest) {
      oldest = entry.timestamp;
    }
  }

  return {
    size: indexCache.size,
    entries,
    oldest,
  };
}