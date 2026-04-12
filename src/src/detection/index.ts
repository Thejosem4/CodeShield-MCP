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

// Known typos - expanded coverage
const KNOWN_TYPOS: Record<string, string[]> = {
  // Built-in functions
  print: ["prin", "prnt", "printo", "printt"],
  len: ["ln", "lne", "lenght", "lengh", "lentgh"],
  sum: ["sumArray", "summ", "sump"],
  count: ["countt", "count_items", "counnt", "countt"],
  append: ["appendItem", "apppend", "addItem", "add_item"],
  join: ["joinp", "joinn", "concatenate", "joinn"],
  listdir: ["listdirs", "list_directories"],
  sorted: ["sortted", "sortt"],
  reverse: ["revese", "reversee"],

  // Data structures
  DataFrame: ["data_frame", "datafram", "dataFrame", "dataframee"],
  deque: ["dequee", "dequeue"],
  datetime: ["DatetimeTZ", "dateTime", "datetimee", "datetim"],
  Counter: ["counterr", "countter"],
  defaultdict: ["defaultdicct", "defaultdictt"],

  // Common pandas/numpy
  pandas: ["pandass", "panas"],
  numpy: ["numby", "numpyy", "nump"],
  array: ["arry", "arraay"],

  // String methods
  split: ["spllit", "splite", "splitt"],
  strip: ["stip", "stripp"],
  lower: ["lowerr", "toLowerCase"],
  upper: ["uperr", "toUpperCase"],
  replace: ["replase", "replacce"],
  format: ["formatt", "formate"],

  // File operations
  open: ["opne", "openn", "opeen"],
  read: ["reaad", "readd", "readd"],
  write: ["writte", "writee", "writte"],
  close: ["clsoe", "closee"],

  // Control flow
  return: ["retur", "retunn"],
  import: ["impor", "importt", "imort"],
  class: ["claass", "classs"],
  def: ["deff", "ddef"],
  except: ["exceppt", "exceptt"],
  raise: ["raisse", "raisee"],
  yield: ["yeild", "yielld"],
  lambda: ["lamda", "lambd"],

  // Dict operations
  get: ["gett", "dget"],
  keys: ["keeys", "keyss"],
  values: ["valuess", "values"],
  items: ["itemss", "iteems"],
  update: ["updade", "uppdate"],

  // Loop operations
  range: ["ranget", "ragne"],
  enumerate: ["enumarate", "enumerat"],
  zip: ["zipp", "ziip"],

  // Math operations
  sqrt: ["sqrtt", "sqrt"],
  abs: ["abss", "abbs"],
  pow: ["poww", "poow"],
  max: ["maxx", "maax"],
  min: ["minn", "miin"],

  // Type operations
  isinstance: ["isintance", "isinstace"],
  issubclass: ["issublass", "issubcalss"],

  // Common typos in code
  True: ["Truue", "Ture", "Treu"],
  False: ["Fase", "Faluse", "Flase"],
  None: ["Nonde", "Noen", "Null"],
  self: ["selff", "slf", "slef"],

  // Django framework typos
  "models.Model": ["model.Model", "modelsmodel", "models.models"],
  "request.GET": ["requestget", "request.Get", "request.get"],
  "request.POST": ["requestpost", "request.Post", "request.post"],
  "django.urls": ["django.url", "djangourls", "django.urls import"],
  "ModelForm": ["modelfForm", "model_form", "Modelform"],
  "related_name": ["relatedname", "related_name"],
  "on_delete": ["ondelete", "on_delete"],
  "null=True": ["null_true", "null=>True"],
  "blank=True": ["blanktrue", "blank=>True"],

  // Flask framework typos
  "render_template": ["renderTemplate", "render_template", "renderTempate"],
  "request.args": ["requestargs", "request.QueryDict"],
  "session['": ["session[", "sesion['", "session.get("],
  "flash(" : ["falsh(", "flas("],

  // FastAPI typos
  "FastAPI": ["FastApi", "fastapi", "Fast_Api"],
  "APIRouter": ["ApiRouter", "apirouter", "api_router"],
  "@app.": ["@app.", "@App.", "app."],

  // File operations
  "json.loads": ["json.loades", "jsonload", "json.load"],
  "json.dumps": ["json.dumsp", "jsondump", "json.dump"],
  "file.read()": ["file.readlines()"],
  "readlines": ["readline", "readlins", "read_line"],
  "readline": ["readlines", "read_lin"],

  // itertools and collections
  "from_iterable": ["fromiterable", "from_iterblie"],
  "namedtuple": ["named_tuple", "namedtple", "namedtupe"],

  // Common pandas/numpy method typos
  "to_csv": ["to_csvs", "to_scv", "tosv"],
  "to_excel": ["to_exel", "toexel"],
  "dropna": ["drop_na", "drobna"],
  "fillna": ["fill_na", "filna"],
  "reset_index": ["resetindex", "reset_indx"],
  "groupby": ["group_by", "grpupby"],
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

// === Pre-compiled regex patterns for detectTyposFromKnown (ReDoS mitigation) ===
// Memoized cache: [typo] -> { wordPattern, methodPattern }
const typoPatternCache = new Map<string, { wordPattern: RegExp; methodPattern: RegExp }>();

function getTypoPatterns(typo: string): { wordPattern: RegExp; methodPattern: RegExp } {
  const escapedTypo = typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (!typoPatternCache.has(typo)) {
    typoPatternCache.set(typo, {
      wordPattern: new RegExp(`\\b${escapedTypo}\\b`, 'g'),
      methodPattern: new RegExp(`\\.${escapedTypo}\\b`, 'g'),
    });
  }

  return typoPatternCache.get(typo)!;
}

// Detectar typos usando KNOWN_TYPOS durante la verificación
// Esto permite REPORTAR errores antes de hacer auto-fix
function detectTyposFromKnown(code: string): Issue[] {
  const issues: Issue[] = [];

  // Early exit: limit code processed if >50000 chars
  if (code.length > 50000) {
    return issues;
  }

  // Fast path for very long code: only check lines containing potential typos
  if (code.length > 10000) {
    const lines = code.split("\n");
    const checkedLines = new Set<number>();

    outerLoop:
    for (const [, typos] of Object.entries(KNOWN_TYPOS)) {
      if (checkedLines.size >= 100) break;
      for (const typo of typos) {
        for (let idx = 0; idx < lines.length; idx++) {
          if (!checkedLines.has(idx) && lines[idx].includes(typo)) {
            checkedLines.add(idx);
          }
          if (checkedLines.size >= 100) break;
        }
        if (checkedLines.size >= 100) break;
      }
    }

    for (const idx of checkedLines) {
      const line = lines[idx];
      let matchesPerLine = 0;

      for (const [correct, typos] of Object.entries(KNOWN_TYPOS)) {
        if (matchesPerLine >= 10) break;

        for (const typo of typos) {
          if (matchesPerLine >= 10) break;

          const patterns = getTypoPatterns(typo);
          patterns.wordPattern.lastIndex = 0;
          patterns.methodPattern.lastIndex = 0;

          if (patterns.wordPattern.test(line)) {
            issues.push({
              line: idx + 1,
              code_snippet: line.trim(),
              error_type: "typo",
              message: `'${typo}' parece ser un typo. ¿Quisiste decir '${correct}'?`,
              suggestion: correct,
            });
            matchesPerLine++;
            continue;
          }

          if (patterns.methodPattern.test(line)) {
            issues.push({
              line: idx + 1,
              code_snippet: line.trim(),
              error_type: "typo",
              message: `'${typo}' parece ser un typo. ¿Quisiste decir '${correct}'?`,
              suggestion: correct,
            });
            matchesPerLine++;
          }
        }
      }
    }

    return issues;
  }

  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    let matchesPerLine = 0;
    for (const [correct, typos] of Object.entries(KNOWN_TYPOS)) {
      if (matchesPerLine >= 10) break;

      for (const typo of typos) {
        if (matchesPerLine >= 10) break;

        // Early exit with String.includes() before executing regex
        if (!line.includes(typo)) continue;

        const patterns = getTypoPatterns(typo);
        patterns.wordPattern.lastIndex = 0;
        patterns.methodPattern.lastIndex = 0;

        // Caso 1: typo como palabra suelta (e.g., DatetimeTZ, datafram)
        if (patterns.wordPattern.test(line)) {
          issues.push({
            line: idx + 1,
            code_snippet: line.trim(),
            error_type: "typo",
            message: `'${typo}' parece ser un typo. ¿Quisiste decir '${correct}'?`,
            suggestion: correct,
          });
          matchesPerLine++;
          continue;
        }

        // Caso 2: typo precedido por punto - como objeto.metodo (e.g., pd.data_frame)
        if (patterns.methodPattern.test(line)) {
          issues.push({
            line: idx + 1,
            code_snippet: line.trim(),
            error_type: "typo",
            message: `'${typo}' parece ser un typo. ¿Quisiste decir '${correct}'?`,
            suggestion: correct,
          });
          matchesPerLine++;
        }
      }
    }
  });

  return issues;
}

// Detectar issues específicos de Python (indentación, mutables, etc.)
function detectPythonSyntaxIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  let inFunctionOrClass = false;
  let functionIndent = 0;
  let prevLine = "";

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    const trimmed = line.trim();

    // Detectar inicio de función/clase
    if (/^(async\s+)?def\s+\w+/.test(trimmed) || /^class\s+\w+/.test(trimmed)) {
      inFunctionOrClass = true;
      const indentMatch = line.match(/^(\s*)/);
      functionIndent = indentMatch ? indentMatch[1].length : 0;
    }

    // === 1. Tabs mezclados con espacios ===
    if (line.includes("\t") && line.includes(" ")) {
      // Línea tiene ambos: tabs y espacios
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "mixed_indentation",
        message: "Indentación mixta: tabs y espacios mezclados en la misma línea",
        suggestion: "Usa solo espacios (4) o solo tabs consistentemente",
      });
    }

    // === 2. Indentación inconsistente dentro de funciones ===
    if (inFunctionOrClass && trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("\"\"\"")) {
      if (/^(def|class|async\s+def)/.test(trimmed) === false) {
        const indentMatch = line.match(/^(\s*)/);
        const currentIndent = indentMatch ? indentMatch[1].length : 0;

        // Verificar si la indentación no es múltiplo de 4 ni consistente con la estructura
        if (currentIndent > 0 && currentIndent % 4 !== 0 && !line.startsWith("\t")) {
          issues.push({
            line: idx + 1,
            code_snippet: trimmed,
            error_type: "invalid_indentation",
            message: `Indentación inválida: ${currentIndent} espacios (debería ser múltiplo de 4)`,
            suggestion: "Usa múltiplos de 4 espacios",
          });
        }
      }
    }

    // Reset función cuando vuelve a nivel 0
    if (trimmed && !trimmed.startsWith("#") && !trimmed.startsWith("\"\"\"")) {
      const indentMatch = line.match(/^(\s*)/);
      const currentIndent = indentMatch ? indentMatch[1].length : 0;
      if (currentIndent === 0 && inFunctionOrClass && trimmed) {
        inFunctionOrClass = false;
      }
    }

    // === 3. Mutable default arguments ===
    // Patrón: def foo(arg=[]) o def foo(arg={})
    const mutableDefaultMatch = trimmed.match(/^(\s*)(async\s+)?def\s+\w+\s*\([^)]*=\s*[\[\{]/);
    if (mutableDefaultMatch) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "mutable_default_argument",
        message: "Argumento mutable como valor por defecto: la lista/dict se comparte entre llamadas",
        suggestion: "Usa None como默认值: def foo(arg=None)",
      });
    }

    // === 4. Bare except clauses ===
    // Patrón: except: sin excepción específica
    if (/^\s*except\s*:\s*(#.*)?$/.test(trimmed)) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "bare_except",
        message: "Cláusula 'except:' sin excepción específica puede capturar KeyboardInterrupt y SystemExit",
        suggestion: "Usa 'except Exception:' o 'except SpecificError:'",
      });
    }

    prevLine = line;
  }

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
    if (Math.abs(openParen - closeParen) > 0) {
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
    issues.push(...detectTyposFromKnown(code));
    issues.push(...detectPythonSyntaxIssues(code));

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
  // === Python ===
  django: [/\b(manage\.py|MIGRATIONS|settings\.py|INSTALLED_APPS|DJANGO_SETTINGS_MODULE)\b/i, /\bDjango\b/i],
  django_rest: [/\b(ViewSet|ModelSerializer|@api_view|GenericAPIView|ViewSets|REST_FRAMEWORK)\b/i, /\bDjango.*REST\b/i, /\bDRF\b/i],
  flask: [/\b(app\.route|@app|Flask\(|render_template|request\.)/i, /\bFlask\b/i],
  fastapi: [/\b(@app\.|FastAPI|APIRouter|uvicorn Depends|BackgroundTasks|WebSocket)/i, /\bFastAPI\b/i],
  fastapi_route: [/@(app|router)\.(get|post|put|delete|patch)\(/i],
  nestjs: [/\b(@Controller|@Injectable|@Module|NestFactory|@Get|@Post|@Put|@Delete|@Patch)\b/i, /\bNestJS\b/i],
  // === JavaScript/TypeScript ===
  react: [/\b(useState|useEffect|useRef|Component|jsx|React\.)/i, /\bReact\b/i],
  nextjs: [
    /\b(getServerSideProps|getStaticProps|next\/|NextPage|next\/image)\b/i,
    /\b(app\/layout|app\/page|app\/route|server\s*component|client\s*component)\b/i,
    /\bNext\.?js\b/i, /\bNextJS\b/i,
    /\b(generateStaticParams|generateMetadata|'use server'|'use client')\b/i,
    /\b(edge\s*runtime|middleware)\b/i,
  ],
  nodejs: [/\b(module\.exports|require\(|process\.|__dirname|__filename)/i],
  express: [/\b(app|router)\.(get|post|put|delete|patch|use)\(/i, /\bExpress\b/i, /\bexpress\.js\b/i],
  typescript: [/\binterface\s+\w+|type\s+\w+\s*=|:\s*(string|number|boolean|any)\b/i, /\bTypeScript\b/i],
  // === Testing ===
  pytest: [/\bdef test_\w+\(|pytest\.|fixture\(|@pytest\./i, /\bpytest\b/i],
  jest: [/\b(describe|it|test|expect)\s*\(/i, /\bjest\b/i],
  playwright: [/\b(page|expect)\.(click|fill|goTo|waitFor)/i, /\bPlaywright\b/i],
  // === Data ===
  sqlalchemy: [/\b(from sqlalchemy|import sqlalchemy)\b/i],
  pandas: [/\b(pandas|pd\.read_csv|DataFrame|pd\.DataFrame)\b/i, /\bpandas\b/i],
  numpy: [/\b(numpy|np\.array|np\.zeros|np\.ones|import numpy)\b/i, /\bnumpy\b/i],
  matplotlib: [/\b(import matplotlib|from matplotlib|plt\.)/i, /\bmatplotlib\b/i],
  prisma: [/\b(prisma\.|@prisma|model\s+\w+\s*\{)/i],
  // === DevOps / Infrastructure ===
  docker: [/\b(docker-compose|Dockerfile|dockerfile|docker\s+build|docker\s+run)\b/i, /\bFROM\s+\w+/i],
  kubernetes: [/\b(kubectl|deployment|service\s+\w+|ingress|configmap|secret|pod)\b/i, /\bkubernetes\b/i, /\bk8s\b/i],
};

// Intention patterns
const INTENTION_PATTERNS = {
  database: /\b(postgres|mysql|mongodb|sqlite|redis|sql|database|db|query|select|insert|update|delete)\b/i,
  api: /\b(rest|graphql|endpoint|api|route|http|request|response|status\s*code)\b/i,
  testing: /\b(test|jest|pytest|vitest|mocha|unit\s*test|integration\s*test|coverage)\b/i,
  auth: /\b(auth|login|password|token|jwt|oauth|session|permission|role)\b/i,
  devops: /\b(docker|kubernetes|ci\/cd|deploy|nginx|container|pod)\b/i,
  frontend: /\b(component|props|state|jsx|tsx|react|vue|angular|svelte|html|css|style)\b/i,
  backend: /\b(server|api|endpoint|route|controller|service|repository|middleware)\b/i,
  data_processing: /\b(csv|excel|parse|filter|map|reduce|aggregate|transform|clean)\b/i,
  file_io: /\b(read|write|open|file|load|save|export)\b/i,
  // === Architecture patterns ===
  microservices: /\b(microservice|microservices|service\s*mesh|api\s*gateway|event-driven)\b/i,
  serverless: /\b(serverless|lambda|cloud\s*function|aws\s*lambda|azure\s*function|google\s*function)\b/i,
  realtime: /\b(websocket|websockets|real-time|sse|server-sent|pub\/sub|stripe\s*webhook)\b/i,
  graphql: /\b(graphql|apollo|relay|query|mutation|subscription|gql)\b/i,
  // === CMS / Content ===
  cms: /\b(cms|wordpress|drupal|contentful|strapi|headless\s*cms)\b/i,
  // === E-commerce ===
  ecommerce: /\b(ecommerce|shopify|woocommerce|magento|prestashop|cart|checkout|payment|stripe)\b/i,
};

// === JavaScript/TypeScript imports ===
import { verifyJavaScript, extractJSImports, fixJavaScript } from "./javascript.js";
import { verifyTypeScript, fixTypeScript } from "./typescript.js";

// === Code pattern detection ===
export interface CodePatterns {
  crud: boolean;
  api: boolean;
  auth: boolean;
  database: boolean;
}

/**
 * Detecta patrones de codigo: CRUD, API, auth, database
 */
export function detectCodePatterns(code: string): CodePatterns {
  const patterns = {
    crud: /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|READ|UPDATE|DELETE)\b/i.test(code) ||
              /\b(findAll|findOne|create|update|delete|remove|get|post|put|patch|delete)\b/i.test(code),
    api: /\b(fetch|axios|request|response|endpoint|route|api|router|http)\b/i.test(code) ||
            /\b(REST|GraphQL|grpc)\b/i.test(code),
    auth: /\b(auth|login|password|token|jwt|oauth|session|permission|role|bcrypt|hash)\b/i.test(code),
    database: /\b(query|select|insert|update|delete|table|schema|migration|model|entity)\b/i.test(code) ||
              /\b(sql|mongodb|postgres|mysql|redis)\b/i.test(code),
  };
  return patterns;
}

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
  // Normalize language
  const normalizedLang = language.toLowerCase();

  // Detect language if needed
  let detectedLanguage = normalizedLang;
  if (!["python", "javascript", "typescript"].includes(normalizedLang)) {
    // Simple language auto-detection
    if (code.includes("def ") || code.includes("import ") || code.includes("__name__")) {
      detectedLanguage = "python";
    } else if (code.includes("interface ") || code.includes(": string") || code.includes(": number")) {
      detectedLanguage = "typescript";
    } else if (code.includes("const ") || code.includes("let ") || code.includes("function ")) {
      detectedLanguage = "javascript";
    } else {
      detectedLanguage = "python"; // default
    }
  }

  const issues = detectAllIssues(code, detectedLanguage);

  // Apply language-specific fixes
  let fixedCode = code;
  if (detectedLanguage === "python") {
    fixedCode = autoFix(code, "", detectedLanguage);
  } else if (detectedLanguage === "javascript") {
    fixedCode = fixJavaScript(code);
  } else if (detectedLanguage === "typescript") {
    fixedCode = fixTypeScript(code);
  }

  // Count how many fixes were applied
  let fixedCount = 0;
  if (fixedCode !== code) {
    const originalLower = code.toLowerCase();
    const fixedLower = fixedCode.toLowerCase();

    // Count known pattern fixes
    const fixPatterns = [
      "count_items", "sumarray", "appenditem", "data_frame", "datafram",
      "datetimetz", "joinp", "prin", "prnt", "ln", "lne", "lenght",
      "spllit", "stip", "opne", "retur", "impor", "deff", "claass",
      "arraay", "numpyy", "pandass", "countt", "stripp",
    ];

    for (const pattern of fixPatterns) {
      if (originalLower.includes(pattern) && !fixedLower.includes(pattern)) {
        fixedCount++;
      }
    }
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

  // Phase 1: Apply known pattern replacements (original hardcoded patterns)
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

  // Phase 2: Apply KNOWN_TYPOS corrections with Levenshtein-inspired matching
  for (const [correct, typos] of Object.entries(KNOWN_TYPOS)) {
    for (const typo of typos) {
      // Escape regex metacharacters
      const escapedTypo = typo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // Match typo as whole word
      const typoPattern = new RegExp(`\\b${escapedTypo}\\b`, 'g');
      fixed = fixed.replace(typoPattern, correct);
    }
  }

  return fixed;
}

import * as fs from "fs";
import * as path from "path";

// Helper to recursively read directory
function readdirRecursive(dir: string, exclude: Set<string>): string[] {
  const results: string[] = [];
  const basePath = path.resolve(dir);

  function walk(currentDir: string): void {
    try {
      const resolvedDir = path.resolve(currentDir);
      // Path safety check - don't escape base directory
      if (!resolvedDir.startsWith(basePath + path.sep)) return;

      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const resolvedFullPath = path.resolve(fullPath);

        // Skip if resolved path escaped base directory
        if (!resolvedFullPath.startsWith(basePath + path.sep)) continue;

        if (exclude.has(entry.name) || exclude.has(fullPath)) continue;
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile()) {
          results.push(fullPath);
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  walk(dir);
  return results;
}

// Infer language from file extension
function inferLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const langMap: Record<string, string> = {
    ".py": "python",
    ".js": "javascript",
    ".ts": "typescript",
    ".jsx": "javascript",
    ".tsx": "typescript",
  };
  return langMap[ext] || "unknown";
}

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

export interface ScanResult {
  file: string;
  language: string;
  issues: string[];
  issue_count: number;
  is_valid: boolean;
  error?: string;
}

export interface ScanSummary {
  total_files: number;
  total_issues: number;
  files_with_issues: number;
  clean_files: number;
  results: ScanResult[];
}

const DEFAULT_EXCLUDE = new Set([
  "node_modules", ".git", "__pycache__", ".venv", "dist", "build", "coverage"
]);

export function scanProject(
  directory: string,
  extensions?: string[]
): ScanSummary {
  const exts = extensions ?? [".py", ".js", ".ts", ".jsx", ".tsx"];
  const extSet = new Set(exts);

  const files = readdirRecursive(directory, DEFAULT_EXCLUDE);

  const results: ScanResult[] = [];

  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!extSet.has(ext)) continue;

    const language = inferLanguage(file);

    try {
      const content = fs.readFileSync(file, "utf-8");
      const issues = verifyCode(content, language);

      results.push({
        file,
        language,
        issues,
        issue_count: issues.length,
        is_valid: issues.length === 0,
      });
    } catch (err) {
      results.push({
        file,
        language,
        issues: [],
        issue_count: 0,
        is_valid: false,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const filesWithIssues = results.filter((r) => r.issues.length > 0).length;

  return {
    total_files: results.length,
    total_issues: results.reduce((sum, r) => sum + r.issue_count, 0),
    files_with_issues: filesWithIssues,
    clean_files: results.length - filesWithIssues,
    results,
  };
}
