/**
 * Fuzzy Matching Module - Fix Intelligence Layer
 * Levenshtein distance-based fuzzy matching for finding similar symbols
 */

import { SimilarSymbol } from "./types.js";

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Calculate similarity score (0-1) based on Levenshtein distance
 */
export function calculateLevenshteinSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1; // both empty
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
  return 1 - distance / maxLen;
}

/**
 * Find similar symbols using fuzzy matching
 */
export function findSimilarSymbols(
  candidates: Array<{ name: string; location: string }>,
  target: string,
  threshold: number = 2
): SimilarSymbol[] {
  // Calculate Levenshtein distance for each candidate
  const scored = candidates
    .map((candidate) => {
      const distance = levenshteinDistance(
        target.toLowerCase(),
        candidate.name.toLowerCase()
      );
      return { candidate, distance };
    })
    .filter(({ distance }) => distance <= threshold);

  // Calculate similarity score and sort by score descending
  return scored
    .map(({ candidate, distance }) => {
      const maxLen = Math.max(target.length, candidate.name.length);
      const score = maxLen === 0 ? 1 : 1 - distance / maxLen;
      return {
        name: candidate.name,
        score,
        location: candidate.location,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

/**
 * Rank matches by similarity score
 */
export function rankBySimilarity(matches: SimilarSymbol[]): SimilarSymbol[] {
  return [...matches].sort((a, b) => b.score - a.score).slice(0, 5);
}
