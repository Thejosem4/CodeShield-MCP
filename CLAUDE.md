# CodeShield MCP - Proyecto

## Overview

**CodeShield MCP** es un servidor MCP (Model Context Protocol) que previene alucinaciones del LLM antes de que genere código. Ahorra tokens, reduce debugging y hace más efectivos los cambios de Claude Code.

**Stack:** TypeScript + Node.js + `@modelcontextprotocol/sdk`
**Ubicación:** `C:\Projects\CodeShield-MCP`
**Versión:** 0.3.0 (ALPHA)

---

## Estructura del Proyecto

```
CodeShield-MCP/
├── src/
│   ├── src/
│   │   ├── server.ts           # MCP server principal
│   │   └── detection/
│   │       └── index.ts        # Motor de detección (Levenshtein, typos, imports)
│   ├── package.json
│   ├── tsconfig.json
│   └── dist/                   # Build compilado (generado por npm run build)
├── docs/
│   ├── DEVELOPMENT-PLAN.md     # Plan de desarrollo v0.3.0+
│   └── ROADMAP.md              # Roadmap de features
├── .github/
├── SPEC.md
├── README.md
└── CLAUDE.md
```

---

## Reglas de Desarrollo

### Antes de Codear

1. **Siempre verificar el SPEC.md** antes de implementar features
2. **Nuevas features** → crear branch `feature/nombre`
3. **Commits** → por tarea, mensaje claro: `feat: add auto-fix para imports`
4. **Build** → verificar que compila antes de commit

### Workflow

```
1. Leer SPEC.md
2. Crear branch feature/xxx
3. Implementar en src/
4. npm run build para verificar
5. Commit: "feat: descripcion"
```

---

## Ejecución

```bash
cd src

# Instalar dependencias
npm install

# Desarrollo (tsx hot-reload)
npm run dev

# Build (compila a dist/)
npm run build

# Tests
npm test
```

### Configuración MCP (Claude Code)

En `~/.mcp.json`:

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

## Herramientas Disponibles

| Herramienta | Descripción |
|-------------|-------------|
| `analyze_prompt` | Detecta imports y funciones mencionadas en el prompt |
| `verify_code` | Detecta typos en código generado (Python) |
| `suggest_similar_name` | Sugiere correcciones usando Levenshtein |
| `fix_code` | Auto-corregir typos comunes |
| `index_project` | Indexa codebase para referencia |

---

## Estado Actual (v0.3.0)

- [x] Servidor MCP con TypeScript + SDK oficial
- [x] Motor de detección de typos (Levenshtein)
- [x] 5 herramientas registradas
- [x] Transporte stdio (compatible con Claude Code)
- [ ] Tests automatizados
- [ ] Integration tests con Claude Code real
- [ ] Soporte JavaScript/TypeScript en detección
- [ ] Autofix en verify_code
- [ ] Cache de index en memoria
- [ ] Resource templates

---

## Próximos Pasos (v0.4.0)

1. **Autofix en verify_code** - retornar código corregido
2. **Cache de index** - index en memoria entre llamadas
3. **Resource templates** - exponer índice como MCP resource
4. **Tests** - agregar suite de tests
5. **JS/TS detection** - motor para JavaScript/TypeScript

---

## Recursos

- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [SPEC.md](./SPEC.md) — Especificación completa
- [CHANGELOG.md](./CHANGELOG.md) — Historial de versiones

---

*Last updated: 2026-04-06*