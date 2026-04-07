/**
 * CodeShield Detection Engine
 *
 * Port de Python a TypeScript del motor de detección de alucinaciones en código.
 */

// Stdlib modules conocidas
const STDLIB_MODULES = new Set([
  "os", "sys", "re", "json", "xml", "html", "math", "cmath",
  "collections", "itertools", "functools", "operator",
  "pathlib", "datetime", "time", "calendar", "uuid",
  "random", "statistics", "base64", "binascii",
  "hashlib", "hmac", "secrets", "ssl", "socket",
  "urllib", "http", "ftplib", "smtplib", "email",
  "io", "buffer", "bytearray", "bytes", "str", "int", "float", "bool",
  "csv", "configparser", "logging", "getpass", "curses",
  "termios", "tty", "pty", "fcntl", "select",
  "zipfile", "tarfile", "gzip", "bz2", "lzma",
  "pickle", "shelve", "marshal", "struct",
  "runpy", "code", "codeop", "dis", "inspect", "traceback",
  "pdb", "sysconfig", "types", "warnings", "linecache",
  "platform", "errno", "ctypes", "signal", "mmap", "asyncio",
  "threading", "multiprocessing", "concurrent", "queue",
  "argparse", "optparse", "getopt", "tempfile", "shutil", "glob",
  "fnmatch", "stat", "fileinput", "contextlib",
  "codecs", "locale", "unicodedata",
]);

// Funciones comunes de stdlib
const STDLIB_FUNCTIONS: Record<string, Set<string>> = {
  os: new Set([
    "listdir", "getcwd", "chdir", "mkdir", "makedirs", "remove", "unlink", "rename",
    "path", "environ", "getenv", "putenv", "getpid", "getuid", "devnull", "sep", "name", "linesep",
  ]),
  "os.path": new Set([
    "exists", "join", "dirname", "basename", "abspath", "isdir", "isfile",
    "splitext", "split", "normpath",
  ]),
  sys: new Set([
    "exit", "argv", "path", "modules", "version", "platform", "stdin", "stdout", "stderr",
    "getrecursionlimit", "setrecursionlimit", "getrefcount",
  ]),
  re: new Set([
    "match", "search", "sub", "findall", "finditer", "split", "compile", "escape",
    "pattern", "Pattern", "Match",
  ]),
  json: new Set(["dumps", "loads", "dump", "load", "JSONDecoder", "JSONEncoder"]),
  collections: new Set([
    "Counter", "OrderedDict", "defaultdict", "deque", "namedtuple",
    "ChainMap", "UserDict", "UserList", "UserString",
  ]),
  itertools: new Set([
    "count", "cycle", "repeat", "chain", "islice", "tee", "product",
    "permutations", "combinations", "groupby",
  ]),
  pathlib: new Set(["Path", "PurePath", "PurePosixPath", "PureWindowsPath", "PosixPath", "WindowsPath"]),
  datetime: new Set(["datetime", "date", "time", "timedelta", "timezone", "MAXYEAR", "MINYEAR"]),
  typing: new Set([
    "List", "Dict", "Set", "Tuple", "Optional", "Union", "Any", "Callable",
    "TypeVar", "Generic", "Protocol", "IO", "TextIO", "BinaryIO",
  ]),
};

// Known typos
const KNOWN_TYPOS: Record<string, string[]> = {
  print: ["prin", "prnt"],
  len: ["ln", "lne"],
  sum: ["sumArray"],
  count: ["countt"],
  append: ["appendItem"],
  join: ["joinp"],
  listdir: ["listdirs"],
  DataFrame: ["data_frame", "datafram"],
  deque: ["dequee"],
  datetime: ["DatetimeTZ"],
};

// Tipos para resultados
export interface Issue {
  line: number;
  code_snippet: string;
  error_type: string;
  message: string;
  suggestion: string | null;
}

export interface ImportInfo {
  name: string;
  alias: string | null;
  from_module: string | null;
  is_from: boolean;
  line: number;
}

export interface AnalysisResult {
  intended_imports: string[];
  intended_functions: string[];
  warnings: string[];
  language: string;
  detected_frameworks?: string[];
  detected_intentions?: string[];
}

export interface IndexResult {
  classes: string[];
  functions: string[];
  methods: Record<string, string[]>;
  imports: string[];
}

// Distancia de Levenshtein
function levenshteinDistance(s1: string, s2: string): number {
  if (s1.length < s2.length) [s1, s2] = [s2, s1];
  const len2 = s2.length;
  let prevRow = Array.from({ length: len2 + 1 }, (_, i) => i);

  for (let i = 0; i < s1.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < len2; j++) {
      const insertions = prevRow[j + 1] + 1;
      const deletions = currentRow[j] + 1;
      const substitutions = prevRow[j] + (s1[i] !== s2[j] ? 1 : 0);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    prevRow = currentRow;
  }
  return prevRow[len2];
}

// Extraer imports de código Python con soporte para aliases
function extractImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Match: import module [as alias]
    const importMatch = trimmed.match(/^import\s+([\w.,\s]+?)(?:\s+as\s+(\w+))?$/);
    if (importMatch && trimmed.startsWith("import ")) {
      const names = importMatch[1].split(",").map((n) => n.trim());
      const alias = importMatch[2] || null;
      names.forEach((name) => {
        imports.push({
          name,
          alias: alias, // El alias aplica a todos si se usa "import X as Y"
          from_module: null,
          is_from: false,
          line: idx + 1,
        });
      });
      return;
    }

    // Match: from module import name1, name2 [as alias1], [as alias2], *
    const fromMatch = trimmed.match(/^from\s+([\w.]+)\s+import\s+(.+)$/);
    if (fromMatch && trimmed.startsWith("from ")) {
      const module = fromMatch[1];
      const importsPart = fromMatch[2];

      // Parse: "name" o "name as alias" o "name1 as alias1, name2 as alias2"
      // También soporta * para "from X import *"
      if (importsPart.trim() === "*") {
        imports.push({
          name: "*",
          alias: null,
          from_module: module,
          is_from: true,
          line: idx + 1,
        });
        return;
      }

      // Split por coma pero manejar "as"
      const items = importsPart.split(",");
      items.forEach((item) => {
        const itemTrimmed = item.trim();
        const asMatch = itemTrimmed.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        if (asMatch) {
          imports.push({
            name: asMatch[1],
            alias: asMatch[2] || null,
            from_module: module,
            is_from: true,
            line: idx + 1,
          });
        }
      });
    }
  });

  return imports;
}

// Verificar si es stdlib
function isStdlibModule(module: string): boolean {
  return STDLIB_MODULES.has(module.split(".")[0]);
}

// Sugerir funciones similares
function suggestSimilarFunction(
  module: string,
  name: string,
  maxDistance = 3
): string[] {
  const suggestions: [string, number][] = [];
  const baseModule = module.split(".")[0];

  // Buscar en el módulo exacto
  if (STDLIB_FUNCTIONS[module]) {
    for (const func of STDLIB_FUNCTIONS[module]) {
      const dist = levenshteinDistance(name.toLowerCase(), func.toLowerCase());
      if (dist <= maxDistance) {
        suggestions.push([func, dist]);
      }
    }
  }

  // Para os.path también buscar en os
  if (baseModule === "os" && module !== "os") {
    if (STDLIB_FUNCTIONS["os"]) {
      for (const func of STDLIB_FUNCTIONS["os"]) {
        const dist = levenshteinDistance(name.toLowerCase(), func.toLowerCase());
        if (dist <= maxDistance) {
          suggestions.push([func, dist]);
        }
      }
    }
    if (STDLIB_FUNCTIONS["os.path"]) {
      for (const func of STDLIB_FUNCTIONS["os.path"]) {
        const dist = levenshteinDistance(name.toLowerCase(), func.toLowerCase());
        if (dist <= maxDistance) {
          suggestions.push([func, dist]);
        }
      }
    }
  }

  // Ordenar por distancia
  suggestions.sort((a, b) => a[1] - b[1]);
  return [...new Set(suggestions.map((s) => s[0]))];
}

// Detectar typos en funciones
function detectFunctionTypos(code: string): Issue[] {
  const issues: Issue[] = [];
  const patterns: [RegExp, string][] = [
    [/\.count_items\(/g, "count"],
    [/\.sumArray\(/g, "sum"],
    [/\.appendItem\(/g, "append"],
    [/\.get\w+\(/g, "get"],
  ];

  const lines = code.split("\n");
  lines.forEach((line, idx) => {
    patterns.forEach(([pattern, suggestion]) => {
      if (pattern.test(line)) {
        issues.push({
          line: idx + 1,
          code_snippet: line.trim(),
          error_type: "method_not_found",
          message: `El método '${line.match(/\.\w+\(/)?.[0].slice(1)}' no existe. ¿Quisiste decir '${suggestion}()'?`,
          suggestion,
        });
      }
    });
  });

  return issues;
}

// Detectar errores de sintaxis básicos
// NOTA: Esta es una detección BÁSICA usando regex/heurísticas, no un parser completo de Python
function detectSyntaxErrors(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  // Keywords de Python mal escritos
  const keywordTypos: [RegExp, string][] = [
    [/\bdeff\b/g, "def"],
    [/bclaass\b/g, "class"],
    [/bretur\b/g, "return"],
    [/bimporrt\b/g, "import"],
    [/bfromm\b/g, "from"],
    [/bforeeach\b/g, "for"],
    [/bwhille\b/g, "while"],
    [/biff\b/g, "if"],
    [/bellif\b/g, "elif"],
    [/belsee\b/g, "else"],
    [/btryy\b/g, "try"],
    [/bexceppt\b/g, "except"],
    [/bwithh\b/g, "with"],
    [/braisse\b/g, "raise"],
    [/break\b/g, "break"],
    [/bcontinuue\b/g, "continue"],
  ];

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Detectar keywords mal escritos
    keywordTypos.forEach(([pattern, correction]) => {
      if (pattern.test(trimmed)) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "syntax_error",
          message: `'${trimmed.match(pattern)?.[0]}' parece ser un typo. ¿Quisiste decir '${correction}'?`,
          suggestion: correction,
        });
      }
    });

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
    if (Math.abs(openBrace - closeBrace) > 1) {
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
    if (Math.abs(openBracket - closeBracket) > 1) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Corchetes desbalanceados",
        suggestion: null,
      });
    }

    // Strings sin cerrar (comillas simples o dobles)
    const singleQuotes = (trimmed.match(/'/g) || []).length;
    const doubleQuotes = (trimmed.match(/"/g) || []).length;
    // Ignorar si son docstrings o multilínea
    if (trimmed.includes('"""') || trimmed.includes("'''")) {
      // Docstring line - skip
    } else if (singleQuotes % 2 !== 0 && singleQuotes > 0) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Comillas simples desbalanceadas",
        suggestion: null,
      });
    } else if (doubleQuotes % 2 !== 0 && doubleQuotes > 0) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Comillas dobles desbalanceadas",
        suggestion: null,
      });
    }

    // Indentación inválida (espacios antes de keywords que no deberían tener indentación)
    if (/^(def|class|import|from)\s+/.test(trimmed) && /^\s{1,3}\S/.test(trimmed) && !trimmed.startsWith("    ")) {
      // Solo warn si tiene 1-3 espacios (indentación inconsistente)
      if (/^\s+/.test(trimmed) && !/^(    )+/.test(trimmed)) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "syntax_error",
          message: "Indentación inconsistente (usa múltiplos de 4 espacios)",
          suggestion: null,
        });
      }
    }
  });

  return issues;
}

// Detectar todos los issues
function detectAllIssues(code: string, language: string): Issue[] {
  const issues: Issue[] = [];

  if (language === "python") {
    issues.push(...detectSyntaxErrors(code));
    issues.push(...detectFunctionTypos(code));

    // Verificar imports Python
    const imports = extractImports(code);
    for (const imp of imports) {
      if (imp.is_from && imp.from_module) {
        if (isStdlibModule(imp.from_module)) {
          const funcs = STDLIB_FUNCTIONS[imp.from_module];
          if (funcs && !funcs.has(imp.name) && !funcs.has(imp.name.split(".")[0])) {
            const suggestions = suggestSimilarFunction(imp.from_module, imp.name);
            issues.push({
              line: imp.line,
              code_snippet: `from ${imp.from_module} import ${imp.name}`,
              error_type: "import_not_found",
              message: `'${imp.name}' no existe en '${imp.from_module}'`,
              suggestion: suggestions[0] || null,
            });
          }
        }
      }
    }
  } else if (language === "javascript") {
    issues.push(...verifyJavaScript(code));
  } else if (language === "typescript") {
    issues.push(...verifyTypeScript(code));
  }

  return issues;
}

// === Framework detection patterns ===
const FRAMEWORK_PATTERNS: Record<string, RegExp[]> = {
  django: [/\b(manage\.py|MIGRATIONS|settings\.py|INSTALLED_APPS|DJANGO_SETTINGS_MODULE)\b/i],
  flask: [/\b(app\.route|@app|Flask\(|render_template|request\.)/i],
  fastapi: [/\b(@app\.|FastAPI|APIRouter|uvicorn)/i],
  fastapi_route: [/@(app|router)\.(get|post|put|delete|patch)\(/i],
  react: [/\b(useState|useEffect|useRef|Component|jsx|React\.)/i],
  nextjs: [/\b(getServerSideProps|getStaticProps|next\/|NextPage|next\/image)/i],
  nodejs: [/\b(module\.exports|require\(|process\.|__dirname|__filename)/i],
  express: [/\b(app|router)\.(get|post|put|delete|patch|use)\(/i],
  nestjs: [/\b(@Controller|@Injectable|@Module|NestFactory)/i],
  typescript: [/\binterface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|any)\b/i],
  pytest: [/\bdef test_\w+\(|pytest\.|fixture\(|@pytest\./i],
  jest: [/\bdescribe\(|it\(|test\(|expect\(|@testing-library/i],
  playwright: [/\b(page|expect)\.(click|fill|goTo|waitFor)/i],
  sqlalchemy: [/\b(session|query|Column|Integer|String\()/i],
  prisma: [/\b(prisma\.|@prisma|model\s+\w+\s*\{)/i],
};

// Intention patterns
const INTENTION_PATTERNS = {
  database: /\b(postgres|mysql|mongodb|sqlite|redis|sql|database|db|query|select|insert|update|delete)\b/i,
  api: /\b(rest|graphql|endpoint|api|route|http|request|response|status\s*code)\b/i,
  testing: /\b(test|jest|pytest|vitest|mocha|unit\s*test|integration\s*test|coverage)\b/i,
  auth: /\b(auth|login|password|token|jwt|oauth|session|permission|role)\b/i,
  devops: /\b(docker|kubernetes|ci\/cd|deploy|nginx|apache|nginx|container|pod)\b/i,
  frontend: /\b(component|props|state|jsx|tsx|react|vue|angular|svelte|html|css|style)\b/i,
  backend: /\b(server|api|endpoint|route|controller|service|repository|middleware)\b/i,
};

// === JavaScript/TypeScript imports ===
import { verifyJavaScript, extractJSImports } from "./javascript.js";
import { verifyTypeScript } from "./typescript.js";

// === Funciones públicas ===

export function analyzePrompt(prompt: string, language = "python"): AnalysisResult {
  const intendedImports: string[] = [];
  const intendedFunctions: string[] = [];
  const warnings: string[] = [];
  const detectedFrameworks: string[] = [];

  // Pattern para imports mencionados
  const importPatterns = [
    /\bimport\s+([\w.]+)/gi,
    /\bfrom\s+([\w.]+)\s+import/gi,
    /\bimportar\s+([\w.]+)/gi,
  ];

  importPatterns.forEach((pattern) => {
    let match;
    while ((match = pattern.exec(prompt)) !== null) {
      const base = match[1].split(".")[0];
      if (base && base.length > 1) {
        intendedImports.push(base);
      }
    }
  });

  // Detectar funciones
  const funcPattern = /\b([a-z_][a-z0-9_]*)\s*\(/gi;
  const skipWords = new Set([
    "def", "class", "if", "for", "while", "try", "except", "with",
    "return", "raise", "pass", "break", "continue", "import", "from",
    "lambda", "print", "len", "range", "open", "input", "sum", "min",
    "max", "sorted", "enumerate", "zip", "map", "filter", "staticmethod",
  ]);

  let funcMatch;
  while ((funcMatch = funcPattern.exec(prompt)) !== null) {
    const func = funcMatch[1].toLowerCase();
    if (func.length >= 3 && !skipWords.has(func)) {
      intendedFunctions.push(func);
    }
  }

  // Detectar frameworks
  for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    for (const pattern of patterns) {
      if (pattern.test(prompt)) {
        if (!detectedFrameworks.includes(framework)) {
          detectedFrameworks.push(framework);
        }
        break;
      }
    }
  }

  // Detectar intenciones
  const detectedIntentions: string[] = [];
  for (const [intention, pattern] of Object.entries(INTENTION_PATTERNS)) {
    if (pattern.test(prompt)) {
      detectedIntentions.push(intention);
    }
  }

  if (prompt.trim().length < 20) {
    warnings.push("Prompt muy corto, análisis limitado");
  }

  if (detectedIntentions.length > 0) {
    warnings.push(`Intenciones detectadas: ${detectedIntentions.join(", ")}`);
  }

  return {
    intended_imports: [...new Set(intendedImports)],
    intended_functions: [...new Set(intendedFunctions)],
    warnings,
    language,
    detected_frameworks: detectedFrameworks,
    detected_intentions: detectedIntentions,
  } as AnalysisResult & { detected_frameworks: string[]; detected_intentions: string[] };
}

export function verifyCode(
  code: string,
  language = "python",
  _codeBaseIndex?: IndexResult
): string[] {
  const issues = detectAllIssues(code, language);
  if (issues.length === 0) return [];

  return issues.map(
    (issue) =>
      `Línea ${issue.line}: ${issue.message}${
        issue.suggestion ? ` Sugerencia: ${issue.suggestion}` : ""
      }`
  );
}

export interface VerifyAndFixResult {
  issues: string[];
  fixed_code: string;
  fixed_count: number;
}

export function verifyAndFix(
  code: string,
  language = "python"
): VerifyAndFixResult {
  const issues = detectAllIssues(code, language);

  // Apply auto-fix to the code
  let fixedCode = code;
  if (language === "python") {
    fixedCode = autoFix(code, "", language);
  }

  // Count how many fixes were applied
  let fixedCount = 0;
  if (fixedCode !== code) {
    // Simple heuristic: count differences in known patterns
    const originalLower = code.toLowerCase();
    const fixedLower = fixedCode.toLowerCase();

    if (originalLower.includes("count_items") && !fixedLower.includes("count_items")) fixedCount++;
    if (originalLower.includes("sumarray") && !fixedLower.includes("sumarray")) fixedCount++;
    if (originalLower.includes("appenditem") && !fixedLower.includes("appenditem")) fixedCount++;
    if (originalLower.includes("data_frame") && !fixedLower.includes("data_frame")) fixedCount++;
    if (originalLower.includes("datafram") && !fixedLower.includes("datafram")) fixedCount++;
    if (originalLower.includes("datetimetz") && !fixedLower.includes("datetimetz")) fixedCount++;
    if (originalLower.includes("joinp") && !fixedLower.includes("joinp")) fixedCount++;
  }

  // Format issues as strings
  const formattedIssues = issues.map(
    (issue) =>
      `Línea ${issue.line}: ${issue.message}${
        issue.suggestion ? ` Sugerencia: ${issue.suggestion}` : ""
      }`
  );

  return {
    issues: formattedIssues,
    fixed_code: fixedCode,
    fixed_count: fixedCount,
  };
}

export function suggestSimilar(
  name: string,
  context = "",
  language = "python"
): string[] {
  if (language !== "python") return [];

  const suggestions: [string, number, boolean][] = [];
  const nameLower = name.toLowerCase();

  // Buscar en known typos
  for (const [correct, typos] of Object.entries(KNOWN_TYPOS)) {
    for (const typo of typos) {
      const dist = levenshteinDistance(nameLower, typo.toLowerCase());
      if (dist <= 1) {
        suggestions.push([correct, dist, true]);
      }
    }
  }

  // Si hay contexto, buscar en ese módulo
  let searchIn: Set<string> | string[] = [];
  if (context && STDLIB_FUNCTIONS[context]) {
    searchIn = STDLIB_FUNCTIONS[context];
  } else {
    searchIn = Object.keys(STDLIB_FUNCTIONS).flatMap((m) =>
      [...STDLIB_FUNCTIONS[m]].map((f) => `${m}.${f}`)
    );
  }

  for (const item of searchIn) {
    const dist = levenshteinDistance(nameLower, item.toLowerCase().split(".").pop() || item.toLowerCase());
    if (dist <= 2 && dist > 0) {
      suggestions.push([
        item.includes(".") ? item : item,
        dist,
        false,
      ]);
    }
  }

  // Ordenar: typos exactos primero, luego por distancia
  suggestions.sort((a, b) => {
    if (a[2] !== b[2]) return a[2] ? -1 : 1;
    return a[1] - b[1];
  });

  return [...new Set(suggestions.map((s) => s[0]))];
}

export function autoFix(
  code: string,
  _error = "",
  language = "python"
): string {
  if (language !== "python") return code;

  let fixed = code;

  // Patterns de corrección
  const fixPatterns: [RegExp, string][] = [
    [/\.count_items\(/g, ".count("],
    [/\.sumArray\(/g, ".sum("],
    [/\.appendItem\(/g, ".append("],
    [/joinp/g, "join"],
    [/DatetimeTZ/g, "datetime"],
    [/data_frame/g, "DataFrame"],
    [/datafram/g, "DataFrame"],
  ];

  fixPatterns.forEach(([pattern, replacement]) => {
    fixed = fixed.replace(pattern, replacement);
  });

  return fixed;
}

import * as fs from "fs";
import * as path from "path";

export function indexProject(
  directory: string,
  languages = ["python"],
  exclude = ["node_modules", "venv", ".git", "__pycache__", ".venv"],
  _reindex = false
): IndexResult {
  const result: IndexResult = {
    classes: [],
    functions: [],
    methods: {},
    imports: [],
  };

  const excludeSet = new Set(exclude);
  const basePath = path.resolve(directory);

  function isPathSafe(filePath: string): boolean {
    // Resolve the full path and verify it stays within base directory
    const resolved = path.resolve(filePath);
    return resolved.startsWith(basePath + path.sep) || resolved === basePath;
  }

  function shouldExclude(filePath: string): boolean {
    return excludeSet.has(filePath) ||
           filePath.includes("node_modules") ||
           filePath.includes("venv") ||
           filePath.includes(".git") ||
           filePath.includes("__pycache__");
  }

  function processFile(filePath: string): void {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");

      // Extraer classes
      const classRegex = /^class\s+(\w+)/g;
      let match;
      while ((match = classRegex.exec(content)) !== null) {
        result.classes.push(match[1]);
        result.methods[match[1]] = [];
      }

      // Extraer functions y methods
      const funcRegex = /(?:^|\n)\s*(?:async\s+)?def\s+(\w+)\s*\(/g;
      let currentClass: string | null = null;
      let lastMatchIndex = 0;

      // Reset and find all matches
      const allMatches = [...content.matchAll(/\nclass\s+(\w+)/g)];
      const funcMatches = [...content.matchAll(/(?:^|\n)\s*(?:async\s+)?def\s+(\w+)\s*\(/g)];

      for (const funcMatch of funcMatches) {
        // Check if we're inside a class
        const funcIndex = funcMatch.index!;
        for (const classMatch of allMatches) {
          if (classMatch.index! < funcIndex) {
            currentClass = classMatch[1];
          }
        }

        const funcName = funcMatch[1];
        if (funcName.startsWith("_")) {
          // Private, skip for public index but track in class
          if (currentClass) {
            result.methods[currentClass].push(funcName);
          }
        } else {
          result.functions.push(funcName);
          if (currentClass) {
            result.methods[currentClass].push(funcName);
          }
        }
      }

      // Extraer imports
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith("import ")) {
          const match = trimmed.match(/^import\s+([\w.,\s]+)/);
          if (match) {
            const names = match[1].split(",").map((n) => n.trim());
            names.forEach((name) => {
              result.imports.push(name.split(" as ")[0].trim());
            });
          }
        } else if (trimmed.startsWith("from ")) {
          const match = trimmed.match(/^from\s+([\w.]+)\s+import/);
          if (match) {
            result.imports.push(match[1]);
          }
        }
      });
    } catch (error) {
      // Skip files that can't be read
    }
  }

  function walkDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (!isPathSafe(fullPath)) continue;
        if (shouldExclude(entry.name) || shouldExclude(fullPath)) {
          continue;
        }

        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (ext === ".py" || (languages.includes("python") && ext === "")) {
            // For files without extension, assume Python if language includes python
            if (languages.includes("python")) {
              processFile(fullPath);
            }
          }
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
  }

  // Start walking from the given directory
  walkDir(directory);

  // Deduplicate
  result.classes = [...new Set(result.classes)];
  result.functions = [...new Set(result.functions)];
  result.imports = [...new Set(result.imports)];

  return result;
}
