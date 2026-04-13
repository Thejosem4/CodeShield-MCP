/**
 * JavaScript Detection Engine
 *
 * Detects hallucinations in JavaScript code by verifying:
 * - Stdlib modules and functions (console, Math, JSON, etc.)
 * - Common typos in methods
 * - Syntax errors (unbalanced brackets, quotes)
 */

import type { Issue, ImportInfo } from "./index.js";

// JavaScript Stdlib
export const JS_STDLIB: Record<string, Set<string>> = {
  console: new Set(["log", "error", "warn", "info", "debug", "trace", "group", "groupEnd", "time", "timeEnd", "clear"]),
  Math: new Set([
    "floor", "ceil", "round", "abs", "sqrt", "pow", "max", "min", "random",
    "sin", "cos", "tan", "log", "exp", "PI", "E", "LN2", "LN10", "SQRT2",
    "clz32", "fround", "imul", "sign", "trunc", "atan2", "log10", "log2",
  ]),
  JSON: new Set(["parse", "stringify", "valid", "Raw"]),
  Array: new Set([
    "push", "pop", "shift", "unshift", "slice", "splice", "map", "filter",
    "reduce", "reduceRight", "find", "findIndex", "includes", "indexOf",
    "lastIndexOf", "every", "some", "sort", "reverse", "join", "concat",
    "length", "isArray", "forEach", "fill", "copyWithin", "entries", "keys", "values",
    "findLast", "findLastIndex", "toSorted", "toReversed", "with", "at",
  ]),
  Object: new Set([
    "keys", "values", "entries", "assign", "create", "freeze", "seal",
    "isFrozen", "isSealed", "defineProperty", "defineProperties", "getOwnPropertyDescriptor",
    "getOwnPropertyNames", "getPrototypeOf", "setPrototypeOf", "hasOwnProperty",
    "isPrototypeOf", "propertyIsEnumerable", "toString", "valueOf", "fromEntries",
  ]),
  String: new Set([
    "split", "trim", "trimStart", "trimEnd", "replace", "replaceAll", "match",
    "matchAll", "search", "slice", "substring", "substr", "toLowerCase",
    "toUpperCase", "charAt", "charCodeAt", "codePointAt", "concat", "endsWith",
    "startsWith", "includes", "indexOf", "lastIndexOf", "padStart", "padEnd",
    "repeat", "normalize", "localeCompare",
  ]),
  Map: new Set(["set", "get", "has", "delete", "size", "clear", "entries", "keys", "values", "forEach"]),
  Set: new Set(["add", "has", "delete", "size", "clear", "entries", "keys", "values", "forEach", "union", "intersection", "difference"]),
  Promise: new Set(["then", "catch", "finally", "resolve", "reject", "all", "allSettled", "race", "any"]),
  Date: new Set(["now", "parse", "UTC", "getDate", "getDay", "getFullYear", "getHours", "getMilliseconds", "getMinutes", "getMonth", "getSeconds", "getTime", "getTimezoneOffset"]),
  Number: new Set(["MAX_VALUE", "MIN_VALUE", "NaN", "NEGATIVE_INFINITY", "POSITIVE_INFINITY", "isNaN", "isFinite", "parseInt", "parseFloat", "toFixed", "toPrecision", "toExponential"]),
  Boolean: new Set(["toString", "valueOf"]),
  RegExp: new Set(["source", "flags", "global", "ignoreCase", "multiline", "lastIndex", "test", "exec"]),
  Function: new Set(["length", "name", "prototype", "apply", "call", "bind", "toString"]),
  Symbol: new Set(["for", "keyFor", "iterator", "asyncIterator", "hasInstance", "isConcatSpreadable", "match", "replace", "search", "split", "toStringTag", "unscopables"]),
  BigInt: new Set(["asIntN", "asUintN", "toLocaleString", "toString", "valueOf"]),
  Proxy: new Set(["revocable"]),
  WeakMap: new Set(["set", "get", "has", "delete"]),
  WeakSet: new Set(["add", "has", "delete"]),
  WeakRef: new Set(["deref"]),
  Error: new Set(["name", "message", "toString"]),
  TypeError: new Set(["name", "message"]),
  ReferenceError: new Set(["name", "message"]),
  SyntaxError: new Set(["name", "message"]),
  RangeError: new Set(["name", "message"]),
  // Node.js fs Promise-based methods
  fs: new Set(["readFile", "writeFile", "appendFile", "readdir", "mkdir", "rm", "rmdir", "access", "stat", "lstat", "readlink", "symlink", "copyFile", "unlink", "rename", "truncate", "open", "close", "read", "write"]),
  path: new Set(["join", "resolve", "normalize", "dirname", "basename", "extname", "relative", "isAbsolute", "parse", "format", "sep", "delimiter", "POSIX", "win32"]),
  util: new Set(["types", "inspect", "format", "promisify", "callbackify", "deprecate", "textEncoder", "textDecoder"]),
  events: new Set(["on", "once", "emit", "addListener", "removeListener", "removeAllListeners", "listenerCount", "listenerLogs"]),
  stream: new Set(["pipe", "on", "once", "destroy", "cork", "uncork", "read", "write", "push", "pull"]),
  http: new Set(["request", "get", "Server", "createServer", "Agent", "getAgent"]),
  https: new Set(["request", "get", "createServer", "createServer", "Agent", "getAgent"]),
};

// Known JavaScript typos
export const JS_TYPOS: Record<string, Record<string, string>> = {
  console: { logg: "log", errror: "error", warng: "warn", infor: "info" },
  array: {
    lenght: "length", getItem: "at", removeItem: "splice",
    sumArray: "reduce", countArray: "filter", map_items: "map",
    findLast_: "findLast", toSorted_: "toSorted", toReversed_: "toReversed",
    getFirst: "at(0)", getLast: "at(-1)",
  },
  string: { lengh: "length", charAt_: "charAt", subStr: "substr" },
  object: { keys_: "keys", values_: "values", entries_: "entries" },
  math: { sqrtt: "sqrt", poww: "pow", abbbs: "abs" },
  json: { stringfy: "stringify", parsee: "parse" },
  promise: { theen: "then", cathch: "catch" },
};

// Keywords de JavaScript
const JS_KEYWORDS = new Set([
  "break", "case", "catch", "continue", "debugger", "default", "delete",
  "do", "else", "finally", "for", "function", "if", "in", "instanceof",
  "new", "return", "switch", "this", "throw", "try", "typeof", "var",
  "void", "while", "with", "class", "const", "enum", "export", "extends",
  "import", "super", "implements", "interface", "let", "package", "private",
  "protected", "public", "static", "yield", "async", "await", "of",
  "true", "false", "null", "undefined",
]);

// Common global functions
const GLOBAL_FUNCTIONS = new Set([
  "console", "Math", "JSON", "Date", "Number", "Boolean", "String", "Object",
  "Array", "Function", "Symbol", "BigInt", "Map", "Set", "WeakMap", "WeakSet",
  "Proxy", "Reflect", "Promise", "Error", "TypeError", "ReferenceError",
  "SyntaxError", "RangeError", "parseInt", "parseFloat", "isNaN", "isFinite",
  "encodeURI", "decodeURI", "encodeURIComponent", "decodeURIComponent",
  "eval", "setTimeout", "setInterval", "clearTimeout", "clearInterval",
  "require", "module", "exports", "process", "Buffer", "setImmediate",
  "queueMicrotask", "structuredClone", "atob", "btoa",
]);

/**
 * Extraer imports de código JavaScript
 * Soporta: import x from 'module', import { x } from 'module', require('module')
 */
export function extractJSImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // import x from 'module'
    const defaultMatch = trimmed.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultMatch) {
      imports.push({
        name: defaultMatch[1],
        alias: null,
        from_module: defaultMatch[2],
        is_from: true,
        line: idx + 1,
      });
      return;
    }

    // import { x, y } from 'module'
    const namedMatch = trimmed.match(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
    if (namedMatch) {
      const names = namedMatch[1].split(",").map((n) => n.trim().split(" as ")[0]);
      names.forEach((name) => {
        // Escape regex metacharacters to prevent injection
        const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const aliasRegex = new RegExp(`^${escapedName}(?:\\s+as\\s+(\\w+))?$`);
        const aliasMatch = namedMatch[1].match(aliasRegex);
        imports.push({
          name,
          alias: aliasMatch?.[1] || null,
          from_module: namedMatch[2],
          is_from: true,
          line: idx + 1,
        });
      });
      return;
    }

    // import * as x from 'module'
    const namespaceMatch = trimmed.match(/^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (namespaceMatch) {
      imports.push({
        name: namespaceMatch[1],
        alias: null,
        from_module: namespaceMatch[2],
        is_from: true,
        line: idx + 1,
      });
      return;
    }

    // require('module') o const x = require('module')
    const requireMatch = trimmed.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      imports.push({
        name: requireMatch[1],
        alias: null,
        from_module: null,
        is_from: false,
        line: idx + 1,
      });
      return;
    }

    // CommonJS: const { x } = require('module')
    const destructureRequire = trimmed.match(/const\s+\{([^}]+)\}\s+=\s+require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (destructureRequire) {
      const names = destructureRequire[1].split(",").map((n) => n.trim());
      names.forEach((name) => {
        imports.push({
          name,
          alias: null,
          from_module: destructureRequire[2],
          is_from: true,
          line: idx + 1,
        });
      });
    }
  });

  return imports;
}

/**
 * Detectar typos en código JavaScript
 */
function detectJSTypos(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    // Detectar typos conocidos
    for (const obj of Object.keys(JS_TYPOS)) {
      const typos = JS_TYPOS[obj] as Record<string, string>;
      for (const [typo, correction] of Object.entries(typos)) {
        if (line.includes(typo)) {
          issues.push({
            line: idx + 1,
            code_snippet: line.trim(),
            error_type: "typo",
            message: `Posible typo '${typo}' - ¿quisiste decir '${correction}'?`,
            suggestion: correction,
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Detectar errores de sintaxis básicos en JavaScript
 */
function detectJSSyntaxErrors(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Ignorar comentarios y strings
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return;
    }

    // Paréntesis desbalanceados
    const openParen = (trimmed.match(/\(/g) || []).length;
    const closeParen = (trimmed.match(/\)/g) || []).length;
    if (Math.abs(openParen - closeParen) > 1) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Paréntesis desbalanceados",
        suggestion: null,
      });
    }

    // Llaves desbalanceadas
    const openBrace = (trimmed.match(/\{/g) || []).length;
    const closeBrace = (trimmed.match(/\}/g) || []).length;
    if (Math.abs(openBrace - closeBrace) > 0) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Llaves desbalanceadas",
        suggestion: null,
      });
    }

    // Corchetes desbalanceados
    const openBracket = (trimmed.match(/\[/g) || []).length;
    const closeBracket = (trimmed.match(/\]/g) || []).length;
    if (Math.abs(openBracket - closeBracket) > 0) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Corchetes desbalanceados",
        suggestion: null,
      });
    }

    // Comillas simples desbalanceadas
    const singleQuotes = (trimmed.match(/'/g) || []).length;
    const doubleQuotes = (trimmed.match(/"/g) || []).length;
    const backticks = (trimmed.match(/`/g) || []).length;

    // Template literals should have matching backticks
    if (backticks % 2 !== 0 && backticks > 0) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Backticks desbalanceados",
        suggestion: null,
      });
    }
  });

  return issues;
}

/**
 * Verificar si un módulo es built-in de JavaScript
 */
export function isBuiltinModule(module: string): boolean {
  // Built-in globals
  if (GLOBAL_FUNCTIONS.has(module)) return true;

  // Node.js built-in modules
  const nodeModules = new Set([
    "fs", "path", "os", "http", "https", "url", "querystring", "util",
    "events", "stream", "buffer", "crypto", "assert", "process",
    "child_process", "cluster", "dgram", "dns", "domain", "net", "tls",
    "tty", "datagram", "string_decoder", "sys", "timers", "vm", "zlib",
    "readline", "repl", "perf_hooks", "v8", "noder", "context_",
  ]);

  return nodeModules.has(module);
}

/**
 * Verificar si una función existe en el stdlib de JavaScript
 */
export function isStdlibFunction(module: string, func: string): boolean {
  // Special case: methods called directly on primitives or globals
  if (JS_STDLIB[module]) {
    return JS_STDLIB[module].has(func);
  }

  // Check global objects
  if (module === "globalThis" || module === "window" || module === "global") {
    return GLOBAL_FUNCTIONS.has(func) || JS_STDLIB[func] !== undefined;
  }

  return false;
}

/**
 * Detectar todas las issues en código JavaScript
 */
export function detectJSIssues(code: string): Issue[] {
  const issues: Issue[] = [];

  // Detectar errores de sintaxis
  issues.push(...detectJSSyntaxErrors(code));
  issues.push(...detectJSTypos(code));

  // Detectar uso de métodos inexistentes en objetos globales
  const lines = code.split("\n");
  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Match: console.something( o Math.something( o JSON.something(
    const globalMethodMatch = trimmed.match(/\b(console|Math|JSON|Object|Array|String|Number|Boolean|Symbol|Map|Set|Promise|Date|RegExp|Error)\.(\w+)\s*\(/);
    if (globalMethodMatch) {
      const obj = globalMethodMatch[1];
      const method = globalMethodMatch[2];

      if (JS_STDLIB[obj] && !JS_STDLIB[obj].has(method)) {
        // Check for typos
        let suggestion: string | null = null;
        for (const [typo, correction] of Object.entries(JS_TYPOS[obj.toLowerCase()] || {})) {
          if (method.includes(typo)) {
            suggestion = correction;
            break;
          }
        }

        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "method_not_found",
          message: `'${obj}.${method}' no es un método válido`,
          suggestion,
        });
      }
    }
  });

  return issues;
}

/**
 * Función principal para verificar código JavaScript
 */
export function verifyJavaScript(code: string): Issue[] {
  return detectJSIssues(code);
}

/**
 * Aplicar correcciones de typos en código JavaScript
 */
export function fixJavaScript(code: string): string {
  let fixed = code;

  for (const [obj, typos] of Object.entries(JS_TYPOS)) {
    for (const [typo, correction] of Object.entries(typos as Record<string, string>)) {
      // Use regex with case-insensitive flag to handle JSON vs json, etc.
      // Match object.typo where obj matches case-insensitively
      const escapedTypo = typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match the object name case-insensitively followed by . and the typo
      const pattern = new RegExp(`${obj}\\.${escapedTypo}`, 'gi');
      fixed = fixed.replace(pattern, `${obj}.${correction}`);
    }
  }

  return fixed;
}
