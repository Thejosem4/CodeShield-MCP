# Guía de Contribución - CodeShield MCP

## ¡Bienvenido! 👋

Gracias por tu interés en contribuir a CodeShield MCP. Este documento te guiará para hacer tu primera contribución.

---

## Tabla de Contenidos

1. [Maneras de Contribuir](#maneras-de-contribuir)
2. [Setup de Desarrollo](#setup-de-desarrollo)
3. [Flujo de Trabajo](#flujo-de-trabajo)
4. [Reglas de Código](#reglas-de-código)
5. [Commits](#commits)
6. [Pull Requests](#pull-requests)
7. [Testing](#testing)

---

## Maneras de Contribuir

### 🐛 Reportar Bugs
- Abre un [Bug Report](../../issues/new?template=bug_report.yml)
- Incluye pasos para reproducir, comportamiento esperado/actual
- Adjunta logs o screenshots si aplica

### 💡 Proponer Features
- Abre un [Feature Request](../../issues/new?template=feature_request.yml)
- Explica el problema que resolvería y tu solución propuesta
- Asegúrate que no duplique funcionalidad existente

### 📖 Mejorar Documentación
- typos, correcciones, ejemplos adicionales
- Mejores explicaciones técnicas
- Traducciones

### 💻 Código
- Implementar nuevas features
- Bug fixes
- Refactorización
- Tests

---

## Setup de Desarrollo

```bash
# 1. Fork el repositorio (botón en GitHub)

# 2. Clonar tu fork
git clone https://github.com/TU_USUARIO/codeshield-mcp.git
cd codeshield-mcp

# 3. Agregar upstream como remote
git remote add upstream https://github.com/yourusername/codeshield-mcp.git

# 4. Crear virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate  # Windows

# 5. Instalar dependencias
pip install --upgrade pip
pip install -r requirements.txt

# 6. Crear branch para tu contribución
git checkout -b feature/nombre-descriptivo
# o: fix/descripcion-del-bug
```

---

## Flujo de Trabajo

```
1. Sincronizar con upstream
   git fetch upstream
   git checkout main
   git merge upstream/main

2. Crear branch desde main
   git checkout -b feature/mi-feature

3. Hacer cambios
   - Escribir código
   - Escribir tests
   - Asegurar que pasan

4. Commitear (ver formato abajo)
   git add .
   git commit -m "feat: add nueva funcionalidad"

5. Push a tu fork
   git push -u origin feature/mi-feature

6. Abrir Pull Request en GitHub
```

---

## Reglas de Código

### Python

- **Style:** Seguimos PEP 8
- **Type hints:** Recomendados para funciones públicas
- **Docstrings:** Para funciones públicas y clases

```python
def verify_import(module_name: str, source_file: str) -> list[str]:
    """
    Verifica que un import exista en el código fuente.

    Args:
        module_name: Nombre del módulo a verificar
        source_file: Ruta al archivo fuente

    Returns:
        Lista de errores encontrados (vacía si todo ok)

    Raises:
        FileNotFoundError: Si el archivo no existe
    """
    ...
```

### Estructura de Archivos

```
src/codeshield/
├── __init__.py           # Package init
├── server.py             # MCP server main
├── tools/                # Tools implementations
│   ├── __init__.py
│   ├── pre_analyze.py
│   ├── verify_code.py
│   └── ...
├── detection/            # Detection engines
│   ├── __init__.py
│   ├── imports.py
│   ├── functions.py
│   └── ...
└── fixers/               # Auto-fix implementations
    ├── __init__.py
    └── ...
```

---

## Commits

Seguimos **Conventional Commits**:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Uso |
|------|-----|
| `feat` | Nueva funcionalidad |
| `fix` | Bug fix |
| `docs` | Solo documentación |
| `style` | Formato, indentación (no lógica) |
| `refactor` | Refactorización (no features ni fixes) |
| `test` | Agregar o modificar tests |
| `chore` | Mantenimiento, deps, build |

### Ejemplos

```bash
# Bueno ✓
git commit -m "feat(detection): add import verification for Python"
git commit -m "fix(verify): handle None return from ast.parse"
git commit -m "docs(readme): update installation instructions"

# Malo ✗
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "asdfasdf"
```

---

## Pull Requests

### Checklist Antes de PR

- [ ] Tests agregados/actualizados
- [ ] Tests pasan localmente: `pytest tests/ -v`
- [ ] Lint pasa: `flake8 src/`
- [ ] Docstrings agregados
- [ ] Commits siguen conventional commits
- [ ] README actualizado si necesario

### Template de PR

```markdown
## Description
Breve descripción de los cambios

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
Cómo probaste los cambios

## Checklist
- [ ] Tests passing
- [ ] Lint passing
- [ ] Documentation updated
```

---

## Testing

### Estructura de Tests

```bash
tests/
├── unit/
│   ├── test_detection_imports.py
│   ├── test_detection_functions.py
│   └── ...
└── integration/
    ├── test_mcp_server.py
    └── ...
```

### Ejecutar Tests

```bash
# Todos los tests
pytest tests/ -v

# Solo unitarios
pytest tests/unit/ -v

# Con coverage
pytest tests/ --cov=src/codeshield --cov-report=html

# Solo un archivo
pytest tests/unit/test_detection_imports.py -v
```

### Mocking

Usar `unittest.mock` para dependencias externas:

```python
from unittest.mock import Mock, patch

def test_verify_import_with_mocked_fs():
    with patch('os.path.exists', return_value=True):
        result = verify_import('pandas', 'test.py')
        assert result == []
```

---

## Preguntas?

- Abre un issue con la etiqueta `question`
- Revisa los [discussions](../../discussions) en GitHub

---

¡Gracias por contribuir! 🎉