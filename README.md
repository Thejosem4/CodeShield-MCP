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

**Versión:** 0.3.0 (ALPHA)

### Herramientas Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `analyze_prompt` | Analiza prompts antes de generar código |
| `verify_code` | Verifica código generado contra codebase |
| `suggest_similar_name` | Sugiere correcciones para typos |
| `fix_code` | Corrige automáticamente errores |
| `index_project` | Indexa proyecto para referencias precisas |

### Lenguajes Soportados

- 🐍 **Python** - Soporte completo
- 📜 JavaScript - En desarrollo
- 🔷 TypeScript - En desarrollo

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
  prompt: "Quiero usar pandas para procesar datos y crear un DataFrame",
  language: "python"
});
// → { intended_imports: ["pandas"], intended_functions: ["DataFrame"], warnings: [] }
```

### verify_code

```typescript
// Verifica código generado
const errors = await codeshield.verify_code({
  code: `from pandas import data_frame
arr.sumArray()`,
  language: "python"
});
// → ["Línea 1: 'data_frame' no existe en 'pandas'. ¿Quisiste decir 'DataFrame'?",
//    "Línea 2: El método 'sumArray()' no existe. ¿Quisiste decir 'sum()'?"]
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
| [CLAUDE.md](CLAUDE.md) | Contexto para desarrollo |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |

---

## Seguridad

Si descubres una vulnerabilidad de seguridad, por favor reporta a través de **[GitHub Issues](../../issues/new?template=bug_report.yml)** con la etiqueta `security`.

---

## Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

**CodeShield MCP - Zero alucinaciones de código**