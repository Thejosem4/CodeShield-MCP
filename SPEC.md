# CodeShield MCP - Specification

## 1. Overview

**Name:** CodeShield MCP
**Type:** MCP Server (Model Context Protocol)
**Framework:** TypeScript + Node.js + `@modelcontextprotocol/sdk`
**Purpose:** Prevenir alucinaciones del LLM verificando código contra stdlib y codebase indexado.

---

## 2. Problem Statement

Cuando Claude Code genera código, puede incluir:
- Imports de funciones/bibliotecas que no existen
- Funciones/métodos mal nombrados (typos en APIs reales)
- Variables indefinidas o fuera de scope
- Referencias a clases que no existen

**Consecuencia:** Tokens perdidos en debugging, re-trabajo iterativo.

---

## 3. Objectives

| # | Objetivo | Descripción |
|---|----------|-------------|
| 1 | **Prevención** | Detectar problemas ANTES de que el LLM genere código |
| 2 | **Verificación** | Capa secundaria para verificar código ya generado |
| 3 | **Auto-fix** | Corrección automática cuando sea posible |
| 4 | **Reducción de costos** | Menos tokens en re-trabajo |
| 5 | **Fix Intelligence** | Suggestions enrichecidas con contexto de proyecto |

---

## 4. Lenguajes Soportados

| Lenguaje | Módulo | Auto-fix |
|----------|--------|----------|
| Python | `detection/index.ts` | ✅ |
| JavaScript | `detection/javascript.ts` | ✅ |
| TypeScript | `detection/typescript.ts` | ✅ |
| Go | `detection/go.ts` | ✅ |
| Rust | `detection/rust.ts` | ✅ |
| React | `detection/react.ts` | ❌ |
| Angular | `detection/angular.ts` | ❌ |

---

## 5. Features

### 5.1 Core Features

| Feature | Descripción | Status |
|---------|-------------|--------|
| `analyze_prompt` | Analiza prompt, detecta frameworks, intenciones, security requirements | ✅ |
| `verify_code` | Verifica código contra stdlib y codebase indexado | ✅ |
| `suggest_fix` | Sugiere corrección específica para un issue | ✅ |
| `check_imports` | Valida imports contra stdlib | ✅ |
| `quick_fix` | Aplica fixes automáticos para issues comunes | ✅ |
| `deep_fix` | Fix enriquecido con contexto de proyecto y stdlib | ✅ |
| `suggest_similar_name` | Sugiere correcciones para typos | ✅ |
| `fix_code` | Corrige automáticamente errores detectables | ✅ |
| `index_project` | Indexa el codebase para referencias precisas | ✅ |

### 5.2 Fix Intelligence Layer

Sistema progresivo de sugerencia de fixes:

```
1. Typos conocidos (console.logg → log) → 95% confidence
2. Project index lookup → 95% confidence
3. Stdlib lookup → 90% confidence
4. Fuzzy matching (Levenshtein) → 60-89% confidence
5. Pattern extraction → 40-59% confidence
6. Fallback hints → <40% confidence
```

### 5.3 Security Detection

En `analyze_prompt()`:
- authentication, authorization, input_validation, encryption
- sql_injection, xss, csrf, secrets

### 5.4 Framework Detection

- **Backend:** Django, Flask, FastAPI, Express, NestJS
- **Frontend:** React, Next.js, Angular
- **Testing:** Pytest, Jest, Playwright
- **ORM:** SQLAlchemy, Prisma
- **DevOps:** Docker, Kubernetes

---

## 6. Tools

### 6.1 `analyze_prompt`
- **Input:** Prompt del usuario, language
- **Output:** Detected frameworks, intentions, security requirements, clarity score
- **Acción:** Pre-analysis antes de generación

### 6.2 `verify_code`
- **Input:** Código, language, check_level (fast/standard/thorough)
- **Output:** Lista de problemas detectados
- **Soporta:** Python, JavaScript, TypeScript, Go, Rust, React, Angular

### 6.3 `deep_fix`
- **Input:** Código, issues, language, project_path, mode
- **Output:** Sugerencias enriquecidas con contexto
- **Features:**
  - Progressive lookup (typos → project → stdlib → fuzzy → pattern)
  - Confidence scoring
  - Location info en sugerencias

### 6.4 `index_project`
- **Input:** Directorio, languages, exclude, reindex, cache_ttl
- **Output:** Índice de funciones/clases/imports
- **Protección:** Path traversal segura

---

## 7. Architecture

```
┌─────────────────────────────────────────┐
│           Claude Code (User)             │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          CodeShield MCP Server           │
├─────────────────────────────────────────┤
│  analyze_prompt    → Pre-analysis       │
│  verify_code      → Code verification  │
│  deep_fix         → Contextual fixes   │
│  suggest_fix      → Specific fixes     │
│  check_imports    → Import validation  │
│  quick_fix        → Auto-fixes         │
│  index_project    → Codebase indexing  │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     detection/*.ts  (Language modules)  │
│     - Python, JavaScript, TypeScript   │
│     - Go, Rust, React, Angular         │
└─────────────────────────────────────────┘
```

---

## 8. Security

- **Path traversal protection** en indexProject()
- **CVE database** con 21 packages (CVEs 2023-2024)
- **Input validation** (1MB limit en MCP)
- **ReDoS prevention** con memoization
- **Race condition protection** con file locking
- **Atomic writes** con temp file + rename
- **Cache DoS protection** con LRU eviction

---

## 9. Roadmap

| Version | Feature | Status |
|---------|---------|--------|
| 0.6.0 | CLI, Context, Audit Deps | ✅ |
| 0.6.1 | Security fixes, file locking | ✅ |
| 0.6.2 | JS/TS stdlib expansion | ✅ |
| 0.6.3 | Go, Rust, React, Angular | ✅ |
| 0.6.4 | Verification Engine unificado | ✅ |
| 0.6.5 | Fix Intelligence Layer | ✅ |
| 0.7.0 | Mejoras de detección | 🔲 |

---

*Last updated: 2026-04-14*
