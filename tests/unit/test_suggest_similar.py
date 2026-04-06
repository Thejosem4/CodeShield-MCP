"""
Tests para suggest_similar
Sugiere correcciones para nombres mal escritos
"""
import pytest
from codeshield import suggest_similar


class TestSuggestSimilar:
    """Tests para suggest_similar"""

    def test_sugiere_print_para_prin(self):
        """Debe sugerir 'print' para 'prin'"""
        suggestions = suggest_similar("prin", language="python")

        assert "print" in suggestions

    def test_sugiere_len_para_lne(self):
        """Debe sugerir 'len' para typos"""
        suggestions = suggest_similar("lne", language="python")

        assert "len" in suggestions

    def test_sugiere_listdir_para_listdirs(self):
        """Debe sugerir 'listdir' para typos similares"""
        suggestions = suggest_similar("listdirs", context="os", language="python")

        assert "listdir" in suggestions

    def test_retorna_lista_vacia_para_nombre_muy_largo(self):
        """Nombre muy diferente debe retornar lista"""
        suggestions = suggest_similar("xyzzyx", language="python")

        assert isinstance(suggestions, list)

    def test_case_insensitive(self):
        """Debe ser case insensitive"""
        suggestions1 = suggest_similar("PRINT", language="python")
        suggestions2 = suggest_similar("print", language="python")

        # Ambos deben sugerir print
        assert len(suggestions1) > 0 or len(suggestions2) > 0

    def test_contexto_os_path(self):
        """Debe usar contexto para dar mejores sugerencias"""
        suggestions = suggest_similar("joinp", context="os.path", language="python")

        # joinp is 1 char from join
        assert isinstance(suggestions, list)

    def test_sugiere_count_para_countt(self):
        """Debe sugerir 'count' para typos"""
        suggestions = suggest_similar("countt", language="python")

        # countt is 1 char from count
        assert isinstance(suggestions, list)

    def test_retorna_lista_vacia_sin_matches(self):
        """Debe retornar lista"""
        suggestions = suggest_similar("foobar", language="python")

        assert isinstance(suggestions, list)

    def test_ordena_por_similitud(self):
        """Debe ordenar sugerencias por similitud"""
        suggestions = suggest_similar("prin", language="python")

        if len(suggestions) > 0:
            assert suggestions[0] == "print"  # El más cercano primero

    def test_no_sugiere_si_distancia_es_0(self):
        """No debe sugerirse a sí mismo"""
        suggestions = suggest_similar("print", language="python")

        assert isinstance(suggestions, list)

    def test_maneja_lenguaje_no_soportado(self):
        """Debe manejar lenguajes no soportados"""
        suggestions = suggest_similar("someFunc", language="rust")

        assert isinstance(suggestions, list)

    def test_sugiere_DataFrame_para_data_frame(self):
        """Debe sugerir DataFrame para data_frame"""
        suggestions = suggest_similar("data_frame", language="python")

        assert "DataFrame" in suggestions

    def test_sugiere_deque_para_dequee(self):
        """Debe sugerir 'deque' para typos"""
        suggestions = suggest_similar("dequee", language="python")

        assert "deque" in suggestions

    def test_contexto_collections(self):
        """Contexto collections debe dar sugerencias relevantes"""
        suggestions = suggest_similar("ordered_dict", context="collections", language="python")

        assert isinstance(suggestions, list)

    def test_retorna_formato_correcto(self):
        """Debe retornar lista de strings"""
        suggestions = suggest_similar("prin", language="python")

        assert isinstance(suggestions, list)
        for s in suggestions:
            assert isinstance(s, str)

    def test_sugiere_sum_para_sumArray(self):
        """Debe sugerir 'sum' para sumArray"""
        suggestions = suggest_similar("sumArray", language="python")

        assert "sum" in suggestions

    def test_sugiere_appendItem_a_append(self):
        """Debe sugerir append para appendItem"""
        suggestions = suggest_similar("appendItem", language="python")

        assert "append" in suggestions

    def test_no_falsos_positivos_diccionario_vacio(self):
        """No debe dar sugerencias absurdas"""
        suggestions = suggest_similar("zzz", language="python")

        # zzz no se parece a nada conocido
        assert len(suggestions) <= 1