/**
 * CodeShield AST Analyzer — Causalidad Semántica
 *
 * Analiza el diff a nivel de símbolos para detectar cuando un import o función
 * fue eliminado/renombrado, y agrupa todos los errores derivados bajo una "Causa Raíz".
 *
 * Implementación ligera basada en regex avanzados (sin AST completo) para
 * mantener la filosofía stateless y la velocidad <100ms del motor.
 */

import type { Issue } from "./index.js";

// ============================================
// TYPES
// ============================================

export interface RootCause {
  symbol: string;
  action: "deleted" | "renamed" | "missing_import";
  original_line: number;
  cascading_impact: string;
  affected_issue_count: number;
  suggested_fix: string;
}

export interface TriageResult {
  summary: {
    total_issues: number;
    critical: number;
    warnings: number;
    info: number;
    root_causes: number;
    suppressed_by_diff: number;
    truncated: boolean;
    truncated_message?: string;
  };
  instruction_for_agent?: string;
  root_causes: RootCause[];
  issues_by_priority: Issue[];
}

// ============================================
// SYMBOL DETECTION PATTERNS
// ============================================

/**
 * Patrones de imports indexados por tipo de captura.
 * Cada entrada describe: [regex global, función transformadora del grupo capturado → string[]]
 *
 * IMPORTANTE: Los grupos de captura deben capturar los NOMBRES de los símbolos,
 * no la ruta del módulo ('from "./auth"' captura './auth', NO los símbolos).
 */
type ImportExtractor = {
  pattern: RegExp;
  extractNames: (match: RegExpExecArray) => string[];
};

const IMPORT_EXTRACTORS: ImportExtractor[] = [
  {
    // JS/TS destructured: import { foo, bar as b } from '...'  →  captura "foo, bar as b"
    pattern: /^import\s+\{([^}]+)\}\s+from\s+['"][^'"]+['"]/gm,
    extractNames: (m) =>
      m[1]
        .split(",")
        .map((s) => s.trim().replace(/\s+as\s+\w+/, "").trim())
        .filter((s) => /^[\w$]+$/.test(s)),
  },
  {
    // JS/TS default/namespace: import foo from '...'  OR  import * as foo from '...'
    // Note: must come AFTER destructured pattern (more specific first)
    pattern: /^import\s+(?:\*\s+as\s+)?(\w+)\s+from\s+['"][^'"]+['"]/gm,
    extractNames: (m) => (/^[\w$]+$/.test(m[1]) ? [m[1]] : []),
  },
  {
    // Python: from module import foo, bar
    pattern: /^from\s+\S+\s+import\s+(.+)/gm,
    extractNames: (m) =>
      m[1]
        .split(",")
        .map((s) => s.trim().replace(/\s+as\s+\w+/, "").trim())
        .filter((s) => /^[\w_]+$/.test(s)),
  },
  {
    // Python: import os  /  import os.path
    pattern: /^import\s+([\w.]+)/gm,
    extractNames: (m) => {
      // Capture only the top-level name (import os.path → "os")
      const top = m[1].split(".")[0];
      return top && /^[\w_]+$/.test(top) ? [top] : [];
    },
  },
  {
    // Rust: use std::collections::HashMap;  →  extract "HashMap" (last segment)
    // Also handles: use std::sync::{Arc, Mutex};  →  extracts "Arc", "Mutex"
    pattern: /^use\s+([\w:{}\s,]+);/gm,
    extractNames: (m) => {
      const raw = m[1];
      // Handle grouped imports: std::sync::{Arc, Mutex}
      const braceMatch = /\{([^}]+)\}/.exec(raw);
      if (braceMatch) {
        return braceMatch[1]
          .split(",")
          .map((s) => s.trim())
          .filter((s) => /^[\w]+$/.test(s));
      }
      // Single path: take only the last :: segment
      const segments = raw.split("::");
      const last = segments[segments.length - 1].trim();
      return last && /^[\w]+$/.test(last) ? [last] : [];
    },
  },
  {
    // Go: import "fmt" / import "net/http"  →  extracts last path segment
    pattern: /^import\s+"([\w/.-]+)"/gm,
    extractNames: (m) => {
      const segments = m[1].split("/");
      const pkg = segments[segments.length - 1].trim();
      return pkg && /^[\w]+$/.test(pkg) ? [pkg] : [];
    },
  },
];

/** Detecta funciones/clases eliminadas */
const FUNCTION_PATTERNS = [
  // JS/TS: function foo / const foo = / export function foo
  /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+([\w$]+)/g,
  // JS/TS: const foo = () =>
  /(?:^|\n)\s*(?:export\s+)?const\s+([\w$]+)\s*=\s*(?:async\s*)?\(/g,
  // Python: def foo(
  /(?:^|\n)\s*(?:async\s+)?def\s+([\w_]+)\s*\(/g,
  // Python: class Foo
  /(?:^|\n)\s*class\s+([\w_]+)/g,
];

// ============================================
// HELPERS
// ============================================

/**
 * Extrae los nombres de símbolos visibles (imports + definiciones) de un bloque de código.
 * Itera GLOBALMENTE sobre todas las líneas de imports, no solo la primera.
 */
function extractSymbols(code: string): Set<string> {
  const symbols = new Set<string>();

  // === Extract from imports (global iteration — catches ALL import lines) ===
  for (const { pattern, extractNames } of IMPORT_EXTRACTORS) {
    // Reset lastIndex before using global regex
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(code)) !== null) {
      for (const name of extractNames(match)) {
        symbols.add(name);
      }
    }
  }

  // === Extract from function/class definitions ===
  for (const pattern of FUNCTION_PATTERNS) {
    let match: RegExpExecArray | null;
    const re = new RegExp(pattern.source, "gm");
    while ((match = re.exec(code)) !== null) {
      if (match[1]) symbols.add(match[1]);
    }
  }

  return symbols;
}

/**
 * Encuentra la línea donde se encontraba el símbolo en el código original.
 */
function findSymbolLine(symbol: string, code: string): number {
  const lines = code.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(symbol)) {
      return i + 1; // 1-indexed
    }
  }
  return 1;
}

/**
 * Cuenta cuántos issues hacen referencia a un símbolo dado.
 */
function countCascadingIssues(symbol: string, issues: Issue[]): Issue[] {
  return issues.filter(
    (issue) =>
      issue.message.toLowerCase().includes(symbol.toLowerCase()) ||
      (issue.suggestion ?? "").toLowerCase().includes(symbol.toLowerCase())
  );
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

/**
 * Analiza causalidad semántica:
 * 1. Detecta símbolos eliminados entre original y nuevo código
 * 2. Agrupa issues en cascada bajo una RootCause
 * 3. Aplica triage adaptativo con hard-cap de 5 root causes
 *
 * @param originalCode    — Código previo en disco (puede ser vacío)
 * @param newCode         — Código propuesto por el LLM
 * @param filteredIssues  — Issues ya filtrados por diff-engine (solo líneas afectadas)
 * @param suppressedCount — Número de issues suprimidos por el diff quirúrgico
 */
export function analyzeCausality(
  originalCode: string,
  newCode: string,
  filteredIssues: Issue[],
  suppressedCount: number = 0
): TriageResult {
  const MAX_ROOT_CAUSES = 5;

  // 1. Detectar símbolos que desaparecieron del original al nuevo
  const originalSymbols = extractSymbols(originalCode);
  const newSymbols = extractSymbols(newCode);

  const deletedSymbols = [...originalSymbols].filter(
    (s) => !newSymbols.has(s)
  );

  // 2. Construir root causes para símbolos eliminados
  const rootCauses: RootCause[] = [];

  for (const symbol of deletedSymbols) {
    const cascading = countCascadingIssues(symbol, filteredIssues);
    if (cascading.length === 0) continue; // No cascading impact — skip

    const originalLine = findSymbolLine(symbol, originalCode);

    rootCauses.push({
      symbol,
      action: "deleted",
      original_line: originalLine,
      cascading_impact: `La eliminación de '${symbol}' ha roto ${cascading.length} referencia(s) en el código propuesto.`,
      affected_issue_count: cascading.length,
      suggested_fix: `Vuelve a definir/importar '${symbol}' o actualiza todas sus referencias con el nuevo nombre.`,
    });
  }

  // 3. Sort root causes by impact (descending)
  rootCauses.sort((a, b) => b.affected_issue_count - a.affected_issue_count);

  // 4. Hard-cap at MAX_ROOT_CAUSES
  const truncatedRootCauses = rootCauses.slice(0, MAX_ROOT_CAUSES);
  const isTruncated = rootCauses.length > MAX_ROOT_CAUSES;

  // 5. Sort issues by severity: critical → warning → info
  const severityOrder: Record<string, number> = {
    critical: 0,
    warning: 1,
    info: 2,
  };
  const sortedIssues = [...filteredIssues].sort(
    (a, b) =>
      (severityOrder[a.severity] ?? 2) - (severityOrder[b.severity] ?? 2)
  );

  // 6. Build summary
  const critical = filteredIssues.filter((i) => i.severity === "critical").length;
  const warnings = filteredIssues.filter((i) => i.severity === "warning").length;
  const info = filteredIssues.filter((i) => i.severity === "info").length;

  const hasCascade = rootCauses.length > 0 && rootCauses[0].affected_issue_count > 1;

  const result: TriageResult = {
    summary: {
      total_issues: filteredIssues.length,
      critical,
      warnings,
      info,
      root_causes: truncatedRootCauses.length,
      suppressed_by_diff: suppressedCount,
      truncated: isTruncated,
      truncated_message: isTruncated
        ? `Se han ocultado ${rootCauses.length - MAX_ROOT_CAUSES} causas raíz adicionales para proteger la ventana de contexto del LLM. Corrige las ${MAX_ROOT_CAUSES} causas mostradas primero.`
        : undefined,
    },
    instruction_for_agent: hasCascade
      ? `Has provocado un error en cascada. Arregla la causa raíz '${rootCauses[0].symbol}' para resolver los ${rootCauses[0].affected_issue_count} errores derivados.`
      : filteredIssues.length > 0
      ? `Se encontraron ${filteredIssues.length} issue(s). Revisa los errores críticos primero.`
      : undefined,
    root_causes: truncatedRootCauses,
    issues_by_priority: sortedIssues,
  };

  return result;
}
