"""
Detection engine para imports inexistentes o con typos.
Analiza código Python para detectar referencias inválidas.
"""
import ast
import re
from typing import List, Dict, Optional, Set


# Stdlib modules conocidas - usadas para detectar typos en imports
STDLIB_MODULES: Set[str] = {
    # Core builtins
    "os", "sys", "re", "json", "xml", "html", "math", "cmath",
    "collections", "itertools", "functools", "operator",
    "pathlib", "datetime", "time", "calendar", "uuid",
    "random", "statistics", "base64", "binascii",
    "hashlib", "hmac", "secrets", "ssl", "socket",
    "urllib", "http", "ftplib", "smtplib", "email",
    "io", "buffer", "bytearray", "bytes", "str", "int", "float", "bool",
    # Data
    "csv", "configparser", "logging", "getpass", "curses",
    "termios", "tty", "pty", "fcntl", "select",
    # Archive
    "zipfile", "tarfile", "gzip", "bz2", "lzma", "zipimport",
    # Import/export
    "pickle", "shelve", "marshal", "struct",
    # Ejecutable
    "runpy", "code", "codeop", "dis", "inspect", "traceback",
    # Debug
    "pdb", "sysconfig", "types", "warnings", "linecache",
    # Platform
    "platform", "errno", "ctypes", "signal", "mmap", "asyncio",
    # Concurrent
    "threading", "multiprocessing", "concurrent", "queue",
    # CLI
    "argparse", "optparse", "getopt", "tempfile", "shutil", "glob",
    "fnmatch", "glob", "glob",
    # Files
    "os.path", "stat", "fileinput", "pathlib", "contextlib",
    # Encoding
    "codecs", "locale", "charset", "unicodedata",
}

# Funciones comunes de stdlib para detectar typos
STDLIB_FUNCTIONS: Dict[str, Set[str]] = {
    "os": {"listdir", "getcwd", "chdir", "mkdir", "makedirs", "remove", "unlink", "rename",
           "path.exists", "path.join", "path.dirname", "path.basename", "path.abspath",
           "environ", "getenv", "putenv", "path", "getcwd", "getpid", "getuid",
           "devnull", "sep", "name", "linesep"},
    "sys": {"exit", "argv", "path", "modules", "version", "platform", "stdin", "stdout", "stderr",
            "getrecursionlimit", "setrecursionlimit", "getrefcount"},
    "re": {"match", "search", "sub", "findall", "finditer", "split", "compile", "escape",
           "pattern", "Pattern", "Match"},
    "json": {"dumps", "loads", "dump", "load", "JSONDecoder", "JSONEncoder"},
    "collections": {"Counter", "OrderedDict", "defaultdict", "deque", "namedtuple",
                    "ChainMap", "UserDict", "UserList", "UserString"},
    "itertools": {"count", "cycle", "repeat", "chain", "islice", "tee", "product",
                  "permutations", "combinations", "groupby"},
    "pathlib": {"Path", "PurePath", "PurePosixPath", "PureWindowsPath",
                "PosixPath", "WindowsPath"},
    "datetime": {"datetime", "date", "time", "timedelta", "timezone", "MAXYEAR", "MINYEAR"},
    "typing": {"List", "Dict", "Set", "Tuple", "Optional", "Union", "Any", "Callable",
               "TypeVar", "Generic", "Protocol", "IO", "TextIO", "BinaryIO"},
    # Common submodules that can be imported directly
    "os.path": {"exists", "join", "dirname", "basename", "abspath", "isdir", "isfile",
                "splitext", "split", "normpath"},
}


def extract_imports(code: str) -> List[Dict[str, str]]:
    """
    Extrae todos los imports de un código Python.

    Returns:
        Lista de dicts con: {name, alias, from_module, is_from}
    """
    imports = []

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.append({
                    "name": alias.name,
                    "alias": alias.asname,
                    "from_module": None,
                    "is_from": False,
                    "line": node.lineno
                })
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            for alias in node.names:
                imports.append({
                    "name": alias.name,
                    "alias": alias.asname,
                    "from_module": module,
                    "is_from": True,
                    "level": node.level,
                    "line": node.lineno
                })

    return imports


def suggest_similar_function(module: str, name: str, max_distance: int = 3) -> List[str]:
    """
    Sugiere funciones similares dado un módulo y nombre.

    Args:
        module: Nombre del módulo (ej: "os", "pandas")
        name: Nombre de la función mal escrito

    Returns:
        Lista de nombres sugeridos ordenados por similitud
    """
    suggestions = []

    # Normalizar módulo (ej: "os.path" -> "os")
    base_module = module.split('.')[0] if '.' in module else module

    # Buscar en el módulo exacto
    if module in STDLIB_FUNCTIONS:
        known_functions = STDLIB_FUNCTIONS[module]
        for func in known_functions:
            distance = levenshtein_distance(name.lower(), func.lower())
            if distance <= max_distance:
                suggestions.append((func, distance))

    # Si el módulo es os.path, buscar también en os.path directamente
    if module in ("os.path", "path") and "os.path" in STDLIB_FUNCTIONS:
        for func in STDLIB_FUNCTIONS["os.path"]:
            distance = levenshtein_distance(name.lower(), func.lower())
            if distance <= max_distance:
                suggestions.append((func, distance))

    # Para os.path, también buscar en funciones directas de os
    if base_module == "os":
        if "os" in STDLIB_FUNCTIONS:
            for func in STDLIB_FUNCTIONS["os"]:
                distance = levenshtein_distance(name.lower(), func.lower())
                if distance <= max_distance:
                    suggestions.append((func, distance))
        # Y también en os.path
        if "os.path" in STDLIB_FUNCTIONS:
            for func in STDLIB_FUNCTIONS["os.path"]:
                distance = levenshtein_distance(name.lower(), func.lower())
                if distance <= max_distance:
                    suggestions.append((func, distance))

    # Ordenar por distancia y remover duplicados
    suggestions.sort(key=lambda x: x[1])
    seen = set()
    result = []
    for s, d in suggestions:
        if s not in seen:
            seen.add(s)
            result.append(s)
    return result


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calcula la distancia de Levenshtein entre dos strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def is_stdlib_module(module: str) -> bool:
    """Verifica si un módulo es parte de la stdlib."""
    return module.split('.')[0] in STDLIB_MODULES


def check_import_exists(import_name: str, from_module: Optional[str] = None) -> Dict[str, any]:
    """
    Verifica si un import existe.

    Args:
        import_name: Nombre del import (ej: "data_frame")
        from_module: Módulo del import (ej: "pandas" para `from pandas import data_frame`)

    Returns:
        Dict con: {exists: bool, suggestion: Optional[str], reason: str}
    """
    result = {"exists": True, "suggestion": None, "reason": ""}

    # Si no hay from_module, verificar si es un módulo válido de stdlib
    if not from_module:
        if import_name in STDLIB_MODULES:
            return result
        # No podemos verificar módulos externos sin índice
        return result

    # Normalizar el módulo (ej: "os.path" -> "os.path", "path" -> "os.path")
    normalized_module = from_module
    if from_module in ("path",) and normalized_module == "path":
        normalized_module = "os.path"

    # Primero verificar si es un submódulo conocido de os
    known_os_submodules = {"path", "error", "stat", "waitstatus", "curdir", "pardir",
                           "sep", "defpath", "devnull", "name", "linesep", "altsep"}
    if from_module == "os" and import_name in known_os_submodules:
        return result

    # Buscar en STDLIB_FUNCTIONS
    found = False
    search_modules = [normalized_module]

    # Si es os.path, también buscar en os y en os.path directamente
    if normalized_module == "os.path":
        search_modules = ["os.path", "os", "path"]

    for mod in search_modules:
        if mod in STDLIB_FUNCTIONS:
            if import_name in STDLIB_FUNCTIONS[mod]:
                found = True
                break

    if found:
        return result

    # No existe, dar sugerencia
    suggestions = suggest_similar_function(normalized_module, import_name)
    result = {
        "exists": False,
        "suggestion": suggestions[0] if suggestions else None,
        "reason": f"'{import_name}' no existe en '{from_module}'. "
                  f"¿Quisiste decir '{suggestions[0]}'?" if suggestions else f"'{import_name}' no existe en '{from_module}'"
    }

    return result


def detect_import_issues(code: str) -> List[Dict[str, any]]:
    """
    Detecta todos los issues de imports en el código.

    Returns:
        Lista de issues: {line, code_snippet, error_type, message, suggestion}
    """
    issues = []
    imports = extract_imports(code)

    for imp in imports:
        if imp["is_from"] and imp["from_module"]:
            check = check_import_exists(imp["name"], imp["from_module"])
            if not check["exists"]:
                issues.append({
                    "line": imp["line"],
                    "code_snippet": f"from {imp['from_module']} import {imp['name']}",
                    "error_type": "import_not_found",
                    "message": check["reason"],
                    "suggestion": check["suggestion"]
                })

    return issues


def detect_function_typos(code: str) -> List[Dict[str, any]]:
    """
    Detecta typos en llamadas a funciones.

    Returns:
        Lista de issues: {line, code_snippet, error_type, message, suggestion}
    """
    issues = []

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return [{
            "line": 1,
            "code_snippet": code.split('\n')[0] if code else "",
            "error_type": "syntax_error",
            "message": "Error de sintaxis en el código",
            "suggestion": None
        }]

    # Patrones comunes de typos en funciones conocidas
    known_patterns = [
        # dict methods
        (r"\.get\w+\(", {"get": "get", "keys": "keys", "values": "values", "items": "items"}),
        # list methods
        (r"\.count_items\(", "count"),
        (r"\.sumArray\(", "sum"),
        (r"\.appendItem\(", "append"),
        # string methods
        (r"\.replaceAll\(", "replace"),
        (r"\.split\w+\(", "split"),
        # numpy
        (r"\.sumArray\(", "sum"),
    ]

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Attribute):
                method_name = node.func.attr

                # Check for typos in common methods
                if method_name == "count_items":
                    issues.append({
                        "line": node.lineno,
                        "code_snippet": f".count_items()",
                        "error_type": "method_not_found",
                        "message": f"El método 'count_items()' no existe. ¿Quisiste decir 'count()'?",
                        "suggestion": "count"
                    })
                elif method_name == "sumArray":
                    issues.append({
                        "line": node.lineno,
                        "code_snippet": f".sumArray()",
                        "error_type": "method_not_found",
                        "message": f"El método 'sumArray()' no existe. ¿Quisiste decir 'sum()'?",
                        "suggestion": "sum"
                    })

    return issues


def detect_syntax_errors(code: str) -> List[Dict[str, any]]:
    """Detecta errores de sintaxis básicos en código Python."""
    issues = []

    try:
        ast.parse(code)
    except SyntaxError as e:
        issues.append({
            "line": e.lineno or 1,
            "code_snippet": code.split('\n')[(e.lineno or 1) - 1] if e.lineno else "",
            "error_type": "syntax_error",
            "message": str(e),
            "suggestion": None
        })

    return issues


def detect_all_issues(code: str, language: str = "python") -> List[Dict[str, any]]:
    """
    Detecta todos los issues de alucinación en código.

    Args:
        code: Código a analizar
        language: Lenguaje del código ('python', 'javascript', 'typescript')

    Returns:
        Lista de issues detectados
    """
    if language != "python":
        # Por ahora solo soportamos Python completamente
        # JS/TS vendrá después
        return []

    issues = []

    # 1. Detectar errores de sintaxis primero
    issues.extend(detect_syntax_errors(code))

    # 2. Detectar issues en imports
    issues.extend(detect_import_issues(code))

    # 3. Detectar typos en funciones
    issues.extend(detect_function_typos(code))

    return issues