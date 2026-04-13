/**
 * CodeShield Verification Engine
 *
 * API unificada para MCP que delega a los detection modules existentes.
 * No reimplementa lógica - usa detection/*.ts como fuente de verdad.
 *
 * Core principles:
 * 1. Speed first - must be < 100ms for typical code
 * 2. Zero external dependencies for basic checks
 * 3. Actionable suggestions - not just "error", but "fix: ..."
 * 4. Delegates to detection modules - not a separate implementation
 */

// Unified Issue type for MCP responses
export type IssueType = "syntax" | "typo" | "import" | "function" | "logic" | "security";
export type Severity = "critical" | "warning" | "info";

export interface Issue {
  type: IssueType;
  severity: Severity;
  line: number;
  column?: number;
  message: string;
  suggestion?: string;
  code?: string;
  similar_suggestions?: string[];
}

export interface VerificationResult {
  issues: Issue[];
  stats: {
    lines_checked: number;
    issues_found: number;
    verification_time_ms: number;
    language: string;
  };
}

export interface FixSuggestion {
  original: string;
  fixed: string;
  explanation: string;
  position: { line: number; column: number };
}

// ============================================
// IMPORTS FROM DETECTION MODULES
// ============================================

import {
  verifyJavaScript,
  fixJavaScript,
  extractJSImports,
  isBuiltinModule as isJSBuiltinModule,
} from "../detection/javascript.js";

import {
  verifyTypeScript,
  fixTypeScript,
} from "../detection/typescript.js";

import {
  detectRustIssues,
  verifyRust,
  fixRust,
  parseRustImports,
  isRustStdlib,
} from "../detection/rust.js";

import {
  detectGoIssues,
  parseGoImports,
  GO_STDLIB,
} from "../detection/go.js";

import {
  detectReactIssues,
  verifyReact,
  parseReactImports,
} from "../detection/react.js";

import {
  detectAngularIssues,
  parseAngularImports,
} from "../detection/angular.js";

import {
  verifyCode as verifyPyCode,
} from "../detection/index.js";

// ============================================
// INTERNAL TYPES FROM DETECTION (used for conversion)
// ============================================

interface DetectionIssue {
  line: number;
  code_snippet: string;
  error_type: string;
  message: string;
  suggestion: string | null;
}

interface DetectionImportInfo {
  name: string;
  alias: string | null;
  from_module: string | null;
  is_from: boolean;
  line: number;
}

interface DetectionImportInfoGo {
  name: string;
  alias: string | null;
  from_module: string | null;
  is_from: boolean;
  line: number;
  importType: "builtin" | "stdlib" | "external";
}

interface DetectionImportInfoReact {
  name: string;
  alias: string | null;
  from_module: string | null;
  is_from: boolean;
  line: number;
  importType: string;
}

// ============================================
// ISSUE TYPE CONVERTER
// ============================================

/**
 * Convert detection issue format to unified Issue format
 */
function toUnifiedIssue(detectionIssue: DetectionIssue): Issue {
  const errorType = detectionIssue.error_type;

  const typeMap: Record<string, IssueType> = {
    typo: "typo",
    method_not_found: "function",
    syntax_error: "syntax",
    module_not_found: "import",
    import_error: "import",
  };

  const severityMap: Record<string, Severity> = {
    typo: "warning",
    method_not_found: "warning",
    syntax_error: "critical",
    module_not_found: "warning",
    import_error: "warning",
  };

  return {
    type: typeMap[errorType] || "syntax",
    severity: severityMap[errorType] || "warning",
    line: detectionIssue.line,
    message: detectionIssue.message,
    suggestion: detectionIssue.suggestion || undefined,
  };
}

// ============================================
// LANGUAGE-SPECIFIC VERIFIERS
// ============================================

/**
 * Verify JavaScript code using the JS detection module
 */
function verifyJS(code: string): Issue[] {
  const issues = verifyJavaScript(code);
  return issues.map(toUnifiedIssue);
}

/**
 * Verify TypeScript code using the TS detection module
 */
function verifyTS(code: string): Issue[] {
  const issues = verifyTypeScript(code);
  return issues.map(i => toUnifiedIssue(i as unknown as DetectionIssue));
}

/**
 * Verify Python code using the Python detection module
 */
function verifyPython(code: string): Issue[] {
  const issues = verifyPyCode(code);
  return issues.map(i => toUnifiedIssue(i as unknown as DetectionIssue));
}

/**
 * Verify Rust code using the Rust detection module
 */
function verifyRustFn(code: string): Issue[] {
  const issues = detectRustIssues(code);
  return issues.map(i => toUnifiedIssue(i as unknown as DetectionIssue));
}

/**
 * Verify Go code using the Go detection module
 */
function verifyGo(code: string): Issue[] {
  const issues = detectGoIssues(code);
  return issues.map(i => toUnifiedIssue(i as unknown as DetectionIssue));
}

/**
 * Verify React code using the React detection module
 */
function verifyReactFn(code: string): Issue[] {
  const issues = detectReactIssues(code);
  return issues.map(i => toUnifiedIssue(i as unknown as DetectionIssue));
}

/**
 * Verify Angular code using the Angular detection module
 */
function verifyAngularFn(code: string): Issue[] {
  const issues = detectAngularIssues(code);
  return issues.map(i => toUnifiedIssue(i as unknown as DetectionIssue));
}

// ============================================
// IMPORT INTERFACE (unified)
// ============================================

interface Import {
  path: string;
  imported: string[];
  default?: string;
  line: number;
  is_external: boolean;
}

// ============================================
// IMPORT EXTRACTION
// ============================================

function extractImports(code: string, language: string): Import[] {
  switch (language.toLowerCase()) {
    case "javascript":
    case "js":
    case "jsx":
    case "mjs": {
      const imports = extractJSImports(code) as DetectionImportInfo[];
      return imports.map(i => ({
        path: i.from_module || i.name,
        imported: i.from_module ? [i.name] : [],
        default: i.alias || (i.is_from ? i.name : undefined),
        line: i.line,
        is_external: !i.from_module?.startsWith("."),
      }));
    }
    case "typescript":
    case "ts":
    case "tsx":
    case "mts": {
      const imports = extractJSImports(code) as DetectionImportInfo[];
      return imports.map(i => ({
        path: i.from_module || i.name,
        imported: i.from_module ? [i.name] : [],
        default: i.alias || (i.is_from ? i.name : undefined),
        line: i.line,
        is_external: !i.from_module?.startsWith("."),
      }));
    }
    case "python":
    case "py": {
      // Python detection module doesn't export extractImports
      return [];
    }
    case "rust":
    case "rs": {
      const imports = parseRustImports(code) as DetectionImportInfo[];
      return imports.map(i => ({
        path: i.from_module || i.name,
        imported: i.from_module ? [i.name] : [],
        default: i.alias || (i.is_from ? i.name : undefined),
        line: i.line,
        is_external: !i.from_module?.startsWith("."),
      }));
    }
    case "go":
    case "golang": {
      const imports = parseGoImports(code) as DetectionImportInfoGo[];
      return imports.map(i => ({
        path: i.from_module || i.name,
        imported: i.from_module ? [i.name] : [],
        default: i.alias || (i.is_from ? i.name : undefined),
        line: i.line,
        is_external: i.importType === "stdlib" || i.importType === "builtin",
      }));
    }
    case "react":
    case "reactjs": {
      const imports = parseReactImports(code) as DetectionImportInfoReact[];
      return imports.map(i => ({
        path: i.from_module || i.name,
        imported: i.from_module ? [i.name] : [],
        default: i.alias || (i.is_from ? i.name : undefined),
        line: i.line,
        is_external: !i.from_module?.startsWith("."),
      }));
    }
    case "angular":
    case "ng": {
      const imports = parseAngularImports(code) as DetectionImportInfo[];
      return imports.map(i => ({
        path: i.from_module || i.name,
        imported: i.from_module ? [i.name] : [],
        default: i.alias || (i.is_from ? i.name : undefined),
        line: i.line,
        is_external: !i.from_module?.startsWith("."),
      }));
    }
    default:
      return [];
  }
}

// ============================================
// MAIN VERIFICATION FUNCTION
// ============================================

const languageVerifiers: Record<string, (code: string) => Issue[]> = {
  javascript: verifyJS,
  js: verifyJS,
  jsx: verifyJS,
  mjs: verifyJS,
  typescript: verifyTS,
  ts: verifyTS,
  tsx: verifyTS,
  mts: verifyTS,
  python: verifyPython,
  py: verifyPython,
  rust: verifyRustFn,
  rs: verifyRustFn,
  go: verifyGo,
  golang: verifyGo,
  react: verifyReactFn,
  reactjs: verifyReactFn,
  angular: verifyAngularFn,
  ng: verifyAngularFn,
};

/**
 * Verify code for common issues
 * Fast and local - no external API calls
 * Delegates to the appropriate detection module
 */
export function verifyCode(
  code: string,
  language: string,
  _options?: { checkLevel?: "fast" | "standard" | "thorough" }
): VerificationResult {
  const startTime = Date.now();
  const normalizedLang = language.toLowerCase();
  const verifier = languageVerifiers[normalizedLang];

  if (!verifier) {
    return {
      issues: [{
        type: "syntax" as IssueType,
        severity: "warning" as Severity,
        line: 1,
        message: `Language "${language}" not supported. Supported: ${Object.keys(languageVerifiers).join(", ")}`,
        suggestion: undefined,
      }],
      stats: {
        lines_checked: code.split("\n").length,
        issues_found: 1,
        verification_time_ms: Date.now() - startTime,
        language,
      },
    };
  }

  const issues = verifier(code);

  return {
    issues,
    stats: {
      lines_checked: code.split("\n").length,
      issues_found: issues.length,
      verification_time_ms: Date.now() - startTime,
      language,
    },
  };
}

/**
 * Get fix suggestion for an issue
 */
export function getFix(
  code: string,
  language: string,
  issue: Issue
): FixSuggestion | null {
  const lines = code.split("\n");
  const line = lines[issue.line - 1] || "";

  if (issue.suggestion) {
    return {
      original: line,
      fixed: line,
      explanation: issue.suggestion,
      position: { line: issue.line, column: issue.column || 1 },
    };
  }

  return null;
}

/**
 * Check imports - verify they exist in stdlib or project
 */
export function checkImports(
  code: string,
  language: string,
  _projectPath?: string
): { valid: Import[]; invalid: Import[]; hallucinations: Import[] } {
  const imports = extractImports(code, language);

  const valid: Import[] = [];
  const invalid: Import[] = [];

  for (const imp of imports) {
    if (imp.is_external) {
      let isBuiltin = false;

      switch (language.toLowerCase()) {
        case "javascript":
        case "js":
        case "jsx":
        case "mjs":
          isBuiltin = isJSBuiltinModule(imp.path);
          break;
        case "typescript":
        case "ts":
        case "tsx":
        case "mts":
          // TS uses JS builtins
          isBuiltin = isJSBuiltinModule(imp.path);
          break;
        case "python":
        case "py":
          // Python builtins not available here
          isBuiltin = false;
          break;
        case "rust":
        case "rs":
          isBuiltin = isRustStdlib(imp.path);
          break;
        case "go":
        case "golang":
          // GO_STDLIB is Record<string, Set<string>>
          isBuiltin = imp.path in GO_STDLIB;
          break;
        case "react":
        case "reactjs":
        case "angular":
        case "ng":
          // These frameworks have many external packages
          isBuiltin = false;
          break;
      }

      if (isBuiltin) {
        valid.push(imp);
      } else {
        invalid.push(imp);
      }
    } else {
      valid.push(imp);
    }
  }

  return { valid, invalid, hallucinations: [] };
}

/**
 * Quick fix - apply automatic fixes for common issues
 */
export function quickFix(
  code: string,
  language: string,
  _autoApply: string[] = []
): { original: string; fixed: string; applied: string[]; skipped: string[] } {
  const applied: string[] = [];
  const skipped: string[] = [];
  let fixed = code;

  switch (language.toLowerCase()) {
    case "javascript":
    case "js":
    case "jsx":
    case "mjs": {
      const result = fixJavaScript(code);
      if (result !== code) {
        fixed = result;
        applied.push("typos");
      }
      break;
    }
    case "typescript":
    case "ts":
    case "tsx":
    case "mts": {
      const result = fixTypeScript(code);
      if (result !== code) {
        fixed = result;
        applied.push("typos");
      }
      break;
    }
    default:
      skipped.push("language_not_supported");
  }

  return { original: code, fixed, applied, skipped };
}

/**
 * Suggest a fix based on an issue
 */
export function suggestFix(
  code: string,
  language: string,
  issue: { line: number; message: string; suggestion?: string }
): FixSuggestion | null {
  return getFix(code, language, {
    type: "syntax",
    severity: "warning",
    line: issue.line,
    message: issue.message,
    suggestion: issue.suggestion,
  });
}
