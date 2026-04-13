/**
 * Pattern Extraction Module for Fix Intelligence Layer
 *
 * Finds similar code patterns in the project to help suggest fixes
 * based on existing code patterns.
 */

import * as fs from "fs";
import * as path from "path";
import type { Issue, CodePattern } from "./types.js";
import { getCachedIndex } from "../cache.js";

/**
 * Find similar code patterns in the project
 */
export function findSimilarCode(projectPath: string, issue: Issue): CodePattern[] {
  if (!projectPath) {
    return [];
  }

  try {
    // 1. Try to get cached index from project
    const cachedIndex = getCachedIndex(projectPath);
    if (!cachedIndex) {
      return [];
    }

    const { classes, functions, methods } = cachedIndex;

    // 2. Extract key terms from the issue message
    const keywords = extractKeywords(issue.message);

    // 3. Search for matching patterns in indexed content
    const matches: CodePattern[] = [];

    // Search through classes for matches
    for (const cls of classes) {
      const clsText = cls.toLowerCase();
      let relevance = 0;

      // Check keyword matches
      for (const keyword of keywords) {
        if (clsText.includes(keyword.toLowerCase())) {
          relevance += 0.25;
        }
      }

      if (relevance > 0.2) {
        matches.push({
          snippet: `class ${cls}`,
          location: cls,
          relevance: Math.min(relevance, 0.95),
        });
      }
    }

    // Search through functions for matches
    for (const fn of functions) {
      const fnText = fn.toLowerCase();
      let relevance = 0;

      for (const keyword of keywords) {
        if (fnText.includes(keyword.toLowerCase())) {
          relevance += 0.25;
        }
      }

      if (relevance > 0.2) {
        matches.push({
          snippet: `function ${fn}`,
          location: fn,
          relevance: Math.min(relevance, 0.95),
        });
      }
    }

    // Search through methods for matches
    for (const [className, methodList] of Object.entries(methods)) {
      for (const method of methodList) {
        const methodText = method.toLowerCase();
        let relevance = 0;

        for (const keyword of keywords) {
          if (methodText.includes(keyword.toLowerCase())) {
            relevance += 0.25;
          }
        }

        // Bonus if class name also matches
        if (className.toLowerCase().includes(keywords[0] || "")) {
          relevance += 0.1;
        }

        if (relevance > 0.2) {
          matches.push({
            snippet: `${className}.${method}`,
            location: `${className}:${method}`,
            relevance: Math.min(relevance, 0.95),
          });
        }
      }
    }

    // 4. Sort by relevance and return top 3
    matches.sort((a, b) => b.relevance - a.relevance);
    return matches.slice(0, 3);

  } catch {
    return [];
  }
}

/**
 * Extract code snippet from a file around a specific line
 */
export function extractCodeSnippet(
  file: string,
  line: number,
  contextLines: number = 3
): string {
  try {
    const absolutePath = path.resolve(file);
    const content = fs.readFileSync(absolutePath, "utf-8");
    const lines = content.split("\n");

    const startLine = Math.max(0, line - contextLines - 1);
    const endLine = Math.min(lines.length, line + contextLines);

    const snippetLines: string[] = [];
    for (let i = startLine; i < endLine; i++) {
      const lineNum = i + 1;
      const prefix = lineNum === line ? ">>> " : "    ";
      snippetLines.push(`${prefix}${lineNum}: ${lines[i]}`);
    }

    return snippetLines.join("\n");

  } catch {
    return "";
  }
}

/**
 * Calculate relevance of a snippet to an issue
 */
export function calculateRelevance(snippet: string, issue: Issue): number {
  try {
    // 1. Extract keywords from issue.message
    const keywords = extractKeywords(issue.message);
    const snippetLower = snippet.toLowerCase();

    let score = 0;

    // 2. Count keyword matches
    for (const keyword of keywords) {
      if (snippetLower.includes(keyword.toLowerCase())) {
        score += 0.2;
      }
    }

    // 3. Check for similar method names or patterns
    // Extract potential identifiers from issue
    const identifierPatterns = /(?:variable|function|method|class|function|const|let|var)\s+(\w+)/gi;
    let match;
    while ((match = identifierPatterns.exec(issue.message)) !== null) {
      const identifier = match[1].toLowerCase();
      if (snippetLower.includes(identifier)) {
        score += 0.25;
      }
    }

    // 4. Normalize and return 0-1 score
    return Math.min(score, 1.0);

  } catch {
    return 0;
  }
}

/**
 * Extract meaningful keywords from text
 */
function extractKeywords(text: string): string[] {
  // Remove common stop words and extract significant terms
  const stopWords = new Set([
    "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could",
    "should", "may", "might", "must", "shall", "can", "need", "dare",
    "to", "of", "in", "for", "on", "with", "at", "by", "from", "as",
    "into", "through", "during", "before", "after", "above", "below",
    "between", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "each", "few",
    "more", "most", "other", "some", "such", "no", "nor", "not",
    "only", "own", "same", "so", "than", "too", "very", "just",
    "and", "but", "if", "or", "because", "as", "until", "while",
    "this", "that", "these", "those", "it", "its", "they", "their",
    "what", "which", "who", "whom", "undefined", "null", "error",
    "issue", "problem", "warning", "fix", "bug", "code", "line",
  ]);

  // Extract words (alphanumeric sequences)
  const words = text.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];

  // Filter and return significant keywords
  return words
    .filter((word) => word.length > 2 && !stopWords.has(word.toLowerCase()))
    .filter((word, index, arr) => arr.indexOf(word) === index) // unique
    .slice(0, 10); // limit to top 10
}

/**
 * Try to read a file safely
 */
function tryReadFile(filePath: string): string | null {
  try {
    const absolutePath = path.resolve(filePath);
    return fs.readFileSync(absolutePath, "utf-8");
  } catch {
    return null;
  }
}
