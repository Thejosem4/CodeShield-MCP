# Roadmap - CodeShield MCP

## Visión

> "Zero alucinaciones de código LLM antes de que ocurra"

CodeShield MCP busca ser la **primera línea de defensa** contra código generado incorrectamente, ahorrando tokens y haciendo más efectivos a Claude Code y otros agentes LLM.

---

## Sistema de Versiones

```
0.6.0 ✅ PUBLISHED (2026-04-11)
        └─ MCP Server + CLI + Context Persistence + Audit Deps

0.6.1 ✅ PUBLISHED (2026-04-12)
        └─ Security fixes, file locking, CVE update, CLI validation
            └─ 14 security tests, ReDoS fix, race condition protection

0.6.2 - 0.6.9 🔲 INCREMENTAL UPDATES
        └─ Cada .1 se libera solo cuando TU confirmas que está estable
        └─ Fixes, mejoras menores, nueva detección, etc.

0.7.0 🔲 NEXT MAJOR
        └─ Sandbox execution
        └─ REST API backend opcional

1.0.0 🔲 STABLE RELEASE
        └─ Production-ready
```

**Regla:** No se sube a 0.6.3 hasta que 0.6.2 esté aprobada por ti.

---

## Estado Actual

**Versión:** 0.6.1 (ALPHA) - Published 2026-04-12

| Feature | Status |
|---------|--------|
| MCP Server | ✅ Funcional |
| CLI (verify, scan, explain) | ✅ Funcional |
| Context Persistence | ✅ Funcional (con file locking) |
| Dependency Audit (CVEs) | ✅ Funcional (21 packages) |
| Project Scanner | ✅ Funcional |
| Auto-fix | ✅ Funcional |
| Cache en memoria | ✅ Funcional (con LRU eviction) |
| Security Tests | ✅ 14 tests |
| File Locking | ✅ Race condition protection |
| Input Validation | ✅ Extension check, name sanitization |

---

## Roadmap Detallado

### v0.6.x - Fase de Maduración

| Version | Focus | Status |
|---------|-------|--------|
| **0.6.0** | CLI, Context, Audit Deps, Security | ✅ Published |
| **0.6.1** | Security fixes, file locking, CVE update, CLI validation | ✅ Published |
| **0.6.2** | JS/TS stdlib expansion, better prompt analysis, detectCodePatterns | 🔲 Tu decides |
| **0.6.3** | - | 🔲 Pendiente |
| ... | - | ... |
| **0.6.9** | Pre-lanzamiento 0.7.0 | 🔲 Pendiente |

### v0.7.0 - Sandbox + API

| Feature | Prioridad |
|---------|-----------|
| Sandbox execution (Daytona) | ALTA |
| REST API backend | MEDIA |
| Sandbox en CLI | ALTA |

### v1.0.0 - Stable

| Feature | Prioridad |
|---------|-----------|
| Tests exhaustivos | CRÍTICA |
| Documentación completa | CRÍTICA |
| GitHub release | ALTA |

---

## Features Futuras (Post-v1.0)

### Multi-lenguaje
- Go, Rust, Java, PHP, C#

### Integración con Linters
- pylint, eslint, ruff, mypy, tslint

### Seguridad
- SQL injection detection
- XSS vulnerabilities detection
- Hardcoded secrets detection

### AI-Powered
- Explain de código problemático
- Best practices recommendations
- Learning from codebase patterns

---

## Métricas de Éxito

| Métrica | Target |
|---------|--------|
| Precisión detección | >95% |
| Falsos positivos | <5% |
| Auto-fix rate | >70% de errores detectables |
| Tiempo de respuesta | <500ms |

---

*Última actualización: 2026-04-11*
*Versión actual: 0.6.0 (ALPHA)*