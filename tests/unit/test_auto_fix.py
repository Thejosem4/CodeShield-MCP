"""
Tests para auto_fix
Corrige automáticamente errores detectables
"""
import pytest
from codeshield import auto_fix


class TestAutoFix:
    """Tests para auto_fix"""

    def test_corrige_count_items_a_count(self):
        """Debe corregir .count_items() a .count()"""
        code = "my_list.count_items()"
        fixed = auto_fix(code, "count_items does not exist", "python")

        assert ".count(" in fixed
        assert ".count_items(" not in fixed

    def test_corrige_sumArray_a_sum(self):
        """Debe corregir .sumArray() a .sum()"""
        code = "arr.sumArray()"
        fixed = auto_fix(code, "sumArray does not exist", "python")

        assert ".sum(" in fixed
        assert ".sumArray(" not in fixed

    def test_corrige_import_data_frame_a_DataFrame(self):
        """Debe corregir import de data_frame a DataFrame"""
        code = "from pandas import data_frame"
        fixed = auto_fix(code, "data_frame not found", "python")

        assert "DataFrame" in fixed
        assert "data_frame" not in fixed

    def test_corrige_datafram_a_DataFrame(self):
        """Debe corregir el typo datafram"""
        code = "from pandas import datafram"
        fixed = auto_fix(code, "datafram not found", "python")

        assert "DataFrame" in fixed

    def test_corrige_joinp_a_join(self):
        """Debe corregir joinp a join"""
        code = "result = path.joinp(folder, file)"
        fixed = auto_fix(code, "joinp", "python")

        assert "join(" in fixed
        assert "joinp" not in fixed

    def test_corrige_readFil_a_readFile(self):
        """Debe corregir readFil a readFile"""
        code = "content = fs.readFil(path)"
        fixed = auto_fix(code, "readFil", "python")

        assert "readFile" in fixed

    def test_corrige_writenFile_a_writeFile(self):
        """Debe corregir writenFile a writeFile"""
        code = "fs.writenFile(path, data)"
        fixed = auto_fix(code, "writenFile", "python")

        assert "writeFile" in fixed

    def test_corrige_DatetimeTZ_a_datetime(self):
        """Debe corregir DatetimeTZ a datetime"""
        code = "dt = DatetimeTZ.now()"
        fixed = auto_fix(code, "DatetimeTZ", "python")

        assert "datetime" in fixed
        assert "DatetimeTZ" not in fixed

    def test_corrige_appendItem_a_append(self):
        """Debe corregir appendItem a append"""
        code = "list.appendItem(value)"
        fixed = auto_fix(code, "appendItem", "python")

        assert ".append(" in fixed

    def test_retorna_codigo_sin_cambios_si_no_hay_errores(self):
        """Debe retornar código original si no hay errores detectables"""
        code = "my_list.count()"
        fixed = auto_fix(code, "no error", "python")

        # Sin match de patterns, debe retornar igual
        assert fixed == code or fixed == code.replace("count()", "count()")

    def test_no_cambia_codigo_vacio(self):
        """Debe manejar código vacío"""
        fixed = auto_fix("", "error", "python")

        assert fixed == ""

    def test_ignora_lenguaje_no_soportado(self):
        """Debe retornar código sin cambios para JS/TS (v1.0)"""
        code = "const x = require('fs');"
        fixed = auto_fix(code, "error", "javascript")

        # JavaScript no soportado, retorna igual
        assert fixed == code

    def test_multiples_correcciones(self):
        """Debe corregir múltiples errores en un solo paso"""
        code = """
from pandas import data_frame
arr.sumArray()
list.count_items()
"""
        fixed = auto_fix(code, "multiple errors", "python")

        assert "DataFrame" in fixed
        assert ".sum(" in fixed
        assert ".count(" in fixed

    def test_preserva_otra_estructura(self):
        """Debe preservar el resto del código"""
        code = """
def process():
    data = [1, 2, 3]
    return data.sumArray()
"""
        fixed = auto_fix(code, "sumArray", "python")

        # Solo debe cambiar sumArray, no el resto
        assert "def process():" in fixed
        assert "data = [1, 2, 3]" in fixed
        assert ".sum(" in fixed

    def test_corrige_varios_en_una_linea(self):
        """Debe corregir múltiples errores en la misma línea"""
        code = "x.count_items() and y.sumArray()"
        fixed = auto_fix(code, "errors", "python")

        assert ".count(" in fixed
        assert ".sum(" in fixed

    def test_retorna_original_cuando_no_hay_match(self):
        """Debe retornar código original si error no es reconocible"""
        code = "print('hello')"
        fixed = auto_fix(code, "unknown error pattern xyz123", "python")

        # No hay match para "unknown error pattern xyz123"
        assert fixed == code

    def test_corrige_getwrong_a_get(self):
        """Debe corregir métodos get incorrectos"""
        code = "dict.getwrong(key)"
        fixed = auto_fix(code, "getwrong", "python")

        assert ".get(" in fixed

    def test_no_falsos_positivos(self):
        """No debe hacer cambios incorrectos"""
        code = "def correct_function(): pass"
        fixed = auto_fix(code, "error", "python")

        # No debe cambiar nada
        assert "correct_function" in fixed

    def test_formato_de_error_no_importa(self):
        """El contenido del parámetro 'error' no afecta la corrección"""
        code = "arr.sumArray()"

        # El fix se basa en patterns en el código, no en el mensaje de error
        fixed1 = auto_fix(code, "sumArray not found", "python")
        fixed2 = auto_fix(code, "any error message here", "python")

        # Ambos deben aplicar el mismo fix
        assert fixed1 == fixed2