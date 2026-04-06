# Roadmap - CodeShield MCP

## Visión

> "Zero alucinaciones de código LLM antes de que ocurra"

CodeShield MCP busca ser la **primera línea de defensa** contra código generado incorrectamente, ahorrando tokens y haciendo más efectivos a Claude Code y otros agentes LLM.

---

## Version Timeline

```
v0.1.0 - PRE-ALPHA (actual)
│   └─ Estructura inicial, sin features funcionales

v0.2.0 - ALPHA
│   └─ MVP: verify_generated_code (Python)
│       ├─ Detección de imports inexistentes
│       ├─ Detección de typos en funciones y clases
│       └─ Basic suggest_similar

v0.3.0 - ALPHA ✅ ACTUAL
│   └─ MCP Server con FastMCP
│       ├─ 5 tools expuestas como MCP
│       ├─ Transporte stdio
│       └─ 149 tests passing

v0.4.0 - BETA
│   └─ Integración con Claude Code
│       ├─ Connection real con .mcp.json
│       └─ Integration tests E2E

v0.4.0 - ALPHA
│   └─ index_codebase
│       ├─ Indexar proyecto del usuario
│       └─ Construir base de referencias local

v0.5.0 - BETA
│   └─ Auto-fix básico
│       ├─ Corrección de imports
│       ├─ Corrección de typos comunes
│       └─ Tests de integración MCP

v0.6.0 - BETA
│   └─ suggest_similar mejorado
│       ├─ Más precisón en sugerencias
│       └─ Ranking por similitud

v0.9.0 - RC
│   └─ Cleanup y polish
│       ├─ Performance optimization
│       ├─ Bug fixes
│       └─ Documentación completa

v1.0.0 - STABLE ✓
    └─ Primera versión producción
        ├─ Python/JS/TS full support
        ├─ Auto-fix funcional
        └─ GitHub release
```

---

## Expansiones Futuras (Post-v1.0)

### v1.1 - Multi-lenguaje
```yaml
languages:
  - python       # ya soportado
  - javascript   # ya soportado
  - typescript   # ya soportado
  - go           # futuro
  - rust         # futuro
  - java         # futuro
  - php          # futuro
  - csharp       # futuro
```

### v1.2 - Auto-fix Avanzado
- Corrección de lógica básica (no algoritmos complejos)
- предложения по стилю кода (code style suggestions)
- Auto-import de librerías faltantes

### v1.3 - Integración con Linters
```yaml
integrations:
  - pylint     # Python
  - eslint     # JS/TS
  - ruff       # Python (más rápido)
  - mypy       # Type checking Python
  - tslint     # TypeScript
```

### v2.0 - Detección de Lógica
```yaml
detection:
  patterns:
    logic: true  # NEW
    algorithm_quality: true  # NEW
    complexity: true         # NEW
```
- Detección de loops infinitos potenciales
- Detección de recursion sin base case
- Análisis de complejidad algorítmica básica
- Code smells avanzados

### v2.1 - Seguridad
```yaml
detection:
  security:
    sql_injection: true
    xss_vulnerabilities: true
    hardcoded_secrets: true
    unsafe_dependencies: true
```

### v2.2 - AI-Powered Suggestions
- Integración con modelos de IA para sugerencias avanzadas
- Explain de código problemático
- Best practices recommendations
- Learning from user's codebase patterns

### v3.0 - Cloud Features
```yaml
cloud:
  enabled: false  # future
  features:
    - team_shared_configs
    - common_patterns_database
    - global_code_index
    - advanced_analytics
```

---

## Features por Categoría

### Core (v1.0)
| Feature | Prioridad | Status |
|---------|-----------|--------|
| Servidor MCP base | CRÍTICA | ⏳ pending |
| verify_generated_code | CRÍTICA | ⏳ pending |
| pre_analyze_prompt | ALTA | ⏳ pending |
| suggest_similar | MEDIA | ⏳ pending |
| auto_fix | ALTA | ⏳ pending |
| index_codebase | MEDIA | ⏳ pending |

### Extended (v1.1 - v1.5)
| Feature | Prioridad | Status |
|---------|-----------|--------|
| Multi-lenguaje (Go, Rust, Java) | ALTA | 🔲 future |
| Integración linters | MEDIA | 🔲 future |
| Auto-fix avanzado | ALTA | 🔲 future |
| Configuración por proyecto | MEDIA | 🔲 future |

### Advanced (v2.0+)
| Feature | Prioridad | Status |
|---------|-----------|--------|
| Detección de lógica | ALTA | 🔲 future |
| Análisis de seguridad | CRÍTICA | 🔲 future |
| AI-powered suggestions | MEDIA | 🔲 future |
| Team collaboration | BAJA | 🔲 future |

---

## Dependencias entre Features

```
                    ┌─────────────────┐
                    │  MCP Server Base │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
    ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
    │   index_    │  │   pre_      │  │   verify_   │
    │   codebase  │  │   analyze   │  │   generated │
    └─────────────┘  └──────┬──────┘  └──────┬──────┘
                           │                 │
                           │         ┌───────▼───────┐
                           │         │  suggest_     │
                           │         │  similar      │
                           │         └───────┬───────┘
                           │                 │
                           └────────┬────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │    auto_fix      │
                          └─────────────────┘
```

---

## Métricas de Éxito

| Métrica | Target | Medida |
|---------|--------|--------|
| Precisión detección | >95% | Tests con casos conocidos |
| Falsos positivos | <5% | Reportado por usuarios |
| Auto-fix rate | >70% de errores detectables | Métricas internas |
| Ahorro de tokens | >30% vs sin CodeShield | A/B testing |
| Tiempo de respuesta | <500ms | Benchmarks |

---

## Experimentales

Features que podrían implementarse pero no son prioridad actual:

```yaml
experimental:
  - code_generation_safety_net   # Verificar código antes de ejecutar
  - real_time_collaboration       # Múltiples usuarios simultáneos
  - learning_from_user_feedback   # El sistema aprende del usuario
  - cross_project_analysis        # Analizar múltiples proyectos
```

---

## Notas de Planificación

- Cada versión MINOR debe ser backwards compatible
- Breaking changes solo en versiones MAJOR
- Hotfixes para bugs críticos fuera del schedule normal
- Roadmap se revisa trimestralmente

---

*Última actualización: 2026-04-04*
*Versión actual: 0.1.0 (PRE-ALPHA)*