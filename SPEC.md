# CodeShield MCP - Specification

## 1. Overview

**Name:** CodeShield MCP
**Type:** MCP Server (Model Context Protocol)
**Framework:** TypeScript + Node.js + `@modelcontextprotocol/sdk`
**Purpose:** Prevenir alucinaciones del LLM antes de que genere código, ahorrar tokens y hacer más efectivos los cambios de Claude Code.

---

## 2. Problem Statement

Cuando Claude Code (o cualquier agente LLM) genera código, puede incluir:
- Imports de funciones/bibliotecas que no existen
- Funciones/métodos mal nombrados (typos en APIs reales)
- Variables indefinidas o fuera de scope
- Referencias a clases que no existen en el codebase

**Consecuencia:** Tokens perdidos en debugging, re-trabajo iterativo, frustración del usuario.

---

## 3. Objectives

| # | Objetivo | Descripción |
|---|----------|-------------|
| 1 | **Prevención** | Detectar problemas ANTES de que el LLM genere código |
| 2 | **Verificación** | Capa secundaria para verificar código ya generado |
| 3 | **Auto-fix** | Corrección automática cuando sea posible |
| 4 | **Reducción de costos** | Menos tokens en re-trabajo y debugging |
| 5 | **Efectividad** | Cambios de Claude Code más precisos desde el inicio |

---

## 4. Scope

### 4.1 Lenguajes (v1.0)
- **Python** ← Prioridad
- **JavaScript**
- **TypeScript**

> Expansión futura documentada en `roadmap.md`

### 4.2 Detección Inicial
- Imports/bibliotecas inexistentes
- Funciones/métodos/classes no existentes o con typos
- Errores de sintaxis básicos

### 4.3 Detección Futura (extensible)
- Lógica/algoritmos problemáticos
- Patrones de código inseguro
- Code smells

### 4.4 Configuración Extensible
```yaml
# .codeshield.yaml (NO sube a GitHub)
detection:
  patterns:
    - logic_issues: true
    - algorithm_quality: false  # futuro
    - security_hints: false      # futuro
```

---

## 5. Features

### 5.1 Core Features

| Feature | Descripción | Prioridad | Status |
|---------|-------------|-----------|--------|
| `analyze_prompt` | Analiza el prompt del usuario antes de generar código | ALTA | ✅ |
| `verify_code` | Verifica código generado contra el codebase real | ALTA | ✅ |
| `suggest_similar` | Sugiere funciones/clases válidas similares a las mal escritas | MEDIA | ✅ |
| `fix_code` | Corrige automáticamente errores detectables | ALTA | ✅ |
| `index_project` | Indexa el codebase del usuario para referencias precisas | MEDIA | ✅ |
| `verifyAndFix()` | Verifica y corrige código en una sola llamada | ALTA | ✅ (v0.4.0) |

### 5.2 Auto-fix (Prioridad para comunidad)

```python
# Ejemplo: LLM escribe
from pandas import DataFrame # existe
from pandas import data_frame  # typo: no existe

# CodeShield detecta:
# "data_frame" no existe en pandas. ¿Quisiste decir "DataFrame"?
# Auto-fix: corrige a DataFrame
```

### 5.3 Resource Templates

CodeShield expone índices de código via MCP resources:
- `codebase://index/{directory}` - Índice de funciones, clases, imports de un directorio
- `codebase://index-list` - Lista de índices cacheados

### 5.4 Framework Detection

`analyze_prompt()` detecta frameworks en el prompt:
- **Backend:** Django, Flask, FastAPI, Express, NestJS
- **Frontend:** React, Next.js
- **Testing:** Pytest, Jest, Playwright
- **ORM:** SQLAlchemy, Prisma

### 5.5 Intention Detection

`analyze_prompt()` detecta intenciones del código:
- `database`, `api`, `testing`, `auth`, `devops`, `frontend`, `backend`

### 5.6 Hooks Automáticos

Integración en `CLAUDE.md` del proyecto:
```markdown
## CodeShield Integration
- Antes de generar código: análisis de prompts
- Después de generar: verificación contra codebase
- Si error detectado: auto-fix o warning
```

---

## 6. Architecture

```
┌─────────────────────────────────────────┐
│           Claude Code (User)            │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│          CodeShield MCP Server          │
├─────────────────────────────────────────┤
│  pre_analyze_prompt    → Analiza prompt │
│  verify_generated_code → Verifica código │
│  suggest_similar      → Sugiere fixes   │
│  auto_fix              → Corrige auto   │
│  index_codebase        → Indexa refs    │
└─────────────────┬───────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│     Codebase Index ( user's project)    │
│     .codeshield.yaml (local config)     │
└─────────────────────────────────────────┘
```

---

## 7. Tools

### 7.1 `analyze_prompt`
- **Input:** Prompt del usuario, language (python|javascript|typescript)
- **Output:** `{ intended_imports, intended_functions, warnings, detected_frameworks, detected_intentions }`
- **Acción:** Detecta qué librerías/funciones planea usar y qué frameworks/intenciones tiene

### 7.2 `verify_code`
- **Input:** Código generado, language, code_base_index (opcional), auto_fix (opcional)
- **Output:** Lista de problemas detectados
- **Acción:** Verifica código contra stdlib y codebase indexado
- **Soporta:** Python, JavaScript, TypeScript

### 7.3 `suggest_similar`
- **Input:** Nombre mal escrito, context (módulo opcional), language
- **Output:** Lista de matches similares en el stdlib
- **Acción:** Helper para encontrar correcciones

### 7.4 `fix_code`
- **Input:** Código con errores, error (opcional), language
- **Output:** Código corregido
- **Acción:** Solo para errores 100% detectables (typos de métodos)

### 7.5 `index_project`
- **Input:** Directorio del proyecto, languages, exclude, reindex, cache_ttl
- **Output:** Índice de funciones/clases/imports disponibles
- **Acción:** Construye base de referencia con cache en memoria
- **Protección:** Path traversal segura con `path.resolve()` containment check

---

## 8. Installation

```bash
# Clone
git clone https://github.com/Thejosem4/CodeShield-MCP.git
cd CodeShield-MCP

# Install dependencies
cd src
npm install

# Build
npm run build

# Configure MCP in your Claude Code settings
```

---

## 9. Configuration

### 9.1 Local (`.codeshield.yaml` - no commit)
```yaml
detection:
  languages:
    - python
    - javascript
    - typescript
  auto_fix: true
  strict_mode: false
  patterns:
    imports: true
    functions: true
    classes: true
    logic: false  # future
```

---

## 10. Roadmap

### Estado Actual (v0.4.2)

| Feature | Estado |
|---------|--------|
| Python/JS/TS: imports, funciones, classes | ✅ Implementado |
| Auto-fix para errores comunes | ✅ Implementado |
| Framework detection | ✅ Implementado |
| Intention detection | ✅ Implementado |
| Cache en memoria | ✅ Implementado |

### Próximos Pasos

| Versión | Feature | Descripción |
|---------|---------|-------------|
| v0.5.0 | **Publicar en npm** | `npm install -g codeshield-mcp` |
| v0.6.0 | **Bin ejecutable** | `codeshield` en PATH |
| v0.7.0 | **Auto-config Claude Code** | Integración automática |
| v1.0.0 | **Release estable** | Primera versión producción |

### Features Futuras (Post-v1.0)

| Versión | Feature |
|---------|---------|
| v1.1 | Go, Rust, Java support |
| v2.0 | Detección de lógica/algoritmos |
| v2.1 | Integración con linters (pylint, eslint) |
| v3.0 | AI-powered suggestions |

---

## 11. For Community

**Valor para la comunidad:**
- Zero código malo antes de ejecutar
- Ahorro de tokens en cada solicitud
- Auto-fix = menos trabajo manual
- Extensible via config

**Cómo contribuir:**
- Tests para nuevos lenguajes
- Patterns de detección
- Auto-fix rules
- Documentación

---

*Last updated: 2026-04-07*
*Nota: Implementación migrada de Python a TypeScript (src/ = TypeScript, src-python/ = legacy)*