# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [0.3.0] - 2026-04-06 - ALPHA

### Added
- ✅ `server.py` - Servidor MCP completo con FastMCP
- ✅ 5 tools expuestas como MCP: `analyze_prompt`, `verify_code`, `suggest_similar_name`, `fix_code`, `index_project`
- ✅ Transporte stdio (compatible con Claude Code, Claude CLI, Gemini CLI)
- ✅ `setup.py` con entry point `codeshield` y soporte `pip install -e .`
- ✅ Fix case-insensitive en `classes.py` (Datafram → DataFrame)
- ✅ `tools/__init__.py` y `fixers/__init__.py` (estructura para expansión)

### Tests
- ✅ 149 tests unitarios passing (+78 desde v0.2.0)
- ✅ Detection engines: 72 tests passing
- ✅ Integration tests con JSON-RPC sobre stdio validados

### Documentation
- ✅ README.md actualizado con estado v0.3.0
- ✅ Roadmap actualizado con MCP server como completado
- ✅ .mcp.json configurado para conexión local

### Fixed
- ✅ `classes.py` case-insensitive typo matching (bug: Datafram no matcheaba DataFrame)

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

### Tests
- ✅ 71 tests unitarios passing
- ✅ Tests para detection/imports.py
- ✅ Tests para detection/functions.py
- ✅ Tests para detection/classes.py
- ✅ Tests para tools principales

### Documentation
- ✅ README.md actualizado
- ✅ CLAUDE.md con workflow TDD y estructura de tests
- ✅ CONTRIBUTING.md con guía de contribución
- ✅ LICENSE (MIT)

---

## [0.1.0] - 2026-04-04 - PRE-ALPHA

### Added
- Estructura inicial del proyecto
- SPEC.md con especificación completa
- CLAUDE.md con contexto e instrucciones
- requirements.txt con dependencias base
- .gitignore configurado
- Template de configuración
- docs/ROADMAP.md
- docs/VERSION-GUIDE.md
- docs/quickstart.md
- .github/workflows/ci.yml
- .github/workflows/release.yml
- .github/ISSUE_TEMPLATE/

> **Nota:** Esta es una versión pre-alpha. No recomendada para uso en producción.

---

## Estructura del Proyecto (v0.3.0)

```
CodeShield-MCP/
├── src/codeshield/           # Código fuente
│   ├── __init__.py           # Tools: verify, pre_analyze, suggest, auto_fix, index
│   ├── server.py             # MCP server con FastMCP (NUEVO)
│   ├── detection/
│   │   ├── __init__.py       # Exports de todos los engines
│   │   ├── imports.py        # Detection de imports y typos
│   │   ├── functions.py      # Detection de métodos con errores
│   │   └── classes.py        # Detection de clases mal nombradas
│   ├── tools/                 # Handlers MCP (expansión futura)
│   └── fixers/                # Patterns de fix (expansión futura)
├── tests/
│   ├── conftest.py           # Fixtures compartidos
│   ├── unit/
│   │   ├── detection/        # 72 tests para engines
│   │   ├── test_verify_generated_code.py
│   │   ├── test_pre_analyze_prompt.py
│   │   ├── test_suggest_similar.py
│   │   ├── test_auto_fix.py
│   │   └── test_index_codebase.py
│   └── integration/
├── setup.py                   # Entry point (NUEVO)
└── docs/
```

---

## Próximos Pasos (v0.4.0)

- [ ] Integration tests con Claude Code conectado
- [ ] Soporte para JavaScript/TypeScript en detection engines
- [ ] Configurar pyproject.toml moderno
- [ ] Publicar en PyPI
- [ ] GitHub release v0.3.0

---

*Last updated: 2026-04-04*