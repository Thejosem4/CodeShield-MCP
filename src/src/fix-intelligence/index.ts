/**
 * Fix Intelligence Layer - Public API
 *
 * Main entry point for MCP tools to access deep fix analysis.
 */

import { FixIntelligenceEngine } from "./engine.js";
import type { DeepFixInput, DeepFixResult, FixSuggestion, FixType } from "./types.js";

/**
 * Main entry point for deep fix analysis
 * Takes issues from verify_code and returns enriched suggestions
 */
export function deepFix(input: DeepFixInput): DeepFixResult {
  const engine = new FixIntelligenceEngine(input.project_path);
  return engine.analyze(input);
}

// Re-export types for consumers
export type {
  DeepFixInput,
  DeepFixResult,
  FixSuggestion,
  FixType,
  Issue,
  ProjectSymbol,
  StdlibSymbol,
  SimilarSymbol,
  CodePattern,
} from "./types.js";