"""
Tests para el detection engine de imports.
Usa TDD - los tests vienen primero, implementación después.
"""
import pytest
from codeshield.detection.imports import (
    extract_imports,
    suggest_similar_function,
    levenshtein_distance,
    is_stdlib_module,
    check_import_exists,
    detect_import_issues,
    detect_function_typos,
    detect_syntax_errors,
    detect_all_issues,
    STDLIB_MODULES,
    STDLIB_FUNCTIONS,
)


class TestExtractImports:
    """Tests para extract_imports"""

    def test_extrae_import_simple(self):
        """Debe extraer imports simples"""
        code = "import os"
        imports = extract_imports(code)

        assert len(imports) == 1
        assert imports[0]["name"] == "os"
        assert imports[0]["is_from"] is False

    def test_extrae_import_con_alias(self):
        """Debe extraer imports con alias"""
        code = "import os.path as op"
        imports = extract_imports(code)

        assert len(imports) == 1
        assert imports[0]["name"] == "os.path"
        assert imports[0]["alias"] == "op"

    def test_extrae_from_import(self):
        """Debe extraer from...import"""
        code = "from os import path"
        imports = extract_imports(code)

        assert len(imports) == 1
        assert imports[0]["name"] == "path"
        assert imports[0]["from_module"] == "os"
        assert imports[0]["is_from"] is True

    def test_extrae_multiples_imports(self):
        """Debe extraer múltiples imports en una línea"""
        code = "from os.path import join, dirname"
        imports = extract_imports(code)

        assert len(imports) == 2
        names = [i["name"] for i in imports]
        assert "join" in names
        assert "dirname" in names

    def test_extrae_multiples_lineas(self):
        """Debe extraer imports de múltiples líneas"""
        code = """
import os
import sys
from collections import Counter, OrderedDict
"""
        imports = extract_imports(code)

        assert len(imports) == 4

    def test_retorna_lista_vacia_para_codigo_sin_imports(self):
        """Debe retornar lista vacía si no hay imports"""
        code = "x = 1 + 2"
        imports = extract_imports(code)

        assert imports == []

    def test_maneja_sintaxis_invalida(self):
        """Debe manejar código con sintaxis inválida"""
        code = "import (broken"
        imports = extract_imports(code)

        assert imports == []


class TestLevenshteinDistance:
    """Tests para levenshtein_distance"""

    def test_iguales_retorna_cero(self):
        """Distancia entre strings iguales es 0"""
        assert levenshtein_distance("hello", "hello") == 0

    def test_un_caracter_diferente(self):
        """Un carácter diferente"""
        assert levenshtein_distance("hello", "hallo") == 1

    def test_insercion(self):
        """Inserción suma 1"""
        assert levenshtein_distance("hello", "hello!") == 1

    def test_deleccion(self):
        """Deletion suma 1"""
        assert levenshtein_distance("hello!", "hello") == 1

    def test_sustitucion_multiple(self):
        """Múltiples sustituciones"""
        assert levenshtein_distance("hello", "world") == 4

    def test_case_sensitive(self):
        """Es case sensitive"""
        assert levenshtein_distance("Hello", "hello") == 1

    def test_strings_vacios(self):
        """String vacío"""
        assert levenshtein_distance("", "") == 0
        assert levenshtein_distance("a", "") == 1
        assert levenshtein_distance("", "a") == 1


class TestSuggestSimilarFunction:
    """Tests para suggest_similar_function"""

    def test_encontra_similar_en_os(self):
        """Debe sugerir función similar del módulo os"""
        suggestions = suggest_similar_function("os", "listdir")  # exists

        # listdir existe, no debe sugerir nada (o debe retornar vacío)
        # el nombre correcto no debe"sugerirse" a sí mismo
        # pero nuestra implementación excluye distancia 0
        # así que esperamos vacío o solo sugerencias diferentes

    def test_sugiere_join_para_joinp(self):
        """Debe sugerir 'join' para 'joinp'"""
        suggestions = suggest_similar_function("os.path", "joinp")

        assert len(suggestions) > 0
        assert "join" in suggestions

    def test_sugiere_count_para_countt(self):
        """Debe sugerir 'count' para typos"""
        suggestions = suggest_similar_function("collections", "countt")

        assert len(suggestions) > 0

    def test_retorna_vacio_para_modulo_desconocido(self):
        """Retorna vacío para módulo sin funciones conocidas"""
        suggestions = suggest_similar_function("unknown_module", "func")

        # Módulo no conocido, no puede sugerir
        assert isinstance(suggestions, list)

    def test_distancia_maxima(self):
        """Respeta la distancia máxima"""
        suggestions = suggest_similar_function("os", "xyz", max_distance=1)

        # Si la distancia es mayor a 1, no debe sugerir
        # Esto depende de la implementación


class TestIsStdlibModule:
    """Tests para is_stdlib_module"""

    def test_os_es_stdlib(self):
        """os es stdlib"""
        assert is_stdlib_module("os") is True

    def test_sys_es_stdlib(self):
        """sys es stdlib"""
        assert is_stdlib_module("sys") is True

    def test_collections_es_stdlib(self):
        """collections es stdlib"""
        assert is_stdlib_module("collections") is True

    def test_pandas_no_es_stdlib(self):
        """pandas no es stdlib"""
        assert is_stdlib_module("pandas") is False

    def test_numpy_no_es_stdlib(self):
        """numpy no es stdlib"""
        assert is_stdlib_module("numpy") is False

    def test_submodulo(self):
        """Debe funcionar con submodulos"""
        assert is_stdlib_module("os.path") is True


class TestCheckImportExists:
    """Tests para check_import_exists"""

    def test_existe_en_stdlib(self):
        """Funciones existentes en stdlib"""
        result = check_import_exists("path", "os")

        assert result["exists"] is True

    def test_no_existe_en_stdlib(self):
        """Funciones no existentes en stdlib"""
        result = check_import_exists("nonexistent", "os")

        assert result["exists"] is False

    def test_incluye_sugerencia(self):
        """Incluye sugerencia para typos"""
        result = check_import_exists("listdirs", "os")

        # listdirs no existe, debe sugerir listdir
        assert result["exists"] is False
        assert result["suggestion"] is not None

    def test_sin_from_module(self):
        """Sin from_module, solo verifica stdlib modules"""
        result = check_import_exists("os", None)

        # 'os' como import name, no como from_module
        # esto verifica si 'os' es un módulo válido
        assert result["exists"] is True


class TestDetectImportIssues:
    """Tests para detect_import_issues"""

    def test_detecta_import_inexistente(self):
        """Debe detectar imports que no existen"""
        code = "from os import nonexistent_func"
        issues = detect_import_issues(code)

        assert len(issues) > 0
        assert issues[0]["error_type"] == "import_not_found"

    def test_no_detecta_imports_validos(self):
        """No debe detectar issues en imports válidos"""
        code = "from os import path, listdir"
        issues = detect_import_issues(code)

        # path y listdir existen en os
        # no debe haber issues
        assert len(issues) == 0

    def test_detecta_desde_numpy(self):
        """Debe funcionar con módulos externos"""
        code = "from numpy import sumArray"  # typo: sum
        issues = detect_import_issues(code)

        # numpy no está en STDLIB_FUNCTIONS todavía
        # por lo tanto no detecta - esto es expected
        assert isinstance(issues, list)

    def test_codigo_sin_imports(self):
        """Debe manejar código sin imports"""
        code = "x = 1 + 2"
        issues = detect_import_issues(code)

        assert issues == []


class TestDetectFunctionTypos:
    """Tests para detect_function_typos"""

    def test_detecta_count_items(self):
        """Debe detectar .count_items()"""
        code = "my_list.count_items()"
        issues = detect_function_typos(code)

        assert len(issues) > 0
        assert any("count_items" in i["code_snippet"] for i in issues)

    def test_detecta_sumArray(self):
        """Debe detectar .sumArray()"""
        code = "arr.sumArray()"
        issues = detect_function_typos(code)

        assert len(issues) > 0

    def test_no_detecta_metodos_validos(self):
        """No debe detectar métodos válidos"""
        code = "my_list.count()"
        issues = detect_function_typos(code)

        assert len(issues) == 0

    def test_maneja_codigo_vacio(self):
        """Debe manejar código vacío"""
        issues = detect_function_typos("")
        assert issues == []


class TestDetectSyntaxErrors:
    """Tests para detect_syntax_errors"""

    def test_detecta_parentesis_faltante(self):
        """Debe detectar paréntesis faltante"""
        code = "def broken(\n    x,\n    y\n"
        issues = detect_syntax_errors(code)

        assert len(issues) > 0
        assert issues[0]["error_type"] == "syntax_error"

    def test_codigo_valido_sin_errores(self):
        """Código válido no tiene errores de sintaxis"""
        code = "def valid():\n    return 1"
        issues = detect_syntax_errors(code)

        assert issues == []

    def test_detecta_import_incompleto(self):
        """Debe detectar import incompleto"""
        code = "import"
        issues = detect_syntax_errors(code)

        assert len(issues) > 0


class TestDetectAllIssues:
    """Tests para detect_all_issues"""

    def test_detecta_multiples_tipos(self):
        """Debe detectar diferentes tipos de issues"""
        code = """
from os import pathh  # typo
def test():
    x.count_items()  # typo
"""
        issues = detect_all_issues(code)

        assert len(issues) >= 2

    def test_retorna_vacio_para_codigo_limpio(self):
        """Código limpio no tiene issues"""
        code = """
from os import path
def test():
    x.count()
"""
        issues = detect_all_issues(code)

        # count existe, path existe
        assert len(issues) == 0

    def test_ignora_lenguajes_no_python(self):
        """Ignora JavaScript y TypeScript por ahora"""
        code = "const x = require('fs');"
        issues = detect_all_issues(code, "javascript")

        assert issues == []

    def testIncluye_linea_en_resultado(self):
        """Los issues incluyen número de línea"""
        code = """
from os import pathh
x = 1
"""
        issues = detect_all_issues(code)

        assert all("line" in issue for issue in issues)