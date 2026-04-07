# CodeShield MCP

**Prevenir alucinaciones del LLM antes de que genere código.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)

---

## ¿Qué es?

CodeShield MCP es un servidor MCP (Model Context Protocol) que actúa como **primera línea de defensa** contra código generado incorrectamente por agentes LLM como Claude Code.

### El Problema

Cuando un LLM genera código, puede incluir:
- ❌ Imports de funciones que no existen
- ❌ Funciones con typos (`data_frame` en vez de `DataFrame`)
- ❌ Métodos incorrectos (`.count_items()` en vez de `.count()`)
- ❌ Clases mal nombradas (`.DatetimeTZ()` en vez de `.datetime()`)
- ❌ Errores de sintaxis básicos

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

**Versión:** 0.4.0 (ALPHA)

### Herramientas Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `analyze_prompt` | Analiza prompts, detecta frameworks e intenciones |
| `verify_code` | Verifica código generado (Python, JS, TS) |
| `suggest_similar_name` | Sugiere correcciones para typos |
| `fix_code` | Corrige automáticamente errores |
| `index_project` | Indexa proyecto con cache en memoria |

### Lenguajes Soportados

- 🐍 **Python** - Soporte completo
- 📜 **JavaScript** - Soporte completo (console, Math, JSON, Array, Object, etc.)
- 🔷 **TypeScript** - Soporte completo (types, interfaces, enums, generics)

### Features v0.4.0

- 🔧 **Auto-fix** - `verifyAndFix()` corrige typos automáticamente
- 💾 **Cache** - Indexación en memoria con TTL configurable
- 🧩 **Resource templates** - `codebase://index/{directory}` via MCP resources
- 🏗️ **Framework detection** - Django, Flask, FastAPI, React, Next.js, Express, NestJS
- 🎯 **Intention detection** - database, api, testing, auth, devops, frontend, backend

---

## Instalación

### Prerrequisitos

- Node.js 20+
- npm 10+

### Pasos

```bash
# Clonar
git clone https://github.com/Thejosem4/CodeShield-MCP.git
cd CodeShield-MCP

# Instalar dependencias
cd src
npm install

# Desarrollo (con hot-reload)
npm run dev

# Build para producción
npm run build
```

### Configuración en Claude Code

Agregar a `~/.mcp.json`:

```json
{
  "mcpServers": {
    "codeshield": {
      "command": "cmd",
      "args": [
        "/c",
        "npx",
        "tsx",
        "C:/Projects/CodeShield-MCP/src/src/server.ts"
      ],
      "cwd": "C:/Projects/CodeShield-MCP/src"
    }
  }
}
```

---

## Uso

### analyze_prompt

```typescript
// Analiza un prompt antes de generar código
const result = await codeshield.analyze_prompt({
  prompt: "Create a React component with FastAPI backend for user authentication",
  language: "python"
});
// → {
//   intended_imports: [],
//   intended_functions: [],
//   warnings: ["Intenciones detectadas: api, auth, frontend, backend"],
//   detected_frameworks: ["fastapi", "react"],
//   detected_intentions: ["api", "auth", "frontend", "backend"]
// }
```

### verify_code

```typescript
// Verifica código generado (soporta Python, JavaScript, TypeScript)
const errors = await codeshield.verify_code({
  code: `from pandas import data_frame
arr.sumArray()`,
  language: "python"
});
// → ["Línea 1: 'data_frame' no existe en 'pandas'. ¿Quisiste decir 'DataFrame'?",
//    "Línea 2: El método 'sumArray()' no existe. ¿Quisiste decir 'sum()'?"]

// JavaScript
const jsErrors = await codeshield.verify_code({
  code: `console.logg("Hello")`,
  language: "javascript"
});
// → ["Línea 1: Posible typo 'logg' - ¿quisiste decir 'log'?"]

// TypeScript
const tsErrors = await codeshield.verify_code({
  code: `const x: any = 5;`,
  language: "typescript"
});
// → ["Línea 1: Uso de ': any' detectado. Considera usar 'unknown'"]
```

### index_project

```typescript
// Indexa el proyecto para referencias precisas
const index = await codeshield.index_project({
  directory: "/path/to/project",
  languages: "python,typescript"
});
// → { classes: ["User", "Product"], functions: ["validate_email"], methods: {}, imports: ["pandas"] }
```

---

## Configuración

### `.codeshield.yaml` (local, no sube a GitHub)

```yaml
detection:
  languages:
    - python
    - javascript
  auto_fix: true
  patterns:
    imports: true
    functions: true
    classes: true
    syntax: true

index:
  exclude:
    - node_modules
    - venv
    - dist
```

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [SPEC.md](SPEC.md) | Especificación técnica completa |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Features futuras y timeline |
| [docs/DEVELOPMENT-PLAN.md](docs/DEVELOPMENT-PLAN.md) | Plan de desarrollo |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |

---

## Seguridad

Si descubres una vulnerabilidad de seguridad, por favor reporta a través de **[GitHub Issues](../../issues/new?template=bug_report.yml)** con la etiqueta `security`.

---

## Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

**CodeShield MCP - Zero alucinaciones de código**