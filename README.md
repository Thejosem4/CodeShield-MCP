# CodeShield MCP

**Prevenir alucinaciones del LLM antes de que genere código.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-v0.6.0-red.svg)](https://www.npmjs.com/package/codeshield-verify-mcp)

---

## ¿Qué es?

CodeShield es un **servidor MCP y CLI** que actúa como primera línea de defensa contra código generado incorrectamente por agentes LLM como Claude Code.

### El Problema

Cuando un LLM genera código, puede incluir:
- Imports de funciones que no existen
- Funciones con typos (`data_frame` en vez de `DataFrame`)
- Métodos incorrectos (`.count_items()` en vez de `.count()`)
- Errores de sintaxis básicos
- Dependencias con vulnerabilidades conocidas (CVEs)

**Resultado:** Tokens perdidos en debugging, re-trabajo iterativo, frustración.

### La Solución

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Tú (prompt)   │ ──▶ │  CodeShield MCP  │ ──▶ │  Código verificado│
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                    ✅ Código limpio = Menos tokens
                    ❌ Error detectado = Se corrigió
```

---

## Estado Actual

**Versión:** 0.6.0 (ALPHA) - [npm package](https://www.npmjs.com/package/codeshield-verify-mcp)

### Modos de Uso

| Modo | Descripción |
|------|-------------|
| **MCP Server** | Integración con Claude Code, Claude CLI, Gemini CLI |
| **CLI** | Comandos standalone para verificación directa |

### Herramientas MCP

| Herramienta | Descripción |
|-------------|-------------|
| `analyze_prompt` | Analiza prompts, detecta frameworks e intenciones |
| `verify_code` | Verifica código generado (Python, JS, TS) |
| `suggest_similar_name` | Sugiere correcciones para typos |
| `fix_code` | Corrige automáticamente errores |
| `index_project` | Indexa proyecto con cache en memoria |
| `audit_deps` | Audita dependencias contra CVEs conocidos |

### Comandos CLI

| Comando | Descripción |
|---------|-------------|
| `codeshield verify <file>` | Verificar archivo para alucinaciones |
| `codeshield scan [dir]` | Escanear proyecto completo |
| `codeshield explain <file>` | Explicar hallazgos |
| `codeshield audit-deps <file>` | Auditar CVEs en requirements.txt |
| `codeshield context save <name>` | Guardar contexto de codificación |
| `codeshield context list` | Listar contextos guardados |
| `codeshield serve` | Iniciar servidor MCP |
| `codeshield --version` | Mostrar versión |

### Lenguajes Soportados

- **Python** - Stdlib, pandas, numpy, Django, Flask, FastAPI
- **JavaScript** - Node.js stdlib, console, Math, JSON, Array, Object
- **TypeScript** - Types, interfaces, enums, generics, utility types

---

## Características v0.6.0

- **Auto-fix** - Corrige typos automáticamente (Python, JS, TS)
- **Context Persistence** - Guardar/restaurar estado de codificación
- **Dependency Audit** - Detecta CVEs en requirements.txt
- **Project Scanner** - Escanea proyectos completos recursivamente
- **Cache en memoria** - Indexación con TTL configurable
- **Framework detection** - Django, Flask, FastAPI, React, Next.js, Express, NestJS, pandas, numpy, matplotlib
- **Intention detection** - database, api, testing, auth, devops, frontend, backend

---

## Instalación

### Desde npm (recomendado)

```bash
# Instalación global
npm install -g codeshield-verify-mcp

# O usar directamente con npx
npx codeshield-verify-mcp
```

### Desde código fuente

```bash
# Clonar
git clone https://github.com/Thejosem4/CodeShield-MCP.git
cd CodeShield-MCP

# Instalar dependencias
cd src
npm install

# Build
npm run build

# Desarrollo (con hot-reload)
npm run dev
```

### Configuración en Claude Code

Agregar a tu config de Claude Desktop:

```json
{
  "mcpServers": {
    "codeshield": {
      "command": "npx",
      "args": ["codeshield-verify-mcp", "serve"]
    }
  }
}
```

O si lo instalaste desde código fuente:

```json
{
  "mcpServers": {
    "codeshield": {
      "command": "node",
      "args": ["C:/Projects/CodeShield-MCP/src/dist/index.js", "serve"]
    }
  }
}
```

---

## Uso CLI

```bash
# Verificar un archivo
codeshield verify miarchivo.py

# Escanear proyecto completo
codeshield scan ./src --extensions .ts,.js

# Output JSON para scripting
codeshield verify miarchivo.py --json

# Guardar contexto de codificación
codeshield context save mi-sesion --files "src/app.py,src/utils.py" --notes "trabajando en auth"

# Listar contextos guardados
codeshield context list

# Auditar dependencias
codeshield audit-deps requirements.txt
```

---

## Uso MCP

```typescript
// Analizar prompt
const result = await codeshield.analyze_prompt({
  prompt: "Create a FastAPI endpoint for user authentication",
  language: "python"
});
// → { detected_frameworks: ["fastapi"], detected_intentions: ["api", "auth", "backend"] }

// Verificar código
const errors = await codeshield.verify_code({
  code: "from pandas import data_frame\narr.sumArray()",
  language: "python"
});
// → ["Línea 1: 'data_frame' parece ser un typo. ¿Quisiste decir 'DataFrame'?"]

// Verificar y auto-fix
const result = await codeshield.verify_code({
  code: "arr.sumArray()",
  language: "javascript",
  auto_fix: true
});
// → { issues: [...], fixed_code: "arr.sum()", fixed_count: 1 }

// Auditar dependencias
const audit = await codeshield.audit_deps({
  requirements: "flask<2.0\ndjango>=3.2\nrequests"
});
```

---

## API Reference

### MCP Tools

| Tool | Input | Output |
|------|-------|--------|
| `analyze_prompt` | `prompt: string`, `language?: string` | `AnalysisResult` con frameworks e intenciones |
| `verify_code` | `code: string`, `language?: string`, `auto_fix?: boolean` | Array de errores o `VerifyAndFixResult` |
| `suggest_similar_name` | `name: string`, `context?: string`, `language?: string` | Array de sugerencias |
| `fix_code` | `code: string`, `error?: string`, `language?: string` | Código corregido |
| `index_project` | `directory: string`, `languages?: string`, `exclude?: string` | `IndexResult` con classes, functions, imports |
| `audit_deps` | `requirements: string` | Array de `AuditResult` con CVEs |
| `cache_stats` | (vacío) | Estadísticas del cache |
| `cache_clear` | (vacío) | Limpia el cache |

### MCP Resources

| Resource | URI | Descripción |
|----------|-----|-------------|
| `codebase-index` | `codeshield://index/{directory}` | Índice de un proyecto |
| `codebase-index-list` | `codeshield://index/list` | Lista de índices cacheados |

---

## Seguridad

### Path Traversal Protection

`scanProject()` y `indexProject()` validan que las rutas no escapen del directorio base.

### CVE Database

Audit de dependencias contra database de CVEs conocidos:
- pyyaml, requests, flask, django, jinja2, urllib3, pillow, cryptography, paramiko, setuptools
- numpy, pandas, openssl

### Input Validation

- Límite de 1MB para todos los inputs
- Validación de rutas con `path.resolve()`
- Escaping de metacaracteres en regex

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [SPEC.md](SPEC.md) | Especificación técnica completa |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Features futuras y timeline |

---

## Roadmap

| Fase | Descripción | Estado |
|------|-------------|--------|
| **v0.6.0** | CLI + Context Persistence + Audit Deps | ✅ Listo |
| **v0.7.0** | Sandbox execution para código real | 🔲 Pendiente |
| **v0.8.0** | REST API backend opcional | 🔲 Pendiente |
| **v1.0.0** | Release estable | 🔲 Pendiente |

---

## Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

**CodeShield - Zero alucinaciones de código**