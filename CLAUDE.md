# CodeShield MCP - Proyecto

## Overview

**CodeShield MCP** es un servidor MCP (Model Context Protocol) que previene alucinaciones del LLM antes de que genere código. Ahorra tokens, reduce debugging y hace más efectivos los cambios de Claude Code.

**Stack:** Python + MCP Python SDK
**Ubicación:** `C:\Projects\CodeShield-MCP`
**Versión:** 0.3.0 (ALPHA) - **149 tests passing**

---

## Estructura del Proyecto

```
CodeShield-MCP/
├── src/codeshield/          # Código fuente
│   ├── __init__.py         # 5 tools: verify, pre_analyze, suggest, auto_fix, index
│   ├── server.py           # MCP server con FastMCP ✅ NUEVO
│   └── detection/          # Detection engines
│       ├── imports.py      # Detecta imports/funciones inexistentes
│       ├── functions.py    # Detecta typos en métodos (.count_items)
│       └── classes.py      # Detecta clases mal nombradas
├── tests/
│   ├── conftest.py         # Fixtures compartidos
│   ├── unit/
│   │   ├── detection/      # Tests para engines (imports, functions, classes)
│   │   ├── test_verify_generated_code.py
│   │   ├── test_pre_analyze_prompt.py
│   │   ├── test_suggest_similar.py
│   │   ├── test_auto_fix.py
│   │   └── test_index_codebase.py
│   └── integration/
├── docs/                   # Documentación técnica
├── config/                 # Template de configuración
└── .github/               # Workflows y templates
```

---

## Reglas de Desarrollo

### Antes de Codear

1. **Siempre verificar el SPEC.md** antes de implementar features
2. **TDD:** Escribir tests PRIMERO, luego implementar
3. **Nuevas features** → crear branch `feature/nombre`
4. **Commits** → por tarea, mensaje claro: `feat: add auto-fix para imports`
5. **Tests** → unitarios primero, luego integración

### Workflow TDD (Obligatorio)

```
1. Leer SPEC.md
2. Crear branch feature/xxx
3. Escribir tests en tests/ (deben FALLAR)
4. Implementar en src/ hasta que tests PASEN
5. Refactorizar si necesario
6. Commit: "feat: descripcion"
```

### Tests - Estructura y Status

| Archivo | Tests | Status |
|---------|-------|--------|
| `test_imports.py` | ~43 | ✅ Passing |
| `test_functions.py` | - | ✅ Passing |
| `test_classes.py` | - | ✅ Passing |
| `test_verify_generated_code.py` | ~22 | ✅ Passing |
| `test_pre_analyze_prompt.py` | ~13 | ✅ Passing |
| `test_suggest_similar.py` | ~18 | ✅ Passing |
| `test_auto_fix.py` | ~20 | ✅ Passing |
| `test_index_codebase.py` | ~10 | ✅ Passing |
| **TOTAL** | **71** | **✅** |

### Fixtures Disponibles (conftest.py)

| Fixture | Descripción |
|---------|-------------|
| `sample_python_code` | Código Python válido |
| `sample_javascript_code` | Código JS válido |
| `sample_typescript_code` | Código TS válido |
| `code_with_import_errors` | Código con errores intencionales |
| `code_base_index_sample` | Índice de ejemplo |
| `temp_project_dir` | Directorio temporal simulando proyecto |

### Ejecutar Tests

```bash
# Todos los tests
pytest tests/ -v

# Solo unitarios
pytest tests/unit/ -v

# Solo detección
pytest tests/unit/detection/ -v

# Con coverage
pytest tests/ --cov=src/codeshield --cov-report=html

# Solo un archivo
pytest tests/unit/test_verify_generated_code.py -v
```

### Reglas de Tests

- **Todos los tests deben pasar** antes de commit
- **NO dejar tests skippeados** sin razón
- **Nombres descriptivos**: `test_detecta_import_inexistente_python`
- **Un assertion por test** cuando sea posible (más claridad)
- **Fixtures para código repetitivo**

### Nomenclatura

- **Ramas:** `feature/nombre`, `fix/bug-nombre`, `docs/nombre`
- **Commits:** conventional commits (`feat:`, `fix:`, `docs:`, `test:`)
- **Funciones:** `snake_case` para Python
- **Clases:** `PascalCase`

---

## Context del Proyecto

### Estado Actual (v0.2.0 - ALPHA)

- [x] Definir scope y SPEC.md
- [x] `verify_generated_code` - ✅ Implementado
- [x] `pre_analyze_prompt` - ✅ Implementado
- [x] `suggest_similar` - ✅ Implementado
- [x] `auto_fix` - ✅ Implementado
- [x] `index_codebase` - ✅ Implementado
- [x] Detection engine `imports.py` - ✅
- [x] Detection engine `functions.py` - ✅
- [x] Detection engine `classes.py` - ✅
- [x] Tests unitarios (71 passing) - ✅
- [ ] Servidor MCP (server.py) - ⏳ Pendiente
- [ ] Integration tests - ⏳ Pendiente

### Lenguajes Soportados (v0.2.0)

1. **Python** ← Soporte completo
2. **JavaScript** - En desarrollo
3. **TypeScript** - En desarrollo

### Detección Implementada

- ✅ Imports/bibliotecas inexistentes
- ✅ Funciones con typos (listdirs → listdir)
- ✅ Métodos con typos (.count_items → .count, .sumArray → .sum)
- ✅ Clases mal nombradas (DatetimeTZ → datetime, datafram → DataFrame)
- ✅ Errores de sintaxis básicos

### Extensible (futuro)

- Lógica/algoritmos problemáticos
- Patrones de seguridad
- Otros lenguajes (Go, Rust, Java)

---

## Configuración Local

### .codeshield.yaml (NO COMMIT)

```yaml
detection:
  languages:
    - python
  auto_fix: true
  strict_mode: false
  patterns:
    imports: true
    functions: true
    classes: true
    syntax: true
    logic: false  # futuro

index:
  include:
    - src/
    - lib/
  exclude:
    - node_modules/
    - venv/
    - __pycache__/
```

> ⚠️ Este archivo NO sube a GitHub (ya está en .gitignore)

---

## Comandos Útiles

```bash
# Instalar dependencias
pip install -r requirements.txt

# Ejecutar tests
pytest tests/ -v

# Solo unitarios
pytest tests/unit/ -v

# Solo detección
pytest tests/unit/detection/ -v

# Lint
flake8 src/
```

---

## Próximos Pasos

1. ~~**Servidor MCP**~~ ✅ Creado `server.py` con FastMCP
2. ~~**Entry point**~~ ✅ Configurado `setup.py` con `codeshield` command
3. **Integration tests** - Probar conexión real con Claude Code via `.mcp.json`
4. **JavaScript/TypeScript** - Extender detection engines
5. **PyPI release** - Publicar v0.3.0

---

## Recursos

- [MCP Python SDK](https://github.com/modelcontextprotocol/python-sdk)
- [SPEC.md](./SPEC.md) — Especificación completa
- [CHANGELOG.md](./CHANGELOG.md) — Historial de versiones

---

*Last updated: 2026-04-04*