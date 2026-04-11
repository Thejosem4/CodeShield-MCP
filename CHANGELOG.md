# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [0.6.0] - 2026-04-11 - ALPHA

### Added
- ✅ **CLI Module** (`src/cli.ts`) - Nuevo módulo CLI con comandos:
  - `verify <file>` - Verificar archivo para alucinaciones
  - `scan [directory]` - Escanear proyecto completo
  - `explain <file>` - Explicar hallazgos
  - `audit-deps [requirements.txt]` - Auditar CVEs en dependencias
  - `context save/list/restore/delete` - Persistencia de contexto de codificación
  - `serve` - Iniciar servidor MCP
- ✅ **Context Persistence** (`src/context-store.ts`) - Sistema de guardado de contexto
  - `saveContext()`, `listContexts()`, `getContext()`, `deleteContext()`
  - `exportContexts()`, `importContexts()` para backup/restore
  - Almacenamiento en `~/.codeshield/context-store.json`
- ✅ **Audit Dependencies** (`src/audit-deps.ts`) - Auditoría de CVEs
  - Database de CVEs conocidos (10+ packages)
  - Parser multi-operador (>=, <=, ==, !=, <, >, ~=)
- ✅ **scanProject()** - Nueva función para escanear proyectos completos
- ✅ **Entrada unificada** (`src/index.ts`) - Detecta CLI vs MCP mode automáticamente

### Changed
- 🔄 Version bump de 0.5.0 → 0.6.0
- 🔄 Descripción actualizada: "MCP server and CLI"
- 🔄 Bin entry point cambiado a `dist/index.js` para soportar CLI + MCP

### Detection Improvements
- **TypeScript**: Utility types expandidos, detección de enum/namespace vacío, unsafe `any` usage
- **Python**: Mutable default arguments, bare except, tabs vs spaces mezclados, más typos Django/Flask/FastAPI

### Security Fixes
- 🛡️ `audit-deps.ts`: Parser multi-operador, CVE database expandido
- 🛡️ `context-store.ts`: Try-catch para JSON corrupto, validación de inputs, backup automático

### Tests
- ✅ 85 tests pasando (reducido de 124 por consolidación de archivos .test.js en dist removidos)

---

## [0.5.0] - 2026-04-11 - ALPHA

### Added
- ✅ `.npmignore` - Excluye archivos de desarrollo (src/, tests/, *.test.ts, tsconfig.json, etc.)
- ✅ `files` field en package.json - Define archivos exactos a incluir en el paquete npm
- ✅ `prepublishOnly` script - Build automático antes de publicar
- ✅ README.md y LICENSE en el paquete npm

### Changed
- 🔄 Version bump de 0.4.0 → 0.5.0
- 🔄 Descripción del paquete expandida
- 🔄 Keywords agregados: python, javascript
- 🔄 Scripts de test: de `echo 'No tests yet'` → `vitest run`

### Fixed
- 🐛 Tests rotos (6 tests que fallaban) - threshold de detección corregido
- 🐛 Regex de jest malformado
- 🐛 Mensaje de "Generics desbalanceados" estandarizado

### Tests
- ✅ 124 tests pasando (incluye 39 tests de v0.4.x)

---

## [0.4.2] - 2026-04-10 - ALPHA

### Fixed
- 🐛 `pd.data_frame()` ahora se detecta como typo (antes no se detectaba)
- 🐛 `detectTyposFromKnown()` - nueva función que usa KNOWN_TYPOS para verificar
- 🐛 Framework detection: `sqlalchemy` ya no da falsos positivos
- ✅ Framework detection: `pandas`, `numpy`, `matplotlib` agregados
- ✅ Intention detection: `data_processing`, `file_io` agregados

---

## [0.4.1] - 2026-04-10 - ALPHA

### Added
- ✅ `fixJavaScript()` - Nueva función para corregir typos en JavaScript
  - Aplica correcciones usando `JS_TYPOS` (console.logg, json.stringfy, etc.)
  - Case-insensitive matching
- ✅ `fixTypeScript()` - Nueva función para TypeScript
  - Hereda correcciones de JavaScript
- ✅ `KNOWN_TYPOS` expandido de 7 a ~50+ typos comunes en Python
  - Built-in functions: print, len, sum, count, append, etc.
  - Data structures: DataFrame, deque, datetime, Counter
  - Pandas/numpy: pandas, numpy, array
  - String methods: split, strip, lower, upper
  - Control flow: return, import, class, def, except

### Changed
- 🔄 `autoFix()` ahora usa `KNOWN_TYPOS` para correcciones
- 🔄 `verifyAndFix()` ahora detecta lenguaje y aplica fix apropiado
  - Python: `autoFix()`
  - JavaScript: `fixJavaScript()`
  - TypeScript: `fixTypeScript()`

### Fixed
- 🛡️ Regex escaping en fix patterns

### Tests
- ✅ `src/detection/javascript.test.ts` - 11 tests para fixJavaScript
- ✅ `src/detection/typescript.test.ts` - 4 tests para fixTypeScript
- ✅ `src/detection/index.test.ts` - 24 tests para autoFix y verifyAndFix

---

## [0.4.0] - 2026-04-07 - ALPHA

### Added
- ✅ `verifyAndFix()` - Función que verifica y corrige código automáticamente
- ✅ `auto_fix` parameter en `verify_code` tool - aplica fixes automáticamente
- ✅ `src/src/cache.ts` - Sistema de cache en memoria para index de proyectos
  - `getCachedIndex()`, `setCachedIndex()`, `invalidateIndex()`, `getCacheStats()`
  - TTL configurable (default 5 min)
- ✅ Resource templates registrados:
  - `codebase://index/{directory}` - Índice de funciones, clases, imports
  - `codebase://index-list` - Lista de todos los índices cacheados
- ✅ Motor de detección JavaScript (`src/src/detection/javascript.ts`)
  - Stdlib completo: console, Math, JSON, Array, Object, String, Map, Set, Promise, etc.
  - Detección de typos en métodos JS
  - Detección de errores de sintaxis (paréntesis, llaves, corchetes, comillas desbalanceados)
  - `extractJSImports()` con soporte para ES modules y CommonJS
  - Patrones de módulos Node.js (fs, path, os, http, etc.)
- ✅ Motor de detección TypeScript (`src/src/detection/typescript.ts`)
  - Extiende el motor de JavaScript
  - Detección de types, interfaces, enums, generics
  - Warnings para uso de `: any`
- ✅ Detección de frameworks en `analyzePrompt()`
  - Django, Flask, FastAPI, React, Next.js, Node.js, Express, NestJS
  - TypeScript, Pytest, Jest, Playwright, SQLAlchemy, Prisma
- ✅ Detección de intenciones en `analyzePrompt()`
  - database, api, testing, auth, devops, frontend, backend

### Changed
- 🔄 `analyzePrompt()` ahora retorna `detected_frameworks` y `detected_intentions`
- 🔄 `AnalysisResult` interface expandida con campos opcionales para frameworks/intentions

### Security
- 🛡️ Path traversal protection en `indexProject()` - usa `path.resolve()` + containment check
- 🛡️ Regex injection protection en `extractJSImports()` - escapa metacaracteres
- 🛡️ Input size limits - `MAX_INPUT_SIZE = 1MB` en todos los Zod schemas

### Technical Details

**Nuevos archivos:**
```
src/src/cache.ts                              # Cache system
src/src/detection/javascript.ts                # JS detection (~370 LOC)
src/src/detection/typescript.ts               # TS detection (~160 LOC)
```

**Dependencias:**
- `zod` ^4.3.6 (ya existente)

---

## [0.3.0] - 2026-04-06 - ALPHA

### Changed
- 🔄 **BREAKING** Migración completa de Python a TypeScript
  - El paquete ahora es Node.js/TypeScript, no Python
  - `src-python/` removido (código legado)
  - `tests/` removido (tests de Python)
  - `requirements.txt` y `setup.py` removidos
  - Nuevo stack: TypeScript + `@modelcontextprotocol/sdk`
- 🔄 CI workflows actualizados para Node.js (20+) en vez de Python
- 🔄 README.md, CLAUDE.md, SPEC.md actualizados para reflejar stack TypeScript
- 🔄 Issue templates actualizados (Python environment → Node.js)

### Added
- ✅ `src/src/server.ts` - MCP server con TypeScript SDK
- ✅ `src/src/detection/index.ts` - Motor de detección en TypeScript
- ✅ `src/package.json` - Dependencias Node.js
- ✅ `src/tsconfig.json` - Configuración TypeScript
- ✅ `docs/DEVELOPMENT-PLAN.md` - Plan de desarrollo v0.4.0+

### Removed
- ❌ `src-python/` - Código Python legacy (migrado a TypeScript)
- ❌ `tests/` - Tests de Python (no aplican a TypeScript)
- ❌ `venv/`, `.pytest_cache/` - Ambiente Python
- ❌ `.github/workflows/release.yml` - PyPI release (usar npm)
- ❌ `config/`, `docs/VERSION-GUIDE.md`, `docs/quickstart.md`

### Technical Details

**Nuevo stack:**
- Node.js 20+
- TypeScript 5.3+
- `@modelcontextprotocol/sdk` ^1.0.0
- `zod` ^4.3.6
- `tsx` para desarrollo con hot-reload

**Estructura:**
```
src/
├── src/
│   ├── server.ts           # MCP server
│   └── detection/
│       └── index.ts        # Detection engine
├── package.json
└── tsconfig.json
```

---

## [0.2.0] - 2026-04-04 - ALPHA

### Added
- ✅ `verify_generated_code` - Verificación de código contra codebase
- ✅ `pre_analyze_prompt` - Análisis de prompts antes de generar
- ✅ `suggest_similar` - Sugerencias para typos
- ✅ `auto_fix` - Corrección automática de errores comunes
- ✅ `index_codebase` - Indexación de proyectos Python/JS/TS
- ✅ Detection engine `imports.py` - Detecta imports inexistentes y typos
- ✅ Detection engine `functions.py` - Detecta métodos con typos (count_items, sumArray)
- ✅ Detection engine `classes.py` - Detecta clases mal nombradas (DatetimeTZ, datafram)

---

## [0.1.0] - 2026-04-04 - PRE-ALPHA

### Added
- Estructura inicial del proyecto
- SPEC.md con especificación completa
- requirements.txt con dependencias base
- .gitignore configurado
- Template de configuración
- docs/ROADMAP.md
- .github/workflows/ci.yml
- .github/ISSUE_TEMPLATE/

---

*Last updated: 2026-04-07*