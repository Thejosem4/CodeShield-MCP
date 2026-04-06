"""
CodeShield MCP Server

Expone las herramientas de CodeShield como servidor MCP (Model Context Protocol)
con transporte stdio — compatible con Claude Code, Claude CLI, Gemini CLI, y otros.

Uso:
    python -m codeshield.server
    # o
    codeshield  # si está instalado con entry point
"""
import json
from mcp.server.fastmcp import FastMCP

from codeshield import (
    pre_analyze_prompt,
    verify_generated_code,
    suggest_similar,
    auto_fix,
    index_codebase,
)

mcp = FastMCP("CodeShield")


@mcp.tool()
def analyze_prompt(
    prompt: str,
    language: str = "python",
) -> str:
    """
    Analiza un prompt antes de generar código.

    Detecta imports mencionados, funciones llamadas y genera warnings
    sobre intenciones ambiguas o sospechosas.

    Args:
        prompt: El prompt del usuario a analizar.
        language: Lenguaje intended (python, javascript, typescript).

    Returns:
        JSON con: {intended_imports, intended_functions, warnings, language}
    """
    result = pre_analyze_prompt(prompt, language)
    return json.dumps(result, indent=2)


@mcp.tool()
def verify_code(
    code: str,
    language: str = "python",
    code_base_index: str = "",
) -> str:
    """
    Verifica código generado contra el codebase real indexado.

    Detecta typos en nombres de funciones, clases, imports mal escritos,
    y funciones con número incorrecto de argumentos.

    Args:
        code: Código a verificar.
        language: Lenguaje del código.
        code_base_index: JSON string del índice del codebase (opcional).

    Returns:
        Lista de errores detectados (vacía si todo está bien).
    """
    index = None
    if code_base_index:
        try:
            index = json.loads(code_base_index)
        except json.JSONDecodeError:
            return json.dumps([{"error": "code_base_index no es JSON válido"}])

    result = verify_generated_code(code, language, index)
    return json.dumps(result, indent=2)


@mcp.tool()
def suggest_similar_name(
    name: str,
    context: str = "",
    language: str = "python",
) -> str:
    """
    Sugiere nombres válidos similares a uno mal escrito.

    Usa distancia de Levenshtein y knowledge base de typos comunes
    para sugerir correcciones precisas.

    Args:
        name: Nombre mal escrito.
        context: Contexto opcional (módulo, clase, etc.).
        language: Lenguaje (python, javascript, typescript).

    Returns:
        Lista de sugerencias ordenadas por similitud.
    """
    result = suggest_similar(name, context, language)
    return json.dumps(result, indent=2)


@mcp.tool()
def fix_code(
    code: str,
    error: str = "",
    language: str = "python",
) -> str:
    """
    Corrige automáticamente errores detectables en el código.

    Aplica patrones de fix para typos comunes como:
    - .count_items() -> .count()
    - .sumArray() -> .sum()
    - .appendItem() -> .append()
    - data_frame -> DataFrame
    - joinp -> join
    - DatetimeTZ -> datetime

    Args:
        code: Código con errores.
        error: Mensaje de error original (opcional, para logging).
        language: Lenguaje del código.

    Returns:
        Código corregido (o original si no hay match).
    """
    return auto_fix(code, error, language)


@mcp.tool()
def index_project(
    directory: str,
    languages: str = "python",
    exclude: str = "node_modules,venv,.git,__pycache__,.venv",
    reindex: bool = False,
) -> str:
    """
    Indexa el codebase del proyecto para referencias precisas.

    Extrae clases, funciones, métodos e imports del código fuente
    para que verify_generated_code pueda comparar contra el codebase real.

    Args:
        directory: Ruta al directorio del proyecto.
        languages: Lenguajes a indexar, separados por coma (python,javascript).
        exclude: Directorios a excluir, separados por coma.
        reindex: Forzar reindexación ignorando cache.

    Returns:
        JSON con: {classes, functions, methods, imports}
    """
    langs = [l.strip() for l in languages.split(",") if l.strip()]
    excl = [e.strip() for e in exclude.split(",") if e.strip()] if exclude else None

    result = index_codebase(directory, languages=langs, exclude=excl, reindex=reindex)
    return json.dumps(result, indent=2)


if __name__ == "__main__":
    mcp.run(transport="stdio")
