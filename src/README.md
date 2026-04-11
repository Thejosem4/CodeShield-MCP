# CodeShield MCP

**Prevenir alucinaciones del LLM antes de que genere código.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-v0.6.0-red.svg)](https://www.npmjs.com/package/codeshield-verify-mcp)

---

## Estado Actual

**Versión:** 0.6.0 (ALPHA) - [npm package](https://www.npmjs.com/package/codeshield-verify-mcp)

### Modos de Uso

| Modo | Descripción |
|------|-------------|
| **MCP Server** | Integración con Claude Code, Claude CLI, Gemini CLI |
| **CLI** | Comandos standalone: verify, scan, explain, audit-deps, context |

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
| `codeshield verify <file>` | Verificar archivo |
| `codeshield scan [dir]` | Escanear proyecto completo |
| `codeshield audit-deps <file>` | Auditar CVEs en requirements.txt |
| `codeshield context save/list/restore` | Persistencia de contexto |
| `codeshield serve` | Iniciar servidor MCP |

---

## Instalación

### Desde npm

```bash
npm install -g codeshield-verify-mcp
```

### Desde código fuente

```bash
npm install
npm run build
```

---

## Configuración MCP (Claude Desktop)

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

---

## Seguridad

- Path traversal protection en scanProject() e indexProject()
- CVE database para dependency audit
- Input validation (1MB limit)
- Regex escaping para evitar ReDoS

---

## Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.