"""
Tests para detection/classes.py
Detecta typos y errores en clases
"""
import pytest
from codeshield.detection.classes import (
    extract_class_definitions,
    extract_class_instantiations,
    detect_class_typos,
    detect_undefined_classes,
    detect_all_class_issues,
)


class TestExtractClassDefinitions:
    """Tests para extract_class_definitions"""

    def test_extrae_clase_simple(self):
        """Debe extraer definición de clase"""
        code = """
class MyClass:
    pass
"""
        classes = extract_class_definitions(code)

        assert len(classes) == 1
        assert classes[0]["name"] == "MyClass"

    def test_extrae_con_herencia(self):
        """Debe extraer clases con herencia"""
        code = """
class Child(Parent):
    pass
"""
        classes = extract_class_definitions(code)

        assert len(classes) == 1
        assert classes[0]["name"] == "Child"
        assert "Parent" in classes[0]["base_classes"]

    def test_extrae_metodos(self):
        """Debe extraer métodos de la clase"""
        code = """
class MyClass:
    def method1(self):
        pass
    def method2(self, x):
        pass
"""
        classes = extract_class_definitions(code)

        assert len(classes) == 1
        assert "method1" in classes[0]["methods"]
        assert "method2" in classes[0]["methods"]

    def test_extrae_multiples_clases(self):
        """Debe extraer múltiples clases"""
        code = """
class Class1:
    pass
class Class2:
    pass
"""
        classes = extract_class_definitions(code)

        assert len(classes) == 2


class TestExtractClassInstantiations:
    """Tests para extract_class_instantiations"""

    def test_extrae_instantiation(self):
        """Debe extraer llamadas a clases"""
        code = "obj = MyClass()"
        insts = extract_class_instantiations(code)

        assert len(insts) == 1
        assert insts[0]["name"] == "MyClass"

    def test_ignora_funciones_minusculas(self):
        """No debe confundir funciones con clases"""
        code = "result = my_function()"
        insts = extract_class_instantiations(code)

        # my_function es minuscula, no es clase
        assert len(insts) == 0

    def test_extrae_con_args(self):
        """Debe extraer con argumentos"""
        code = "obj = MyClass(arg1, arg2)"
        insts = extract_class_instantiations(code)

        assert len(insts) == 1
        assert insts[0]["args"] == 2

    def test_extrae_multiple(self):
        """Debe extraer múltiples instantiations"""
        code = """
obj1 = Class1()
obj2 = Class2()
"""
        insts = extract_class_instantiations(code)

        assert len(insts) == 2


class TestDetectClassTypos:
    """Tests para detect_class_typos"""

    def test_detecta_datafram_a_DataFrame(self):
        """Debe detectar typo datafram (case-sensitive check)"""
        code = "df = Datafram()"  # intentional typo: Datafram
        issues = detect_class_typos(code)

        assert len(issues) > 0

    def test_detecta_DatetimeTZ(self):
        """Debe detectar DatetimeTZ"""
        code = "dt = DatetimeTZ()"
        issues = detect_class_typos(code)

        assert len(issues) > 0

    def test_no_detecta_clases_validas(self):
        """No debe detectar clases válidas"""
        code = "df = DataFrame()"
        issues = detect_class_typos(code)

        # DataFrame existe, no debe haber issues
        assert len(issues) == 0

    def test_detecta_OrderedDictt(self):
        """Debe detectar OrderedDictt typo"""
        code = "d = OrderedDictt()"
        issues = detect_class_typos(code)

        assert len(issues) > 0


class TestDetectAllClassIssues:
    """Tests para detect_all_class_issues"""

    def test_detecta_multiples_tipos(self):
        """Debe detectar múltiples issues de clases"""
        code = """
df = datafram()
dt = DatetimeTZ()
"""
        issues = detect_all_class_issues(code)

        assert len(issues) >= 1

    def test_codigo_limpio_sin_errores(self):
        """Código limpio sin issues"""
        code = """
df = DataFrame()
dt = datetime()
"""
        issues = detect_all_class_issues(code)

        assert len(issues) == 0