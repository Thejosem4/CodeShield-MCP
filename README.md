# CodeShield MCP

**Prevenir alucinaciones del LLM antes de que genere código.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/typescript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/node-20+-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/badge/npm-v0.6.4-red.svg)](https://www.npmjs.com/package/codeshield-verify-mcp)

---

## Estado Actual

**Versión:** 0.6.4 (ALPHA) - [npm package](https://www.npmjs.com/package/codeshield-verify-mcp)

### Modos de Uso

| Modo | Descripción |
|------|-------------|
| **MCP Server** | Integración con Claude Code, Claude CLI, Gemini CLI |
| **CLI** | Comandos standalone: verify, scan, explain, audit-deps, context |

### Herramientas MCP

| Herramienta | Descripción |
|-------------|-------------|
| `analyze_prompt` | Analiza prompts, detecta frameworks, intenciones, security requirements |
| `verify_code` | Verifica código generado (Python, JS, TS, Go, Rust, React, Angular) |
| `suggest_fix` | Sugiere corrección específica para un issue |
| `check_imports` | Valida imports contra stdlib |
| `quick_fix` | Aplica fixes automáticos para issues comunes |
| `deep_fix` | Fix enriquecido con contexto de proyecto y stdlib (100% local) |
| `suggest_similar_name` | Sugiere correcciones para typos |
| `fix_code` | Corrige automáticamente errores |
| `index_project` | Indexa proyecto con cache en memoria |
| `cache_stats` | Estadísticas del cache |
| `cache_clear` | Limpia el cache |

### Comandos CLI

| Comando | Descripción |
|---------|-------------|
| `codeshield verify <file>` | Verificar archivo |
| `codeshield scan [dir]` | Escanear proyecto completo |
| `codeshield audit-deps <file>` | Auditar CVEs en requirements.txt |
| `codeshield context save/list/restore/delete` | Persistencia de contexto |
| `codeshield serve` | Iniciar servidor MCP |

---

## Instalación

### Desde npm

```bash
npm install -g codeshield-verify-mcp
```

### Desde código fuente

```bash
git clone https://github.com/Thejosem4/CodeShield-MCP.git
cd CodeShield-MCP/src
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

## Lenguajes Soportados

| Lenguaje | Detección | Auto-fix |
|----------|-----------|----------|
| Python | ✅ | ✅ |
| JavaScript | ✅ | ✅ |
| TypeScript | ✅ | ✅ |
| Go | ✅ | ✅ |
| Rust | ✅ | ✅ |
| React | ✅ | ❌ |
| Angular | ✅ | ❌ |

---

## Seguridad

- **Path traversal protection** en scanProject() e indexProject()
- **CVE database** para dependency audit (21 packages, CVEs 2023-2024)
- **Input validation** (100KB limit en CLI, 1MB en MCP)
- **ReDoS prevention** con memoization y early exit
- **Race condition protection** con file locking en context-store
- **Atomic writes** con temp file + rename
- **Security tests** cubriendo: race conditions, ReDoS, path traversal, input validation

---

## Fix Intelligence Layer

Sistema de sugerencia de fixes 100% local que usa contexto para sugerir correcciones:

1. **Typos conocidos** - Détecta errores comunes (console.logg → log)
2. **Project index** - Busca en el codebase indexado (95% confidence)
3. **Stdlib lookup** - Busca en bibliotecas estándar (90% confidence)
4. **Fuzzy matching** - Levenshtein distance (60-89% confidence)
5. **Pattern extraction** - Código similar en el proyecto (40-59% confidence)
6. **Fallback** - Hints manuales cuando no hay match (<40%)

---

## Testing

```bash
npm test  # 99+ tests incluyendo seguridad
```

---

## Roadmap

| Version | Focus | Status |
|---------|-------|--------|
| **0.6.0** | CLI, Context, Audit Deps, Security | ✅ Published |
| **0.6.1** | Security fixes, file locking, CLI validation | ✅ Published |
| **0.6.2** | JS/TS stdlib expansion, prompt analysis | ✅ Published |
| **0.6.3** | Go, Rust, React, Angular detection | ✅ Published |
| **0.6.4** | Verification Engine unificado | ✅ Published |
| **0.6.5** | Fix Intelligence Layer, Ollama Agent | ✅ Latest |
| **0.7.0** | Mejoras de detección | 🔲 Pendiente |

---

## Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.
