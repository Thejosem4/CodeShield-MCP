/**
 * Fix Intelligence Layer - Lookup Module
 *
 * Handles symbol lookups in cached project indices and language stdlibs.
 */

import { getCachedIndex } from "../cache.js";
import { JS_STDLIB } from "../detection/javascript.js";
import { REACT_STDLIB } from "../detection/react.js";
import { RUST_STDLIB } from "../detection/rust.js";
import { GO_STDLIB } from "../detection/go.js";
import type { ProjectSymbol, StdlibSymbol } from "./types.js";

// Python stdlib data (from detection/index.ts - re-defined here as not exported)
const PY_STDLIB_MODULES = new Set([
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

const PY_STDLIB_FUNCTIONS: Record<string, Set<string>> = {
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
  datetime: new Set(["datetime", "date", "time", "timedelta", "timezone"]),
  typing: new Set([
    "List", "Dict", "Set", "Tuple", "Optional", "Union", "Any", "Callable",
    "TypeVar", "Generic", "Protocol", "IO",
  ]),
};

// TypeScript stdlib - uses JS_STDLIB plus additional types
const TS_STDLIB = JS_STDLIB;

// Angular stdlib (local reference since not exported)
const ANGULAR_MODULES = new Set([
  "NgModule", "Component", "Injectable", "Pipe", "Directive",
  "Input", "Output", "ViewChild", "ViewChildren", "ContentChild", "ContentChildren",
  "HostBinding", "HostListener", "ElementRef", "Renderer2",
  "OnInit", "OnDestroy", "OnChanges", "AfterViewInit", "AfterContentInit",
  "AfterViewChecked", "AfterContentChecked", "DoCheck", "ngOnInit", "ngOnDestroy",
  "NgZone", "ChangeDetectorRef", "ChangeDetectionStrategy",
  "CommonModule", "BrowserModule", "FormsModule", "ReactiveFormsModule",
  "RouterModule", "HttpClientModule",
]);

/**
 * Search for symbols in the cached project index
 */
export function searchProjectIndex(symbol: string, projectPath?: string): ProjectSymbol[] {
  const results: ProjectSymbol[] = [];

  if (!projectPath) {
    return results;
  }

  const index = getCachedIndex(projectPath);
  if (!index) {
    return results;
  }

  const symbolLower = symbol.toLowerCase();

  // Search in classes
  for (const cls of index.classes) {
    if (cls.toLowerCase().includes(symbolLower)) {
      results.push({
        name: cls,
        type: "class",
        location: `${cls} at class definition`,
        frequency: 1,
      });
    }
  }

  // Search in functions
  for (const fn of index.functions) {
    if (fn.toLowerCase().includes(symbolLower)) {
      results.push({
        name: fn,
        type: "function",
        location: `${fn} at function definition`,
        frequency: 1,
      });
    }
  }

  // Search in methods (Record<string, string[]>)
  for (const [className, methods] of Object.entries(index.methods)) {
    for (const method of methods) {
      if (method.toLowerCase().includes(symbolLower)) {
        results.push({
          name: method,
          type: "method",
          location: `${method} at ${className}:method`,
          frequency: 1,
        });
      }
    }
  }

  return results;
}

/**
 * Search for symbols in the language stdlib
 */
export function searchStdlib(symbol: string, language: string): StdlibSymbol[] {
  const results: StdlibSymbol[] = [];
  const symbolLower = symbol.toLowerCase();

  switch (language.toLowerCase()) {
    case "javascript":
    case "js": {
      // Check JS_STDLIB modules
      for (const [module, methods] of Object.entries(JS_STDLIB)) {
        if (module.toLowerCase().includes(symbolLower)) {
          results.push({
            name: module,
            module: module,
            methods: Array.from(methods),
            location: `javascript:${module}`,
          });
        } else {
          // Check if symbol matches any method in the module
          for (const method of methods) {
            if (method.toLowerCase().includes(symbolLower)) {
              results.push({
                name: method,
                module: module,
                methods: Array.from(methods),
                location: `javascript:${module}.${method}`,
              });
              break;
            }
          }
        }
      }
      break;
    }

    case "typescript":
    case "ts": {
      // TypeScript uses JS_STDLIB plus its own type system
      for (const [module, methods] of Object.entries(TS_STDLIB)) {
        if (module.toLowerCase().includes(symbolLower)) {
          results.push({
            name: module,
            module: module,
            methods: Array.from(methods),
            location: `typescript:${module}`,
          });
        } else {
          for (const method of methods) {
            if (method.toLowerCase().includes(symbolLower)) {
              results.push({
                name: method,
                module: module,
                methods: Array.from(methods),
                location: `typescript:${module}.${method}`,
              });
              break;
            }
          }
        }
      }
      break;
    }

    case "react":
    case "reactjs": {
      // Check React stdlib
      for (const [module, methods] of Object.entries(REACT_STDLIB)) {
        if (module.toLowerCase().includes(symbolLower)) {
          results.push({
            name: module,
            module: module,
            methods: Array.from(methods),
            location: `react:${module}`,
          });
        } else {
          for (const method of methods) {
            if (method.toLowerCase().includes(symbolLower)) {
              results.push({
                name: method,
                module: module,
                methods: Array.from(methods),
                location: `react:${module}.${method}`,
              });
              break;
            }
          }
        }
      }
      break;
    }

    case "angular":
    case "angularjs": {
      // Check Angular modules
      for (const module of ANGULAR_MODULES) {
        if (module.toLowerCase().includes(symbolLower)) {
          results.push({
            name: module,
            module: module,
            methods: [],
            location: `angular:${module}`,
          });
        }
      }
      break;
    }

    case "python":
    case "py": {
      // Check Python stdlib modules
      for (const module of PY_STDLIB_MODULES) {
        if (module.toLowerCase().includes(symbolLower)) {
          results.push({
            name: module,
            module: module,
            methods: [],
            location: `python:${module}`,
          });
        }
      }
      // Check Python stdlib functions
      for (const [module, functions] of Object.entries(PY_STDLIB_FUNCTIONS)) {
        for (const fn of functions) {
          if (fn.toLowerCase().includes(symbolLower)) {
            results.push({
              name: fn,
              module: module,
              methods: Array.from(functions),
              location: `python:${module}.${fn}`,
            });
            break;
          }
        }
      }
      break;
    }

    case "rust":
    case "rs": {
      // Check Rust stdlib
      for (const [module, methods] of Object.entries(RUST_STDLIB)) {
        if (module.toLowerCase().includes(symbolLower)) {
          results.push({
            name: module,
            module: module,
            methods: Array.from(methods),
            location: `rust:${module}`,
          });
        } else {
          for (const method of methods) {
            if (method.toLowerCase().includes(symbolLower)) {
              results.push({
                name: method,
                module: module,
                methods: Array.from(methods),
                location: `rust:${module}::${method}`,
              });
              break;
            }
          }
        }
      }
      break;
    }

    case "go":
    case "golang": {
      // Check Go stdlib
      for (const [module, functions] of Object.entries(GO_STDLIB)) {
        if (module.toLowerCase().includes(symbolLower)) {
          results.push({
            name: module,
            module: module,
            methods: Array.from(functions),
            location: `go:${module}`,
          });
        } else {
          for (const fn of functions) {
            if (fn.toLowerCase().includes(symbolLower)) {
              results.push({
                name: fn,
                module: module,
                methods: Array.from(functions),
                location: `go:${module}.${fn}`,
              });
              break;
            }
          }
        }
      }
      break;
    }
  }

  return results;
}

/**
 * Get formatted location string for a symbol
 */
export function getSymbolLocation(symbol: string, projectPath?: string): string {
  // Try project index first
  const projectResults = searchProjectIndex(symbol, projectPath);
  if (projectResults.length > 0) {
    return projectResults[0].location;
  }

  // Try to detect language from common patterns
  const language = detectLanguageFromSymbol(symbol);

  // Try stdlib with detected or provided language
  if (language) {
    const stdlibResults = searchStdlib(symbol, language);
    if (stdlibResults.length > 0) {
      return stdlibResults[0].location;
    }
  }

  return "";
}

/**
 * Detect language from symbol patterns
 */
function detectLanguageFromSymbol(symbol: string): string | null {
  // Rust patterns (:: separator, SnakeCase)
  if (symbol.includes("::") || /^[A-Z][a-z]+([A-Z][a-z]+)*$/.test(symbol)) {
    // Could be Rust
    if (symbol.includes("::")) return "rust";
  }

  // Go patterns (TitleCase without separator)
  if (/^[A-Z][a-z]+$/.test(symbol) && symbol.length > 3) {
    // Could be Go
    if (symbol === "Print" || symbol === "Println" || symbol === "Printf") {
      return "go";
    }
  }

  // Python patterns (snake_case)
  if (/_[a-z]/.test(symbol)) {
    return "python";
  }

  // JavaScript/TypeScript patterns (camelCase or PascalCase)
  if (/^[a-z][a-zA-Z]+$/.test(symbol) || /^[A-Z][a-zA-Z]+$/.test(symbol)) {
    return "javascript";
  }

  // React patterns (capitalized components)
  if (/^[A-Z][a-z]+(?:[A-Z][a-z]+)*$/.test(symbol)) {
    return "react";
  }

  return null;
}
