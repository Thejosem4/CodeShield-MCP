/**
 * Go Detection Engine
 *
 * Detects hallucinations in Go code by verifying:
 * - Stdlib packages and functions (fmt, os, io, etc.)
 * - Common typos in function names and keywords
 * - Syntax errors (unbalanced braces, parentheses)
 */

import type { Issue, ImportInfo } from "./index.js";

// Go Stdlib packages with their functions
export const GO_STDLIB: Record<string, Set<string>> = {
  fmt: new Set([
    "Print", "Printf", "Println", "Sprint", "Sprintf", "Sprintln",
    "Fprint", "Fprintf", "Fprintln", "Errorf", "Scan", "Scanf", "Scanln",
    "Sscan", "Sscanf", "Sscanln", "Fscan", "Fscanf", "Fscanln",
  ]),
  os: new Set([
    "Open", "Create", "Mkdir", "Remove", "Rename", "Stat", "Getwd",
    "Getenv", "Setenv", "Exit", "Hostname", "Getpid", "Getuid",
    "Stdin", "Stdout", "Stderr", "Args", "Environ", "Exit",
  ]),
  io: new Set([
    "Read", "Write", "Copy", "Close", "Seek", "Reader", "Writer",
    "ReadFull", "WriteString", "Pipe", "PipeReader", "PipeWriter",
    "LimitReader", "MultiReader", "MultiWriter", "SectionReader",
  ]),
  strings: new Set([
    "Contains", "ContainsAny", "HasPrefix", "HasSuffix", "Index", "Join",
    "Replace", "Split", "ToLower", "ToUpper", "Trim", "NewReader",
    "NewBuilder", "Map", "Repeat", "ReplaceAll", "SplitAfter", "Title",
    "ToLowerSpecial", "ToUpperSpecial", "TrimLeft", "TrimRight",
    "TrimSpace", "TrimPrefix", "TrimSuffix",
  ]),
  strconv: new Set([
    "Atoi", "Itoa", "FormatBool", "FormatInt", "FormatUint", "FormatFloat",
    "ParseBool", "ParseInt", "ParseUint", "ParseFloat", "Quote", "QuoteToASCII",
    "Unquote", "AppendBool", "AppendInt", "AppendUint", "AppendFloat",
  ]),
  time: new Set([
    "Now", "Sleep", "Duration", "Parse", "Format", "Date", "Unix",
    "Since", "Until", "NewTimer", "NewTicker", "Tick", "ParseInLocation",
    "DateTime", "DateOnly", "TimeOnly", "Monday", "Tuesday", "Wednesday",
    "Thursday", "Friday", "Saturday", "Sunday",
  ]),
  json: new Set([
    "Marshal", "Unmarshal", "NewDecoder", "NewEncoder", "Valid",
    "Compact", "Indent", "MarshalIndent", "Decoder", "Encoder",
    "MarshalJSON", "UnmarshalJSON",
  ]),
  errors: new Set([
    "New", "Is", "As", "Unwrap", "Register", "Unwrap",
  ]),
  sync: new Set([
    "Mutex", "RWMutex", "WaitGroup", "Once", "Pool", "Map",
    "NewMutex", "NewRWMutex", "Cond", "NewCond",
  ]),
  context: new Set([
    "Background", "TODO", "WithCancel", "WithTimeout", "WithValue",
    "WithDeadline", "WithCancelCause", "Cause", "CancelCauseFunc",
  ]),
  http: new Set([
    "Get", "Post", "ListenAndServe", "HandleFunc", "DefaultServeMux",
    "NewRequest", "Client", "DefaultClient", "ServeHTTP", "Handle",
    "StripPrefix", "NotFoundHandler", "Redirect", "NotModified",
  ]),
  flag: new Set([
    "Parse", "Bool", "Int", "String", "FlagSet", "NFlag", "Args",
    "Visit", "VisitAll", "Usage", "ErrorHandling", "ContinueOnError",
    "ExitOnError", "Passthrough",
  ]),
  log: new Set([
    "Print", "Printf", "Println", "Fatal", "Fatalf", "Fatalln",
    "Panic", "Panicf", "Panicln", "SetOutput", "SetPrefix", "SetFlags",
    "Writer", "Default", "New",
  ]),
  // Additional common packages
  bytes: new Set([
    "NewBuffer", "NewBufferString", "Buffer", "Reader", "Compare",
    "Contains", "Equal", "HasPrefix", "HasSuffix", "Index", "Join",
    "Map", "Repeat", "Replace", "Split", "ToLower", "ToUpper",
  ]),
  path: new Set([
    "Join", "Split", "Dir", "Base", "Ext", "Clean", "Abs",
    "Rel", "Walk", "Match", "IsAbs", "Separator",
  ]),
  "path/filepath": new Set([
    "Join", "Split", "Dir", "Base", "Ext", "Clean", "Abs",
    "Rel", "Walk", "Match", "IsAbs", "Glob", "Glob",
  ]),
  bufio: new Set([
    "NewReader", "NewWriter", "NewScanner", "Reader", "Writer", "Scanner",
    "ReadByte", "ReadBytes", "ReadString", "ReadLine", "ReadSlice",
    "WriteByte", "WriteBytes", "WriteString", "Flush",
  ]),
  math: new Set([
    "Abs", "Acos", "Asin", "Atan", "Atan2", "Ceil", "Cos", "Exp",
    "Floor", "Inf", "IsNaN", "IsInf", "Log", "Log10", "Log2", "Max",
    "Min", "Mod", "NaN", "Pow", "Pow10", "Round", "Sin", "Sqrt",
    "Tan", "Trunc",
  ]),
  sort: new Set([
    "Strings", "Ints", "Float64s", "Search", "SearchInts", "SearchFloat64s",
    "SearchStrings", "Slice", "SliceStable", "IsSorted", "Reverse",
  ]),
  "unicode": new Set([
    "IsLetter", "IsLower", "IsUpper", "IsTitle", "IsDigit", "IsControl",
    "IsMark", "IsPunct", "IsSpace", "IsGraphic", "IsPrint", "ToLower", "ToUpper",
  ]),
  "container/list": new Set([
    "New", "Element", "List", "Init", "Len", "Less", "Swap", "PushFront",
    "PushBack", "PopFront", "PopBack", "Front", "Back", "InsertBefore",
    "InsertAfter", "MoveToFront", "MoveToBack", "MoveBefore", "MoveAfter",
    "Remove", "PushFrontList", "PushBackList",
  ]),
};

// Common Go typos
export const GO_TYPOS: Record<string, Record<string, string>> = {
  fmt: {
    printf_: "Printf",
    printfn: "Printf",
  },
  os: {
    openn: "Open",
    opne: "Open",
    open_: "Open",
    creat: "Create",
    create_: "Create",
    mkdri: "Mkdir",
    mkdir_: "Mkdir",
  },
  make: {
    mkae: "make",
    mak: "make",
    maek: "make",
  },
  append: {
    appned: "append",
    appen: "append",
    apend: "append",
  },
  len: {
    lenn: "len",
    lenght: "len",
    lengh: "len",
  },
  cap: {
    cpp: "cap",
    capp: "cap",
  },
  close: {
    clsoe: "close",
    clos: "close",
  },
  new: {
    neww: "new",
    ne: "new",
  },
  iota: {
    itoa: "iota",
    iotaa: "iota",
    iota_: "iota",
  },
  defer: {
    deferr: "defer",
    defrr: "defer",
  },
  goroutine: {
    gouroutine: "go",
    gorutine: "go",
    goroutine_: "go",
  },
  channel: {
    chanel: "chan",
    channnel: "chan",
    channel_: "chan",
  },
  interface: {
    interace: "interface",
    inteface: "interface",
    interfce: "interface",
  },
  struct: {
    strut: "struct",
    stuct: "struct",
    structt: "struct",
  },
  error: {
    errror: "error",
    err: "error",
    erro: "error",
  },
};

// Go keywords
const GO_KEYWORDS = new Set([
  "break", "case", "chan", "const", "continue", "default", "defer",
  "else", "fallthrough", "for", "func", "go", "goto", "if", "import",
  "interface", "map", "package", "range", "return", "select", "struct",
  "switch", "type", "var", "true", "false", "nil", "iota",
]);

// Built-in functions in Go
const GO_BUILTINS = new Set([
  "append", "cap", "close", "complex", "copy", "delete", "imag", "len",
  "make", "new", "panic", "print", "println", "real", "recover",
]);

/**
 * Parse Go imports
 * Supports: import "package", import p "package", import ( "package" )
 */
export function parseGoImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = code.split("\n");

  // Track if we're inside an import (...) block
  let inImportBlock = false;

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Start of import block
    if (trimmed === "import (") {
      inImportBlock = true;
      return;
    }

    // End of import block
    if (inImportBlock && trimmed === ")") {
      inImportBlock = false;
      return;
    }

    // Single line import "package"
    const singleMatch = trimmed.match(/^import\s+"([^"]+)"/);
    if (singleMatch) {
      imports.push({
        name: singleMatch[1],
        alias: null,
        from_module: singleMatch[1],
        is_from: true,
        line: idx + 1,
      });
      return;
    }

    // Single line import p "package"
    const aliasMatch = trimmed.match(/^import\s+(\w+)\s+"([^"]+)"/);
    if (aliasMatch) {
      imports.push({
        name: aliasMatch[1],
        alias: null,
        from_module: aliasMatch[2],
        is_from: true,
        line: idx + 1,
      });
      return;
    }

    // Import with alias: import p "package"
    const aliasWithAsMatch = trimmed.match(/^import\s+(\w+)\s+=\s+"([^"]+)"/);
    if (aliasWithAsMatch) {
      imports.push({
        name: aliasWithAsMatch[1],
        alias: null,
        from_module: aliasWithAsMatch[2],
        is_from: true,
        line: idx + 1,
      });
      return;
    }

    // Inside import block: "package"
    if (inImportBlock) {
      // Match quoted package
      const blockMatch = trimmed.match(/"([^"]+)"/);
      if (blockMatch) {
        imports.push({
          name: blockMatch[1],
          alias: null,
          from_module: blockMatch[1],
          is_from: true,
          line: idx + 1,
        });
        return;
      }

      // Match aliased import in block: p "package"
      const blockAliasMatch = trimmed.match(/(\w+)\s+"([^"]+)"/);
      if (blockAliasMatch && !trimmed.startsWith("//")) {
        imports.push({
          name: blockAliasMatch[2],
          alias: blockAliasMatch[1],
          from_module: blockAliasMatch[2],
          is_from: true,
          line: idx + 1,
        });
      }
    }
  });

  return imports;
}

/**
 * Detect typos in Go code
 */
function detectGoTypos(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    // Skip comments
    if (line.trim().startsWith("//")) {
      return;
    }

    // Check typos for each category
    for (const [category, typos] of Object.entries(GO_TYPOS)) {
      for (const [typo, correction] of Object.entries(typos)) {
        // Create a pattern that matches the typo as a complete identifier
        const pattern = new RegExp(`\\b${typo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
        if (pattern.test(line)) {
          issues.push({
            line: idx + 1,
            code_snippet: line.trim(),
            error_type: "typo",
            message: `Possible typo '${typo}' - did you mean '${correction}'?`,
            suggestion: correction,
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Detect syntax errors in Go code
 */
function detectGoSyntaxErrors(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed === "" || trimmed.startsWith("//")) {
      return;
    }

    // Skip string literals (they can contain what looks like syntax errors)
    // Simple approach: remove content within quotes
    const lineWithoutStrings = trimmed.replace(/["'`][^"'`]*["'`]/g, "");

    // Check for unbalanced braces
    const openBrace = (lineWithoutStrings.match(/\{/g) || []).length;
    const closeBrace = (lineWithoutStrings.match(/\}/g) || []).length;
    if (openBrace > 0 && openBrace !== closeBrace) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Unbalanced braces",
        suggestion: null,
      });
    }

    // Check for unbalanced parentheses
    const openParen = (lineWithoutStrings.match(/\(/g) || []).length;
    const closeParen = (lineWithoutStrings.match(/\)/g) || []).length;
    if (openParen > 0 && openParen !== closeParen) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Unbalanced parentheses",
        suggestion: null,
      });
    }

    // Check for missing return statement in non-void function
    const funcMatch = trimmed.match(/^func\s+\w+\s*\([^)]*\)\s*\{?\s*$/);
    if (funcMatch) {
      // Look ahead to see if there's a return in the function
      const restOfCode = lines.slice(idx + 1).join("\n");
      const closingBracePos = restOfCode.indexOf("}");
      if (closingBracePos !== -1) {
        const funcBody = restOfCode.slice(0, closingBracePos);
        if (!funcBody.includes("return") && !funcBody.includes("{")) {
          // Check if function returns a value
          const returnTypeMatch = trimmed.match(/\{?\s*([^\s{]+)\s*$/);
          if (returnTypeMatch && returnTypeMatch[1] !== "{" && returnTypeMatch[1] !== "{") {
            issues.push({
              line: idx + 1,
              code_snippet: trimmed,
              error_type: "syntax_error",
              message: "Function may be missing return statement",
              suggestion: null,
            });
          }
        }
      }
    }
  });

  return issues;
}

/**
 * Detect method calls on Go stdlib packages
 */
function detectGoStdlibIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("//")) {
      return;
    }

    // Match: package.function( patterns
    const stdlibCallMatch = trimmed.match(/\b(fmt\.os\.io\.strings\.strconv\.time\.json\.errors\.sync\.context\.http\.flag\.log|fmt|os|io|strings|strconv|time|json|errors|sync|context|http|flag|log)\.(\w+)\s*\(/);
    if (stdlibCallMatch) {
      const pkg = stdlibCallMatch[1];
      const func = stdlibCallMatch[2];

      if (GO_STDLIB[pkg] && !GO_STDLIB[pkg].has(func)) {
        // Check for typos
        let suggestion: string | null = null;
        const typos = GO_TYPOS[pkg.toLowerCase()];
        if (typos) {
          for (const [typo, correction] of Object.entries(typos)) {
            if (func.includes(typo)) {
              suggestion = correction;
              break;
            }
          }
        }

        // If no typo suggestion, try to find similar function names
        if (!suggestion) {
          for (const [validFunc] of GO_STDLIB[pkg]) {
            // Check if the typo is a simple transposition or missing character
            if (Math.abs(validFunc.length - func.length) <= 2) {
              const distance = levenshteinDistance(func.toLowerCase(), validFunc.toLowerCase());
              if (distance <= 2) {
                suggestion = validFunc;
                break;
              }
            }
          }
        }

        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "method_not_found",
          message: `'${pkg}.${func}' is not a valid function in Go stdlib`,
          suggestion,
        });
      }
    }

    // Detect usage of built-in functions used incorrectly
    // e.g., len = 5 (assignment to built-in)
    for (const builtin of GO_BUILTINS) {
      const builtinAssign = new RegExp(`\\b${builtin}\\s*=\\s*`);
      if (builtinAssign.test(trimmed) && !trimmed.includes(":= ")) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "keyword_misuse",
          message: `'${builtin}' is a built-in function, not a variable name`,
          suggestion: null,
        });
      }
    }
  });

  return issues;
}

// Levenshtein distance for typo suggestions
function levenshteinDistance(s1: string, s2: string): number {
  if (s1.length < s2.length) [s1, s2] = [s2, s1];
  const len2 = s2.length;
  const row: number[] = [];
  for (let i = 0; i <= len2; i++) {
    row[i] = i;
  }
  for (let i = 1; i <= s1.length; i++) {
    row[0] = i;
    let prev = i;
    for (let j = 1; j <= len2; j++) {
      const temp = row[j];
      row[j] = s1[i - 1] === s2[j - 1] ? prev : Math.min(prev, row[j], row[j - 1]) + 1;
      prev = temp;
    }
  }
  return row[len2];
}

/**
 * Detect all issues in Go code
 */
export function detectGoIssues(code: string): Issue[] {
  const issues: Issue[] = [];

  // Detect syntax errors
  issues.push(...detectGoSyntaxErrors(code));

  // Detect typos
  issues.push(...detectGoTypos(code));

  // Detect stdlib method issues
  issues.push(...detectGoStdlibIssues(code));

  return issues;
}

/**
 * Verify Go code for hallucinations
 */
export function verifyGo(code: string): Issue[] {
  return detectGoIssues(code);
}

/**
 * Fix common Go typos
 */
export function fixGo(code: string): string {
  let fixed = code;

  for (const [, typos] of Object.entries(GO_TYPOS)) {
    for (const [typo, correction] of Object.entries(typos)) {
      const escapedTypo = typo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = new RegExp(`\\b${escapedTypo}\\b`, "g");
      fixed = fixed.replace(pattern, correction);
    }
  }

  return fixed;
}
