/**
 * Fix Intelligence Layer - Engine Module
 *
 * Main orchestration module that coordinates all lookup modules
 * to produce enriched fix suggestions.
 */

import type { DeepFixInput, DeepFixResult, FixSuggestion, FixType, Issue, SimilarSymbol, CodePattern } from "./types.js";
import { searchProjectIndex, searchStdlib, getSymbolLocation } from "./lookup.js";
import { findSimilarSymbols, calculateLevenshteinSimilarity } from "./fuzzy.js";
import { findSimilarCode, extractCodeSnippet } from "./pattern.js";

/**
 * FixIntelligenceEngine - orchestrates all lookup modules
 */
export class FixIntelligenceEngine {
  private projectPath?: string;

  constructor(projectPath?: string) {
    this.projectPath = projectPath;
  }

  /**
   * Analyze issues and return enriched suggestions
   */
  analyze(input: DeepFixInput): DeepFixResult {
    const startTime = Date.now();
    const suggestions: FixSuggestion[] = [];
    const failedIssues: Issue[] = [];

    for (const issue of input.issues) {
      const suggestion = this.processIssue(issue, input.code, input.language);
      if (suggestion) {
        suggestions.push(suggestion);
      } else {
        failedIssues.push(issue);
      }
    }

    const avgConfidence = suggestions.length > 0
      ? suggestions.reduce((sum, s) => sum + s.confidence, 0) / suggestions.length
      : 0;

    return {
      suggestions,
      failed_issues: failedIssues,
      confidence: Math.round(avgConfidence),
      processing_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Process a single issue through the fix intelligence pipeline
   */
  private processIssue(issue: Issue, code: string, language: string): FixSuggestion | null {
    // Extract potential symbol name from the issue message
    const symbolName = this.extractSymbolName(issue.message);

    // STEP 0: Check known typos first
    const typoFix = this.checkKnownTypos(symbolName, language);
    if (typoFix) {
      return {
        original_issue: issue,
        type: "direct",
        confidence: 95,
        direct: {
          suggestion: typoFix.correct,
          source: "stdlib",
          location: `known typo correction: ${symbolName} -> ${typoFix.correct}`,
        },
      };
    }

    // STEP 1: Try direct match in project index
    const projectMatches = searchProjectIndex(symbolName, this.projectPath);
    if (projectMatches.length > 0) {
      return this.createDirectSuggestion(issue, "project", projectMatches[0].name, projectMatches[0].location);
    }

    // STEP 2: Try direct match in stdlib
    const stdlibMatches = searchStdlib(symbolName, language);
    if (stdlibMatches.length > 0) {
      return this.createDirectSuggestion(issue, "stdlib", stdlibMatches[0].name, stdlibMatches[0].location);
    }

    // STEP 3: Try fuzzy matching
    // Build candidates from project + stdlib
    const candidates = this.buildCandidates(language);
    const fuzzyMatches = findSimilarSymbols(candidates, symbolName, 3);
    if (fuzzyMatches.length > 0) {
      return this.createFuzzySuggestion(issue, fuzzyMatches);
    }

    // STEP 4: Try pattern extraction
    const patterns = findSimilarCode(this.projectPath || "", issue);
    if (patterns.length > 0) {
      return this.createPatternSuggestion(issue, patterns[0]);
    }

    // STEP 5: Fallback
    return this.createFallbackSuggestion(issue);
  }

  /**
   * Extract potential symbol name from issue message
   * e.g., "console.logg" -> "logg", "array.getItem" -> "getItem"
   */
  private extractSymbolName(message: string): string {
    // Handle common patterns like obj.method
    const match = message.match(/\.([a-zA-Z_][a-zA-Z0-9_]*)$/);
    if (match) {
      return match[1];
    }
    // Otherwise return the whole message
    return message;
  }

  /**
   * Build candidate list from project and stdlib for fuzzy matching
   */
  private buildCandidates(language: string): Array<{ name: string; location: string }> {
    const candidates: Array<{ name: string; location: string }> = [];

    // Add stdlib candidates
    const stdlibSymbols = searchStdlib("", language);
    for (const sym of stdlibSymbols) {
      candidates.push({ name: sym.name, location: sym.location });
    }

    return candidates;
  }

  /**
   * Check for known typos using the detection module typo data
   * Returns the correct symbol if found, null otherwise
   */
  private checkKnownTypos(symbolName: string, language: string): { correct: string; source: string } | null {
    // Common typos hardcoded for now
    const commonTypos: Record<string, Record<string, string>> = {
      javascript: {
        logg: "log",
        errror: "error",
        warng: "warn",
        infor: "info",
        lenght: "length",
        lengh: "length",
      },
      typescript: {
        logg: "log",
        errror: "error",
      },
    };

    const langTypos = commonTypos[language.toLowerCase()];
    if (langTypos && langTypos[symbolName.toLowerCase()]) {
      return { correct: langTypos[symbolName.toLowerCase()], source: "typo_fix" };
    }

    return null;
  }

  /**
   * Create a DIRECT type suggestion
   */
  private createDirectSuggestion(issue: Issue, source: "stdlib" | "project", suggestion: string, location: string): FixSuggestion {
    return {
      original_issue: issue,
      type: "direct",
      confidence: source === "project" ? 95 : 90,
      direct: { suggestion, source, location },
    };
  }

  /**
   * Create a FUZZY type suggestion
   */
  private createFuzzySuggestion(issue: Issue, matches: SimilarSymbol[]): FixSuggestion {
    return {
      original_issue: issue,
      type: "fuzzy",
      confidence: Math.round(matches[0].score * 100),
      fuzzy: {
        suggestion: matches[0].name,
        alternatives: matches.slice(0, 5).map(m => ({
          name: m.name,
          score: m.score,
          location: m.location,
        })),
      },
    };
  }

  /**
   * Create a PATTERN type suggestion
   */
  private createPatternSuggestion(issue: Issue, pattern: CodePattern): FixSuggestion {
    return {
      original_issue: issue,
      type: "pattern",
      confidence: Math.round(pattern.relevance * 70),
      pattern: {
        suggestion: "Similar code found in project",
        based_on: pattern.location,
        snippet: pattern.snippet,
      },
    };
  }

  /**
   * Create a FALLBACK type suggestion
   */
  private createFallbackSuggestion(issue: Issue): FixSuggestion {
    return {
      original_issue: issue,
      type: "fallback",
      confidence: 25,
      fallback: {
        message: "Could not find a direct suggestion",
        stdlib_hint: "Try checking the standard library documentation",
        project_hint: "No similar code found in the project",
      },
    };
  }
}