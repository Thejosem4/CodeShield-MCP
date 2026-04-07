# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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