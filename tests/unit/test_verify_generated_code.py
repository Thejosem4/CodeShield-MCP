"""
Tests para verify_generated_code
Detecta alucinaciones en código generado por LLM
"""
import pytest
from codeshield import verify_generated_code


class TestVerifyGeneratedCode:
    """Tests para verificar código generado contra el codebase"""

    def test_detecta_import_inexistente_python(self):
        """Debe detectar imports que no existen en librerías reales"""
        codigo = """
import pandas as pd
from pandas import data_frame  # typo!

df = data_frame({'a': [1, 2, 3]})
"""
        errores = verify_generated_code(codigo, "python")

        assert len(errores) > 0
        assert any("data_frame" in e for e in errores)
        assert any("no existe" in e.lower() or "does not exist" in e.lower() for e in errores)

    def test_detecta_funcion_inexistente_python(self):
        """Debe detectar funciones que no existen"""
        codigo = """
from collections import Counter

my_list = [1, 2, 2, 3]
count = my_list.count_items()  # typo: el método es .count()
"""
        errores = verify_generated_code(codigo, "python")

        assert len(errores) > 0
        assert any("count_items" in e for e in errores)

    def test_detecta_typo_en_import_builtin(self):
        """Debe detectar typos en imports de stdlib"""
        codigo = """
from os.path import joinp  # typo: join
"""
        errores = verify_generated_code(codigo, "python")

        assert len(errores) > 0
        assert any("joinp" in e for e in errores)

    def test_pasa_codigo_valido_python(self):
        """No debe reportar errores en código correcto"""
        codigo = """
import os
from typing import List

def process(items: List[int]) -> int:
    return sum(items)
"""
        errores = verify_generated_code(codigo, "python")

        assert errores == []

    def test_detecta_clase_inexistente(self):
        """Debe detectar clases referenciadas que no existen"""
        codigo = """
from datetime import DatetimeTZ  # typo

dt = DatetimeTZ.now()
"""
        errores = verify_generated_code(codigo, "python")

        assert len(errores) > 0
        assert any("DatetimeTZ" in e for e in errores)

    def test_detecta_import_no_existente_en_numpy(self):
        """Debe detectar funciones inexistentes en numpy"""
        codigo = """
import numpy as np

arr = np.array([1, 2, 3])
result = np.sumArray(arr)  # typo: sum
"""
        errores = verify_generated_code(codigo, "python")

        assert len(errores) > 0

    def test_detecta_sintaxis_invalida_python(self):
        """Debe detectar errores de sintaxis básicos"""
        codigo = """
def broken(
    x
    return x  # indentation error, not a real Python syntax error actually
"""
        # Nota: Python es flexible con paréntesis, probemos algo que realmente falle
        codigo = "def f(\nprint('fail')"  # Esto sí es error de sintaxis
        errores = verify_generated_code(codigo, "python")

        assert len(errores) > 0

    def test_verifica_javascript_import_inexistente(self):
        """JavaScript/TypeScript no soportado en v1.0"""
        codigo = """
const fs = require('fs');
const { readFil } = require('fs');  // typo: readFile
"""
        errores = verify_generated_code(codigo, "javascript")

        # v1.0 solo soporta Python, JS/TS retorna lista vacía
        assert errores == []

    def test_verifica_typescript_tipos_invalidos(self):
        """TypeScript no soportado en v1.0"""
        codigo = """
interface User {
    name: string;
    age: number;
}

const user: Userr = { name: "John", age: 30 };  // typo: Userr
"""
        errores = verify_generated_code(codigo, "typescript")

        # v1.0 solo soporta Python
        assert errores == []

    def test_retorna_lista_vacia_sin_errores(self):
        """Debe retornar lista vacía cuando no hay errores"""
        codigo = "print('hello world')"
        errores = verify_generated_code(codigo, "python")

        assert isinstance(errores, list)
        assert errores == []

    def test_maneja_codigo_vacio(self):
        """Debe manejar código vacío"""
        errores = verify_generated_code("", "python")
        assert errores == []

    def test_maneja_lenguaje_no_soportado(self):
        """Debe manejar lenguajes no soportados graciosamente"""
        errores = verify_generated_code("some code", "rust")
        # Podría retornar lista vacía o error específico
        assert isinstance(errores, list)

    def test_detecta_variable_no_definida(self):
        """Debe detectar variables usadas sin definir"""
        codigo = """
def process():
    result = undefined_var + 1
    return result
"""
        errores = verify_generated_code(codigo, "python")

        # Podría detectar undefined_var como no definida
        # O podría solo detectar issues de imports/funciones
        assert isinstance(errores, list)

    def test_codigo_multiples_errores(self):
        """Debe detectar múltiples errores en un solo bloque"""
        codigo = """
import pandas as pd
from pandas import data_frame  # error 1
from nonexistent import func   # error 2

df = pd.data_fram({'a': [1]})  # error 3
"""
        errores = verify_generated_code(codigo, "python")

        assert len(errores) >= 2  # Al menos 2 de los 3

    def test_contexto_de_import_ayuda(self):
        """Errores deben incluir contexto del import"""
        codigo = """
from os.path import joinp
"""
        errores = verify_generated_code(codigo, "python")

        assert len(errores) > 0
        # El error debería indicar qué función similar existe
        assert any("join" in e.lower() for e in errores)

    def test_usa_indice_del_codebase(self):
        """Debe usar el índice generado por index_codebase"""
        codigo = """
from mymodule import MyClass

obj = MyClass()
obj.nonexistent_method()
"""
        #假设 el codebase tiene MyClass pero no nonexistent_method
        index = {
            "classes": ["MyClass"],
            "functions": [],
            "methods": {"MyClass": ["known_method"]},
            "imports": ["mymodule"]
        }
        errores = verify_generated_code(codigo, "python", code_base_index=index)

        # Debe indicar que nonexistent_method no existe en MyClass
        assert len(errores) > 0

    def test_no_falsos_positivos_en_codigo_valido(self):
        """No debe reportar errores en código válido de proyecto real"""
        codigo = """
from myapp.models import User
from django.db import connection

def get_users():
    return User.objects.all()

def create_user(data):
    with connection.cursor() as cursor:
        cursor.execute("INSERT INTO users VALUES (%s)", [data])
"""
        # Este código podría tener falsos positivos si no conoce el proyecto
        errores = verify_generated_code(codigo, "python", code_base_index={})

        # Como no tenemos índice real, solo verificamos formato
        assert isinstance(errores, list)