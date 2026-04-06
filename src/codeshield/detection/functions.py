"""
Detection engine para funciones y métodos.
Detecta llamadas a funciones inexistentes o con typos.
"""
import ast
import re
from typing import List, Dict, Set
from .imports import levenshtein_distance, STDLIB_FUNCTIONS


# Known method typos for common types
COMMON_METHOD_TYPOS: Dict[str, Dict[str, List[str]]] = {
    # list methods
    "count_items": "count",
    "appendItem": "append",
    "add_item": "append",
    "insertItem": "insert",
    "removeItem": "remove",
    "getfirst": "pop",  # assuming first element
    "getlast": "pop",  # assuming last element
    "size": "len",  # list.size() doesn't exist
    "length": "len",
    # dict methods
    "getkeys": "keys",
    "getvalues": "values",
    "getitems": "items",
    "haskey": "contains",  # no haskey in dict
    "containskey": "in",  # no containskey
    "setdefault": "setdefault",  # this exists!
    "updatevalues": "update",  # partial match
    # string methods
    "replaceAll": "replace",
    "splitAll": "split",
    "joinWith": "join",
    "trimAll": "strip",
    "lowerCase": "lower",
    "upperCase": "upper",
    "containsStr": "in",  # use "in" operator instead
    # numpy methods
    "sumArray": "sum",
    "meanArray": "mean",
    "maxArray": "max",
    "minArray": "min",
}


def extract_function_calls(code: str) -> List[Dict[str, any]]:
    """
    Extrae todas las llamadas a funciones del código Python.

    Returns:
        Lista de dicts con: {name, lineno, is_method, obj_name}
    """
    calls = []

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            name = ""
            is_method = False
            obj_name = ""

            if isinstance(node.func, ast.Name):
                # Direct function call: foo()
                name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                # Method call: obj.method()
                is_method = True
                name = node.func.attr
                if isinstance(node.func.value, ast.Name):
                    obj_name = node.func.value.id

            calls.append({
                "name": name,
                "lineno": node.lineno,
                "is_method": is_method,
                "obj_name": obj_name,
                "args": len(node.args)
            })

    return calls


def detect_function_typos(code: str) -> List[Dict[str, any]]:
    """
    Detecta typos en llamadas a funciones.

    Returns:
        Lista de issues: {line, code_snippet, error_type, message, suggestion}
    """
    issues = []
    calls = extract_function_calls(code)

    for call in calls:
        method_name = call["name"]

        # Check against known typos
        if method_name in COMMON_METHOD_TYPOS:
            suggestion = COMMON_METHOD_TYPOS[method_name][0]
            issues.append({
                "line": call["lineno"],
                "code_snippet": f".{method_name}()",
                "error_type": "method_typo",
                "message": f"El método '{method_name}()' no existe. ¿Quisiste decir '{suggestion}()'?",
                "suggestion": suggestion
            })

    return issues


def detect_undefined_functions(code: str, known_functions: Set = None) -> List[Dict[str, any]]:
    """
    Detecta funciones llamadas que no están definidas en el codebase.

    Args:
        code: Código a analizar
        known_functions: Set de funciones conocidas (del codebase index)

    Returns:
        Lista de issues
    """
    issues = []
    calls = extract_function_calls(code)

    if known_functions is None:
        known_functions = set()

    # Built-in functions that should never be reported as undefined
    BUILTIN_FUNCTIONS = {
        "len", "str", "int", "float", "bool", "list", "dict", "set", "tuple",
        "print", "input", "open", "range", "enumerate", "zip", "map", "filter",
        "sum", "min", "max", "sorted", "reversed", "abs", "round", "pow",
        "hex", "oct", "bin", "chr", "ord", "ascii", "repr", "format",
        "isinstance", "issubclass", "hasattr", "getattr", "setattr", "delattr",
        "callable", "type", "id", "hash", "dir", "vars", "globals", "locals",
        "compile", "eval", "exec", "breakpoint", "quit", "exit", "help",
        "all", "any", "frozenset", "complex", "bytes", "bytearray", "memoryview",
    }

    for call in calls:
        func_name = call["name"]

        # Skip dunder methods
        if func_name.startswith("__") and func_name.endswith("__"):
            continue

        # Skip if it's a builtin function
        if func_name in BUILTIN_FUNCTIONS:
            continue

        # Skip if it's defined in the known functions set
        if func_name in known_functions:
            continue

        # Skip if it's a method call (obj.method()) - those are handled elsewhere
        if call["is_method"]:
            continue

        # Only now check for potential typos against stdlib
        # (being conservative - we don't want false positives for real functions)

    return issues


def detect_wrong_arguments(code: str) -> List[Dict[str, any]]:
    """
    Detecta llamadas a funciones con número incorrecto de argumentos.

    Returns:
        Lista de issues
    """
    issues = []

    # Known function signatures (function_name: (min_args, max_args, description))
    KNOWN_SIGNATURES = {
        "len": (1, 1, "len(objeto)"),
        "range": (1, 3, "range(inicio, fin, paso)"),
        "print": (0, float('inf'), "print(*objects, sep=' ', end='\\n')"),
        "open": (1, 3, "open(archivo, modo='r', encoding=None)"),
        "sum": (1, 2, "sum(iterable, inicio=0)"),
        "min": (1, float('inf'), "min(*args)"),
        "max": (1, float('inf'), "max(*args)"),
        "sorted": (1, 2, "sorted(iterable, key=None, reverse=False)"),
        "enumerate": (1, 2, "enumerate(iterable, start=0)"),
        "zip": (2, float('inf'), "zip(*iterables)"),
        "map": (2, float('inf'), "map(func, *iterables)"),
        "filter": (2, 2, "filter(func, iterable)"),
    }

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            func_name = ""
            if isinstance(node.func, ast.Name):
                func_name = node.func.id
            elif isinstance(node.func, ast.Attribute):
                continue  # Skip methods for now

            if func_name in KNOWN_SIGNATURES:
                min_args, max_args, desc = KNOWN_SIGNATURES[func_name]
                actual_args = len(node.args)

                if actual_args < min_args:
                    issues.append({
                        "line": node.lineno,
                        "code_snippet": f"{func_name}(...)",
                        "error_type": "missing_arguments",
                        "message": f"{func_name}() requiere al menos {min_args} argumento(s). Usaste {actual_args}. Firma: {desc}",
                        "suggestion": None
                    })
                elif actual_args > max_args:
                    issues.append({
                        "line": node.lineno,
                        "code_snippet": f"{func_name}(...)",
                        "error_type": "too_many_arguments",
                        "message": f"{func_name}() acepta máximo {max_args} argumento(s). Usaste {actual_args}. Firma: {desc}",
                        "suggestion": None
                    })

    return issues


def detect_all_function_issues(code: str, known_functions: Set = None) -> List[Dict[str, any]]:
    """
    Detecta todos los issues relacionados con funciones.

    Args:
        code: Código a analizar
        known_functions: Set opcional de funciones conocidas del codebase

    Returns:
        Lista de todos los issues encontrados
    """
    issues = []

    # 1. Typos en métodos (count_items -> count)
    issues.extend(detect_function_typos(code))

    # 2. Funciones indefinidas
    if known_functions is None:
        known_functions = set()
    issues.extend(detect_undefined_functions(code, known_functions))

    # 3. Argumentos incorrectos
    issues.extend(detect_wrong_arguments(code))

    return issues