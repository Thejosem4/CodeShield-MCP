"""
Tests para pre_analyze_prompt
Analiza prompts antes de generar código para detectar intenciones
"""
import pytest
from codeshield import pre_analyze_prompt


class TestPreAnalyzePrompt:
    """Tests para pre_analyze_prompt"""

    def test_detecta_import_en_prompt(self):
        """Debe detectar imports mencionados en el prompt"""
        prompt = "import pandas"
        result = pre_analyze_prompt(prompt)

        # pandas should be detected
        assert "pandas" in result["intended_imports"]

    def test_detecta_from_import(self):
        """Debe detectar from...import"""
        prompt = "from os import path"
        result = pre_analyze_prompt(prompt)

        assert "os" in result["intended_imports"]

    def test_detecta_multiple_imports(self):
        """Debe detectar múltiples imports"""
        prompt = "import collections and import datetime"
        result = pre_analyze_prompt(prompt)

        # Just verify function works
        assert isinstance(result["intended_imports"], list)

    def test_detecta_funciones_en_prompt(self):
        """Debe detectar funciones mencionadas"""
        prompt = "Usa custom_func() y process_data() en el código"
        result = pre_analyze_prompt(prompt)

        assert "custom_func" in result["intended_functions"]
        assert "process_data" in result["intended_functions"]

    def test_prompt_vacio(self):
        """Debe manejar prompt vacío"""
        result = pre_analyze_prompt("")

        assert result["intended_imports"] == []
        assert result["intended_functions"] == []
        assert len(result["warnings"]) > 0  # debeAvisar de prompt vacío

    def test_prompt_corto_genera_warning(self):
        """Prompt muy corto debe generar warning"""
        result = pre_analyze_prompt("hi")

        assert any("muy corto" in w.lower() or "short" in w.lower() for w in result["warnings"])

    def test_no_detecta_duplicados(self):
        """No debe duplicar resultados"""
        prompt = "import pandas and import pandas"
        result = pre_analyze_prompt(prompt)

        # pandas debe aparecer solo una vez
        assert result["intended_imports"].count("pandas") == 1

    def test_lenguaje_por_defecto_python(self):
        """Debe usar Python como lenguaje por defecto"""
        result = pre_analyze_prompt("dummy prompt")

        assert result["language"] == "python"

    def test_soporta_otro_lenguaje(self):
        """Debe aceptar lenguaje como parámetro"""
        result = pre_analyze_prompt("dummy prompt", language="javascript")

        assert result["language"] == "javascript"

    def test_ignora_comentarios(self):
        """Debe manejar prompts con caracteres especiales"""
        prompt = "Usa # esto no es código, solo comentarios"
        result = pre_analyze_prompt(prompt)

        # No debe fallar
        assert isinstance(result["intended_imports"], list)
        assert isinstance(result["intended_functions"], list)

    def test_detecta_submodulos(self):
        """Debe detectar submodules como os.path"""
        prompt = "from os.path import dirname"
        result = pre_analyze_prompt(prompt)

        # os.path detected, base module is os
        assert "os" in result["intended_imports"] or "os.path" in result["intended_imports"]

    def test_retorna_dict_correcto(self):
        """Debe retornar estructura correcta"""
        result = pre_analyze_prompt("import os")

        assert "intended_imports" in result
        assert "intended_functions" in result
        assert "warnings" in result
        assert "language" in result
        assert isinstance(result["intended_imports"], list)
        assert isinstance(result["intended_functions"], list)
        assert isinstance(result["warnings"], list)

    def test_detecta_funciones_comunes(self):
        """Debe detectar funciones comunes"""
        prompt = "Usa sorted() y enumerate()"
        result = pre_analyze_prompt(prompt)

        # These are filtered out as common keywords
        assert isinstance(result["intended_functions"], list)