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
import { detectJSIssues, fixJavaScript } from "./javascript.js";

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
  "Awaited", "infer", "typeof", "keyof",
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
 * Detectar enum sin miembros o mal cerrado
 */
function detectEnumIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");
  const enumRegex = /^enum\s+(\w+)/g;
  let match;

  while ((match = enumRegex.exec(code)) !== null) {
    const enumName = match[1];
    const startPos = match.index;
    const afterEnum = code.slice(startPos);
    const lineStart = code.lastIndexOf("\n", startPos);
    const lineNum = code.slice(0, startPos).split("\n").length;

    // Buscar el cuerpo del enum
    const bodyMatch = afterEnum.match(/^enum\s+\w+\s*\{([^}]*)\}/s);
    if (bodyMatch) {
      const members = bodyMatch[1].trim();
      // Enum sin miembros
      if (members === "") {
        issues.push({
          line: lineNum,
          code_snippet: lines[lineNum - 1].trim(),
          error_type: "syntax_error",
          message: `Enum '${enumName}' no tiene miembros`,
          suggestion: null,
        });
      }
    } else {
      // Enum sin cierre }
      const lineContent = lines[lineNum - 1].trim();
      if (!lineContent.includes("{")) {
        issues.push({
          line: lineNum,
          code_snippet: lineContent,
          error_type: "syntax_error",
          message: `Enum '${enumName}' debe tener cuerpo '{...}'`,
          suggestion: null,
        });
      }
    }
  }

  return issues;
}

/**
 * Detectar namespace vacío
 */
function detectNamespaceIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");
  const namespaceRegex = /^namespace\s+(\w+)/g;
  let match;

  while ((match = namespaceRegex.exec(code)) !== null) {
    const nsName = match[1];
    const startPos = match.index;
    const afterNs = code.slice(startPos);
    const lineNum = code.slice(0, startPos).split("\n").length;

    // Verificar si tiene cuerpo
    const bodyMatch = afterNs.match(/^namespace\s+\w+\s*\{([^}]*)\}/s);
    if (bodyMatch) {
      const body = bodyMatch[1].trim();
      // Namespace sin exports ni contenido
      if (body === "" || !body.includes("export")) {
        issues.push({
          line: lineNum,
          code_snippet: lines[lineNum - 1].trim(),
          error_type: "syntax_error",
          message: `Namespace '${nsName}' está vacío o no tiene exports`,
          suggestion: null,
        });
      }
    }
  }

  return issues;
}

/**
 * Detectar declare module sin cuerpo
 */
function detectDeclareModuleIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");
  const declareModuleRegex = /^declare\s+module\s+(['"]?\w+['"]?)/g;
  let match;

  while ((match = declareModuleRegex.exec(code)) !== null) {
    const moduleName = match[1];
    const startPos = match.index;
    const afterDeclare = code.slice(startPos);
    const lineNum = code.slice(0, startPos).split("\n").length;

    // Verificar si tiene cuerpo
    const bodyMatch = afterDeclare.match(/^declare\s+module\s+['"]?\w+['"]?\s*\{([^}]*)\}/s);
    if (!bodyMatch) {
      const lineContent = lines[lineNum - 1].trim();
      issues.push({
        line: lineNum,
        code_snippet: lineContent,
        error_type: "syntax_error",
        message: `declare module '${moduleName}' debe tener cuerpo '{...}'`,
        suggestion: null,
      });
    }
  }

  return issues;
}

/**
 * Detectar imports mal formados de TypeScript
 */
function detectMalformedImports(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Import sin from o con from mal formado
    const importMatch = trimmed.match(/^import\s+(?!type\s)(.*?)\s+from\s+['"][^'"]*$/);
    if (importMatch) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Import mal formado: falta closing quote en el path",
        suggestion: null,
      });
    }

    // Type-only import sin闭合
    const typeImportMatch = trimmed.match(/^import\s+type\s+.*[^'"]$/);
    if (typeImportMatch) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "type import mal formado",
        suggestion: null,
      });
    }

    // Export sin destino válido
    const badExportMatch = trimmed.match(/^export\s+(?!interface|type|class|enum|function|const|let|var)[^=]+$/);
    if (badExportMatch && !trimmed.includes("from") && !trimmed.includes("{")) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Export mal formado",
        suggestion: null,
      });
    }
  });

  return issues;
}

/**
 * Detectar uso de `any` en contextos peligrosos (parámetros de funciones públicas)
 */
function detectUnsafeAny(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  // Detectar funciones públicas con parámetros : any
  const publicFnRegex = /^\s*(?:export\s+)?(?:public\s+)?function\s+\w+\s*\([^)]*:\s*any[^)]*\)/gm;
  let match;

  while ((match = publicFnRegex.exec(code)) !== null) {
    const lineNum = code.slice(0, match.index).split("\n").length;
    const lineContent = lines[lineNum - 1].trim();

    issues.push({
      line: lineNum,
      code_snippet: lineContent,
      error_type: "type_safety_warning",
      message: "Parámetro con 'any' en función pública - considerar usar 'unknown'",
      suggestion: null,
    });
  }

  // También detectar en métodos de clase pública
  const publicMethodRegex = /^\s*(?:export\s+)?(?:public\s+)?\w+\s*\([^)]*:\s*any[^)]*\)\s*{/gm;
  while ((match = publicMethodRegex.exec(code)) !== null) {
    const lineNum = code.slice(0, match.index).split("\n").length;
    const lineContent = lines[lineNum - 1].trim();

    issues.push({
      line: lineNum,
      code_snippet: lineContent,
      error_type: "type_safety_warning",
      message: "Parámetro con 'any' en método público - considerar usar 'unknown'",
      suggestion: null,
    });
  }

  return issues;
}

/**
 * Detectar non-null assertion (!) en contextos problemáticos
 */
function detectNonNullAssertion(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // ! al final de variable en asignación a variable mutable
    const nonNullAssignment = trimmed.match(/(\w+)\s*=\s*(\w+)!/);
    if (nonNullAssignment && (trimmed.includes("let") || trimmed.includes("var"))) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "type_safety_warning",
        message: `Non-null assertion (!) en contexto mutable puede causar runtime errors`,
        suggestion: "Considera usar verificación explícita o optional chaining (?.)",
      });
    }

    // ! en property que podría no estar inicializada
    if (trimmed.includes("!") && trimmed.includes("this.")) {
      const propMatch = trimmed.match(/this\.(\w+)\s*=/);
      if (propMatch) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "type_safety_warning",
          message: `Property '${propMatch[1]}' usa non-null assertion - considerar initializer o constructor`,
          suggestion: null,
        });
      }
    }
  });

  return issues;
}

/**
 * Detectar generic defaults mal formados
 */
function detectGenericDefaultIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Generic default sin = o con > mal posicionado
    const badGenericDefault = trimmed.match(/<\w+:\s*\w+\s*>/);
    if (badGenericDefault) {
      // Verificar si es default mal formado (debería ser <T = Default>)
      const hasDefault = trimmed.match(/<\w+\s*=/);
      if (!hasDefault) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "syntax_error",
          message: "Generic constraint mal formado, use 'extends' en lugar de ':'",
          suggestion: null,
        });
      }
    }

    // Multiple generics con defaults mal puestos
    const multiGenericBad = trimmed.match(/<\w+,\s*\w+\s*=\s*[^,>]+>/);
    if (multiGenericBad) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Generic default debe ir al final del último parámetro",
        suggestion: null,
      });
    }
  });

  return issues;
}

/**
 * Detectar errors de sintaxis específicos de TypeScript
 */
function detectTSSyntaxErrors(code: string): Issue[] {
  const issues: Issue[] = [];

  // Detectar enums sin miembros o mal cerrados
  issues.push(...detectEnumIssues(code));

  // Detectar namespaces vacíos
  issues.push(...detectNamespaceIssues(code));

  // Detectar declare module sin cuerpo
  issues.push(...detectDeclareModuleIssues(code));

  // Detectar imports mal formados
  issues.push(...detectMalformedImports(code));

  // Detectar generic defaults mal formados
  issues.push(...detectGenericDefaultIssues(code));

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
    if (genericOpen !== genericClose) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Generics desbalanceados",
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

  // Detectar uso de 'any' en contextos peligrosos
  issues.push(...detectUnsafeAny(code));

  // Detectar non-null assertion (!) en contextos problemáticos
  issues.push(...detectNonNullAssertion(code));

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

/**
 * Aplicar correcciones de typos en código TypeScript
 * Extiende la corrección de JavaScript
 */
export function fixTypeScript(code: string): string {
  return fixJavaScript(code); // Hereda JS fixes
}
