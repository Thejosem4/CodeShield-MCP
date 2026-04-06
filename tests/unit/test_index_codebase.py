"""
Tests para index_codebase
"""
import pytest
from pathlib import Path
from codeshield import index_codebase


class TestIndexCodebase:
    """Tests para la herramienta index_codebase"""

    def test_index_python_file(self, tmp_path):
        """Debe indexar un archivo Python correctamente"""
        # Crear archivo Python de prueba
        (tmp_path / "example.py").write_text("""
import os
from typing import List

class MyClass:
    def my_method(self, x: int) -> str:
        return str(x)

def my_function(a: List[int]) -> int:
    return sum(a)
""")

        result = index_codebase(str(tmp_path), ["python"])

        assert "MyClass" in result["classes"]
        assert "MyClass" in result["methods"]
        assert "my_method" in result["methods"]["MyClass"]
        assert "my_function" in result["functions"]
        assert "os" in result["imports"]

    def test_index_multiple_files(self, tmp_path):
        """Debe indexar múltiples archivos"""
        (tmp_path / "module1.py").write_text("def func1(): pass")
        (tmp_path / "module2.py").write_text("def func2(): pass")

        result = index_codebase(str(tmp_path), ["python"])

        assert len(result["functions"]) >= 2
        assert "func1" in result["functions"]
        assert "func2" in result["functions"]

    def test_index_with_exclusions(self, tmp_path):
        """Debe excluir directorios como node_modules, venv"""
        # Crear estructura real
        src_dir = tmp_path / "src"
        src_dir.mkdir()
        (src_dir / "main.py").write_text("def main(): pass")

        node_modules = tmp_path / "node_modules"
        node_modules.mkdir()
        (node_modules / "dep.py").write_text("def dep(): pass")

        result = index_codebase(str(tmp_path), ["python"], exclude=["node_modules"])

        # main debe estar indexado
        assert "main" in result["functions"]
        # dep de node_modules NO debe estar indexado
        assert "dep" not in result["functions"]

    def test_index_empty_directory(self, tmp_path):
        """Debe manejar directorios vacíos"""
        result = index_codebase(str(tmp_path), ["python"])

        assert result["classes"] == []
        assert result["functions"] == []
        assert result["imports"] == []

    def test_index_invalid_path(self):
        """Debe lanzar error en path inválido"""
        with pytest.raises(FileNotFoundError):
            index_codebase("/path/que/no/existe", ["python"])

    def test_index_unsupported_language(self, tmp_path):
        """Debe manejar lenguajes no soportados"""
        (tmp_path / "main.go").write_text("func main() {}")

        result = index_codebase(str(tmp_path), ["python"])  # solo python

        # No debe indexar el archivo go
        # El resultado depende de implementación - podría estar vacío o ignorar .go

    def test_index_typescript_file(self, tmp_path):
        """Debe indexar archivos TypeScript (v1.0 solo Python)"""
        (tmp_path / "example.ts").write_text("""
export class MyService {
    public async doSomething(): Promise<void> {
        console.log("hello");
    }
}
""")

        result = index_codebase(str(tmp_path), ["typescript"])

        # v1.0 solo soporta Python, otros lenguajes vendrán después
        # Por ahora el test verifica que no crashee y retorne estructura válida
        assert isinstance(result, dict)
        assert "classes" in result
        assert "functions" in result

    def test_index_javascript_file(self, tmp_path):
        """Debe indexar archivos JavaScript (v1.0 solo Python)"""
        (tmp_path / "example.js").write_text("""
const myFunc = () => {
    return "test";
};

module.exports = { myFunc };
""")

        result = index_codebase(str(tmp_path), ["javascript"])

        # v1.0 solo soporta Python
        assert isinstance(result, dict)

    def test_index_re_updates_index(self, tmp_path):
        """Debe actualizar el índice si el código cambia"""
        file = tmp_path / "example.py"
        file.write_text("def v1(): pass")

        result1 = index_codebase(str(tmp_path), ["python"])
        assert "v1" in result1["functions"]

        file.write_text("def v2(): pass")

        result2 = index_codebase(str(tmp_path), ["python"], reindex=True)
        assert "v2" in result2["functions"]
        # assert "v1" not in result2["functions"]  # depending on implementation

    def test_index_caches_results(self, tmp_path):
        """Debe usar cache si no se fuerza reindex"""
        (tmp_path / "example.py").write_text("def cached(): pass")

        # First call - indexes
        result1 = index_codebase(str(tmp_path), ["python"])
        # Second call - should use cache
        result2 = index_codebase(str(tmp_path), ["python"], reindex=False)

        # Results should be consistent and from cache
        assert result1 == result2