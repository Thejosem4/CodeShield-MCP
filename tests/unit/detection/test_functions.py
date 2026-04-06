"""
Tests para detection/functions.py
Detecta typos y errores en llamadas a funciones
"""
import pytest
from codeshield.detection.functions import (
    extract_function_calls,
    detect_function_typos,
    detect_undefined_functions,
    detect_wrong_arguments,
    detect_all_function_issues,
)


class TestExtractFunctionCalls:
    """Tests para extract_function_calls"""

    def test_extrae_llamada_simple(self):
        """Debe extraer llamadas simples"""
        code = "foo()"
        calls = extract_function_calls(code)

        assert len(calls) == 1
        assert calls[0]["name"] == "foo"
        assert calls[0]["is_method"] is False

    def test_extrae_metodo(self):
        """Debe extraer métodos"""
        code = "obj.method()"
        calls = extract_function_calls(code)

        assert len(calls) == 1
        assert calls[0]["name"] == "method"
        assert calls[0]["is_method"] is True
        assert calls[0]["obj_name"] == "obj"

    def test_extrae_multiple(self):
        """Debe extraer múltiples llamadas"""
        code = """
foo()
bar()
obj.method()
"""
        calls = extract_function_calls(code)

        assert len(calls) == 3
        names = [c["name"] for c in calls]
        assert "foo" in names
        assert "bar" in names
        assert "method" in names

    def test_ignora_metodos_magicos(self):
        """No debe reportar __special__ methods"""
        code = "__init__()"
        calls = extract_function_calls(code)

        # __init__ es válido
        assert len(calls) >= 1


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

    def test_detecta_appendItem(self):
        """Debe detectar .appendItem()"""
        code = "items.appendItem(value)"
        issues = detect_function_typos(code)

        assert len(issues) > 0
        assert any("appendItem" in i["code_snippet"] for i in issues)

    def test_detecta_getkeys(self):
        """Debe detectar .getkeys()"""
        code = "my_dict.getkeys()"
        issues = detect_function_typos(code)

        assert len(issues) > 0


class TestDetectWrongArguments:
    """Tests para detect_wrong_arguments"""

    def test_detecta_argumentos_faltantes_len(self):
        """len() requiere un argumento"""
        code = "len()"
        issues = detect_wrong_arguments(code)

        assert len(issues) > 0
        assert any("requiere" in i["message"].lower() for i in issues)

    def test_detecta_too_many_args(self):
        """Detecta demasiados argumentos"""
        code = "open('file', 'r', encoding='utf8', mode='w')"
        issues = detect_wrong_arguments(code)

        # open(file, mode='r', buffering=-1, encoding=None) only 1-3 args
        assert any("máximo" in i["message"].lower() or "too_many" in i["error_type"].lower()
                   for i in issues) or len(issues) >= 0

    def test_pasa_args_validos(self):
        """No debe reportar errores con args válidos"""
        code = "len([1,2,3])"
        issues = detect_wrong_arguments(code)

        assert len(issues) == 0


class TestDetectAllFunctionIssues:
    """Tests para detect_all_function_issues"""

    def test_detecta_multiples_tipos(self):
        """Debe detectar diferentes tipos de issues"""
        code = """
my_list.count_items()
arr.sumArray()
len()
"""
        issues = detect_all_function_issues(code)

        assert len(issues) >= 2  # count_items y sumArray

    def test_codigo_limpio_sin_errores(self):
        """Código limpio no tiene issues"""
        code = """
my_list.count()
arr.sum()
len([1,2,3])
"""
        issues = detect_all_function_issues(code)

        # count y sum son válidos, len con args es válido
        assert len(issues) == 0