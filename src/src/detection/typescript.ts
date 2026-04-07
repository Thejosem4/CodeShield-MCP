/**
 * TypeScript Detection Engine
 *
 * Extiende JavaScript con detección de:
 * - Tipos básicos de TypeScript (string, number, boolean, etc.)
 * - Interfaces y types
 * - Generics
 * - Decorators
 */

import type { Issue } from "./index.js";
import { detectJSIssues } from "./javascript.js";

// Tipos básicos de TypeScript
const TS_BUILTIN_TYPES = new Set([
  "string", "number", "boolean", "void", "null", "undefined", "any",
  "unknown", "never", "object", "symbol", "bigint",
  // Literals
  "true", "false",
  // Arrays
  "string[]", "number[]", "boolean[]", "any[]", "object[]",
  // Utility types
  "Partial", "Required", "Readonly", "Pick", "Omit", "Record",
  "Exclude", "Extract", "NonNullable", "ReturnType", "Parameters",
  "ConstructorParameters", "InstanceType", "ThisParameterType", "OmitThisParameter",
]);

// Palabras reservadas de TypeScript
const TS_KEYWORDS = new Set([
  // TypeScript specific
  "type", "interface", "enum", "namespace", "module", "declare",
  "abstract", "implements", "extends", "public", "private", "protected",
  "readonly", "override", "as", "is", "asserts", "satisfies",
  "keyof", "typeof", "infer", "in", "out", "readonly",
  // JavaScript keywords (also valid in TS)
  "break", "case", "catch", "continue", "debugger", "default", "delete",
  "do", "else", "finally", "for", "function", "if", "in", "instanceof",
  "new", "return", "switch", "this", "throw", "try", "typeof", "var",
  "void", "while", "with", "class", "const", "enum", "export", "import",
  "super", "yield", "async", "await", "of", "true", "false", "null",
  "undefined",
]);

/**
 * Detectar errors de sintaxis específicos de TypeScript
 */
function detectTSSyntaxErrors(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Ignorar comentarios
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return;
    }

    // Detectar errors de generics mal cerrados: Array<number
    const genericOpen = (trimmed.match(/</g) || []).length;
    const genericClose = (trimmed.match(/>/g) || []).length;
    if (genericOpen > 0 && genericClose > 0 && genericOpen !== genericClose) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: `Generics desbalanceados: ${genericOpen} '<' vs ${genericClose} '>'`,
        suggestion: null,
      });
    }

    // Detectar type annotations mal formadas
    // Variable: x: string (no debe tener espacio extra antes del :)
    const badTypeAnnotation = trimmed.match(/:\s{2,}/);
    if (badTypeAnnotation) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Type annotation mal formada: demasiado espacio antes de ':'",
        suggestion: null,
      });
    }

    // Detectar interfaces mal declaradas
    const interfaceMatch = trimmed.match(/^interface\s+(\w+)/);
    if (interfaceMatch) {
      // La interfaz debe tener { o extender otra interfaz
      if (!trimmed.includes("{") && !trimmed.includes("extends")) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "syntax_error",
          message: `Interface '${interfaceMatch[1]}' debe tener cuerpo '{...}' o extender otra interfaz`,
          suggestion: null,
        });
      }
    }

    // Detectar types mal declarados
    const typeMatch = trimmed.match(/^type\s+(\w+)\s*=/);
    if (typeMatch) {
      // El type debe tener = y una definición
      if (!trimmed.includes("=") || trimmed.endsWith("=")) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "syntax_error",
          message: `Type '${typeMatch[1]}' debe tener una definición después de '='`,
          suggestion: null,
        });
      }
    }

    // Detectar enums mal declarados
    const enumMatch = trimmed.match(/^enum\s+(\w+)/);
    if (enumMatch) {
      if (!trimmed.includes("{")) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "syntax_error",
          message: `Enum '${enumMatch[1]}' debe tener cuerpo '{...}'`,
          suggestion: null,
        });
      }
    }
  });

  return issues;
}

/**
 * Detectar issues específicas de TypeScript
 */
function detectTSIssues(code: string): Issue[] {
  const issues: Issue[] = [];

  // Detectar errores de sintaxis de TypeScript
  issues.push(...detectTSSyntaxErrors(code));

  // Detectar uso de 'any' (warning, no error)
  const lines = code.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Uso de : any explícito
    if (/\b:\s*any\b/.test(trimmed) && !trimmed.includes("//")) {
      // Solo warn, no es error
      const match = trimmed.match(/(\w+)\s*:\s*any/);
      if (match && !trimmed.startsWith("//")) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "typescript_warning",
          message: `Uso de ': any' detectado. Considera usar 'unknown' para mejor type safety`,
          suggestion: null,
        });
      }
    }
  });

  return issues;
}

/**
 * Función principal para verificar código TypeScript
 */
export function verifyTypeScript(code: string): Issue[] {
  const issues: Issue[] = [];

  // Primero verificar como JavaScript (issues de JS también aplican)
  issues.push(...detectJSIssues(code));

  // Luego agregar issues específicas de TypeScript
  issues.push(...detectTSIssues(code));

  return issues;
}
