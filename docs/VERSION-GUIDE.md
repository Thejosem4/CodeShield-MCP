# Guía de Versionado - CodeShield MCP

## Política de Versiones

Este proyecto sigue **Semantic Versioning (SemVer)**:

```
MAJOR.MINOR.PATCH
 1 .  0 .  0
```

| Componente | Descripción | Cambio |
|-------------|-------------|--------|
| **MAJOR** | Incompatibilidad API | Breaking changes |
| **MINOR** | Nuevas features (backwards compatible) | Agregar funcionalidad |
| **PATCH** | Bug fixes (backwards compatible) | Correcciones |

---

## Ciclo de Versiones

### Versiones Pre-1.0 (v0.x.x)

Durante el desarrollo inicial, usamos pre-versions:

| Stage | Version | Uso |
|-------|---------|-----|
| **PRE-ALPHA** | 0.1.0 | Proyecto iniciado, sin features funcionales |
| **ALPHA** | 0.2.0+ | Features en desarrollo, API inestable |
| **BETA** | 0.9.0+ | Feature complete, probando internamente |
| **RC** | 0.9.x-RC | Release candidate, listo para testing |

### Versiones Estables (v1.0.0+)

| Stage | Version | Uso |
|-------|---------|-----|
| **STABLE** | 1.0.0+ | Produção, API congelada |
| **LTS** | 2.x.x LTS | Long-term support, solo bug fixes críticos |

---

## Rama Principal (main)

```
main (PROTEGIDA)
├── Solo acepta merges de release branches
├── Solo acepta commits vía PR
├── CI/CD debe pasar 100%
└── VERSION.txt refleja la versión actual
```

## Ramas de Desarrollo

| Rama | Propósito | Ejemplo |
|------|-----------|---------|
| `feature/nombre` | Nueva funcionalidad | `feature/auto-fix` |
| `fix/bug-nombre` | Bug fix | `fix/typo-imports` |
| `docs/nombre` | Documentación | `docs/changelog` |
| `refactor/nombre` | Refactorización | `refactor/detection-engine` |

## Ramas de Release

```
release/v1.0.0 (desde main)
├── Preparar release
├── Bump version
├── Freeze features
├── Tests finales
└── Merge a main + tag
```

---

## Flujo de Release

### Release Normal (MINOR/PATCH)

```bash
# 1. Crear branch de release
git checkout -b release/v1.0.0 main

# 2. Bump version en src/codeshield/__init__.py
__version__ = "1.0.0"

# 3. Actualizar CHANGELOG.md
git add CHANGELOG.md
git commit -m "release: v1.0.0"

# 4. Push y crear PR
git push -u origin release/v1.0.0

# 5. Mergear a main
# 6. Crear tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# 7. Eliminar branch de release
git branch -d release/v1.0.0
```

### Release Mayor (MAJOR)

```bash
# 1. Crear branch de release
git checkout -b release/v2.0.0 main

# 2. Revisar breaking changes
# 3. Actualizar versión y CHANGELOG
# 4. Generar migration guide (MIGRATION.md)
# 5. PR + merge + tag
```

---

## Tags de Git

```bash
# Taglight ( repositorios públicos)
git tag v1.0.0

# Tag con anotación (recomendado)
git tag -a v1.0.0 -m "Release v1.0.0: Auto-fix, index_codebase"

# Push tags
git push origin --tags
```

---

## GitHub Releases

Cada release en GitHub debe incluir:

1. **Título:** `v1.0.0 - Nombre del Release`
2. **Descripción:** Cambios desde la versión anterior
3. **Assets:** Código fuente, wheels, etc.
4. **Breaking changes:** Notar claramente si hay

---

## Bump de Versión Automático

Usar scripts para mantener versión consistente:

```bash
# bump-version.py (futuro)
python scripts/bump-version.py --patch  # 1.0.0 -> 1.0.1
python scripts/bump-version.py --minor  # 1.0.0 -> 1.1.0
python scripts/bump-version.py --major  # 1.0.0 -> 2.0.0
```

---

## Deprecaciones

Cuando una funcionalidad se depreca:

```python
import warnings

def old_function():
    warnings.warn(
        "old_function is deprecated, use new_function instead",
        DeprecationWarning,
        stacklevel=2
    )
```

En CHANGELOG.md:

```markdown
### Deprecated
- `old_function` → usar `new_function` (será removida en v2.0.0)
```

---

## Hotfix Flow

```bash
#Desde main, crear hotfix branch
git checkout -b hotfix/v1.0.1 main

# Fix rápido
# ...

# Merge a main
# Bump patch version
# Tag + push
```

---

## Checklist Antes de Release

- [ ] Todos los tests pasan (`pytest tests/ -v`)
- [ ] Lint pasa (`flake8 src/`)
- [ ] CHANGELOG.md actualizado
- [ ] Version bump en `__init__.py`
- [ ] Tag creado
- [ ] GitHub Release creado
- [ ] CI/CD verdes
- [ ] Documentation actualizada

---

*Versión actual: 0.1.0 (PRE-ALPHA)*