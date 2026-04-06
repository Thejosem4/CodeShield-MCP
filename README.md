# CodeShield MCP

**Prevenir alucinaciones del LLM antes de que genere código.**

[![PyPI version](https://badge.fury.io/py/codeshield-mcp.svg)](https://badge.fury.io/py/codeshield-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Tests](https://img.shields.io/badge/tests-149%20passing-success)](tests/)

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

**Versión:** 0.3.0 (ALPHA) - **149 tests passing** ✅

### Funcionalidades Implementadas

| Herramienta | Status | Descripción |
|-------------|--------|-------------|
| `verify_generated_code` | ✅ | Verifica código generado contra codebase |
| `pre_analyze_prompt` | ✅ | Analiza prompts antes de generar |
| `suggest_similar` | ✅ | Sugiere correcciones para typos |
| `auto_fix` | ✅ | Corrige automáticamente errores |
| `index_codebase` | ✅ | Indexa proyecto para referencias precisas |

### Detection Engines

| Engine | Status | Descripción |
|--------|--------|-------------|
| `imports.py` | ✅ | Detecta imports y funciones inexistentes |
| `functions.py` | ✅ | Detecta métodos con typos (count_items, sumArray) |
| `classes.py` | ✅ | Detecta clases mal nombradas |

### Lenguajes Soportados (v0.3.0)

- 🐍 **Python** - Soporte completo
- 📜 JavaScript - En desarrollo
- 🔷 TypeScript - En desarrollo

---

## Instalación

```bash
# Clonar
git clone https://github.com/yourusername/codeshield-mcp.git
cd codeshield-mcp

# Crear venv (recomendado)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate   # Windows

# Instalar
pip install --upgrade mcp
pip install -r requirements.txt

# Verificar que todo funciona
pytest tests/ -v
```

---

## Uso como Biblioteca

```python
from codeshield import verify_generated_code

codigo_generado = """
import pandas as pd
from pandas import data_frame  # typo!

arr.sumArray()  # typo!
my_list.count_items()  # typo!
"""

errores = verify_generated_code(codigo_generado, "python")
# → [
#     "Línea 3: 'data_frame' no existe en 'pandas'. ¿Quisiste decir 'DataFrame'?",
#     "Línea 5: El método 'sumArray()' no existe. ¿Quisiste decir 'sum()'?",
#     "Línea 6: El método 'count_items()' no existe. ¿Quisiste decir 'count()'?"
# ]
```

### auto_fix

```python
from codeshield import auto_fix

codigo = """
from pandas import data_frame
arr.sumArray()
"""
fijo = auto_fix(codigo, "errors", "python")
print(fijo)
# → {
#     "from pandas import DataFrame",
#     "arr.sum()"
# }
```

### index_codebase

```python
from codeshield import index_codebase

index = index_codebase("/path/to/project", ["python"])
print(index["classes"])   # ['User', 'Product', 'Order']
print(index["functions"]) # ['validate_email', 'process_order']
```

---

## Configuración

### `.codeshield/codeshield.yaml`

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

> ⚠️ Este archivo NO se sube a GitHub (ya está en `.gitignore`)

---

## Roadmap

```
v0.1.0  → PRE-ALPHA (setup) ✅
v0.2.0  → ALPHA (detection engines) ✅
v0.3.0  → ALPHA (MCP server, 149 tests) ✅
v1.0.0  → STABLE (primera versión producción)
v1.1+   → Expansión multi-lenguaje
v2.0    → Detección lógica/seguridad
```

[Ver roadmap completo →](docs/ROADMAP.md)

---

## Documentación

| Documento | Descripción |
|-----------|-------------|
| [SPEC.md](SPEC.md) | Especificación técnica completa |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Features futuras y timeline |
| [docs/VERSION-GUIDE.md](docs/VERSION-GUIDE.md) | Control de versiones |
| [docs/quickstart.md](docs/quickstart.md) | Guía de inicio rápido |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Cómo contribuir |
| [CLAUDE.md](CLAUDE.md) | Contexto para desarrollo (TDD workflow) |
| [CHANGELOG.md](CHANGELOG.md) | Historial de cambios |

---

## Seguridad

Si descubres una vulnerabilidad de seguridad, por favor reporta a través de **[GitHub Issues](../../issues/new?template=bug_report.yml)** con la etiqueta `security`.

---

## Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

---

**Hecho con ❤️ por la comunidad CodeShield**

[![GitHub stars](https://img.shields.io/github/stars/yourusername/codeshield-mcp?style=social)](https://github.com/yourusername/codeshield-mcp/stargazers)