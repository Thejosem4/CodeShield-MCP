# CodeShield MCP - Specification

## 1. Overview

**Name:** CodeShield MCP
**Type:** MCP Server (Model Context Protocol)
**Framework:** MCP Python SDK
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

| Feature | Descripción | Prioridad |
|---------|-------------|-----------|
| `pre_analyze_prompt` | Analiza el prompt del usuario antes de generar código | ALTA |
| `verify_generated_code` | Verifica código generado contra el codebase real | ALTA |
| `suggest_similar` | Sugiere funciones/clases válidas similares a las mal escritas | MEDIA |
| `auto_fix` | Corrige automáticamente errores detectables | ALTA |
| `index_codebase` | Indexa el codebase del usuario para referencias precisas | MEDIA |

### 5.2 Auto-fix (Prioridad para comunidad)

```python
# Ejemplo: LLM escribe
from pandas import DataFrame # existe
from pandas import data_frame  # typo: no existe

# CodeShield detecta:
# "data_frame" no existe en pandas. ¿Quisiste decir "DataFrame"?
# Auto-fix: corrige a DataFrame
```

### 5.3 Hooks Automáticos

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

### 7.1 `pre_analyze_prompt`
- **Input:** Prompt del usuario
- **Output:** Análisis de intenciones de código
- **Acción:** Detecta qué librerías/funciones planea usar

### 7.2 `verify_generated_code`
- **Input:** Código generado
- **Output:** Lista de problemas detectados
- **Acción:** Fallback si prevention no funcionó

### 7.3 `suggest_similar`
- **Input:** Nombre mal escrito
- **Output:** Lista de matches similares en el codebase
- **Acción:** Helper para auto-fix

### 7.4 `auto_fix`
- **Input:** Código con errores
- **Output:** Código corregido
- **Acción:** Solo para errores 100% detectables

### 7.5 `index_codebase`
- **Input:** Directorio del proyecto
- **Output:** Índice de funciones/clases/imports disponibles
- **Acción:** Construye base de referencia

---

## 8. Installation

```bash
# Clone
git clone https://github.com/yourusername/codeshield-mcp.git
cd codeshield-mcp

# Install
pip install --upgrade mcp
pip install -r requirements.txt

# Configure in CLAUDE.md
```

---

## 9. Configuration

### 9.1 Global (environment)
```bash
export CODESHIELD_API_KEY="your-key"
```

### 9.2 Local (`.codeshield.yaml` - no commit)
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

| Versión | Feature |
|---------|---------|
| v1.0 | Python/JS/TS: imports, funciones, classes |
| v1.1 | Auto-fix para errores comunes |
| v1.2 | Go, Rust, Java support |
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

*Last updated: 2026-04-04*