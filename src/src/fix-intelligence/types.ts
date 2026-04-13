// types.ts - Fix Intelligence Layer types

export type FixType = "direct" | "fuzzy" | "pattern" | "fallback";

export interface Issue {
  type: string;
  severity: string;
  line: number;
  message: string;
  suggestion?: string;
}

export interface DeepFixInput {
  code: string;
  language: string;
  issues: Issue[];
  project_path?: string;
  mode: "safe" | "suggest" | "full";
}

export interface DeepFixResult {
  suggestions: FixSuggestion[];
  failed_issues: Issue[];
  confidence: number;
  processing_time_ms: number;
}

export interface FixSuggestion {
  original_issue: Issue;
  type: FixType;
  confidence: number;

  direct?: {
    suggestion: string;
    source: "stdlib" | "project";
    location: string;
  };

  fuzzy?: {
    suggestion: string;
    alternatives: Array<{
      name: string;
      score: number;
      location: string;
    }>;
  };

  pattern?: {
    suggestion: string;
    based_on: string;
    snippet: string;
  };

  fallback?: {
    message: string;
    stdlib_hint?: string;
    project_hint?: string;
  };
}

export interface ProjectSymbol {
  name: string;
  type: string;
  location: string;
  frequency: number;
}

export interface StdlibSymbol {
  name: string;
  module: string;
  methods: string[];
  location: string;
}

export interface SimilarSymbol {
  name: string;
  score: number;
  location: string;
}

export interface CodePattern {
  snippet: string;
  location: string;
  relevance: number;
}
