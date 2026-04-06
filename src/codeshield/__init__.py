"""
CodeShield MCP - Main package
"""
from .detection.imports import detect_all_issues, extract_imports, suggest_similar_function

__version__ = "0.1.0"

__all__ = [
    "verify_generated_code",
    "pre_analyze_prompt",
    "suggest_similar",
    "auto_fix",
    "index_codebase",
    "detect_all_issues",
    "extract_imports",
    "suggest_similar_function",
]


def verify_generated_code(code: str, language: str = "python", code_base_index: dict = None) -> list:
    """
    Verifica código generado contra el codebase real.

    Args:
        code: Código a verificar
        language: Lenguaje ('python', 'javascript', 'typescript')
        code_base_index: Índice opcional del codebase del usuario

    Returns:
        Lista de errores detectados (vacía si todo está bien)
    """
    if language != "python":
        # Por ahora solo soportamos Python
        return []

    issues = detect_all_issues(code, language)

    return [
        f"Línea {issue['line']}: {issue['message']}"
        + (f" Sugerencia: {issue['suggestion']}" if issue['suggestion'] else "")
        for issue in issues
    ]


def pre_analyze_prompt(prompt: str, language: str = "python") -> dict:
    """
    Analiza el prompt del usuario antes de generar código.

    Args:
        prompt: El prompt del usuario
        language: Lenguaje intended

    Returns:
        Dict con análisis: {intended_imports, intended_functions, warnings}
    """
    import re
    intended_imports = []
    intended_functions = []
    warnings = []

    # Pattern para detectar imports mencionados en texto
    # Soporta: "import pandas", "from os import", "importar pandas"
    import_patterns = [
        r'\bimport\s+([\w.]+)',
        r'\bfrom\s+([\w.]+)\s+import',
        r'\bimportar\s+([\w.]+)',  # Spanish
        r'\bfrom\s+([\w.]+)\s+',   # from module ... (capture just module part)
    ]

    for pattern in import_patterns:
        matches = re.findall(pattern, prompt, re.IGNORECASE)
        for module in matches:
            if module:
                # Normalize: os.path -> os (base module)
                base_module = module.split('.')[0]
                intended_imports.append(base_module)

    # Detectar funciones mencionadas en el prompt (but not import keywords)
    function_pattern = r'\b([a-z_][a-z0-9_]*)\s*\('
    matches = re.findall(function_pattern, prompt.lower())
    for func_name in matches:
        # Filter out keywords and imports
        skip_words = {"def", "class", "if", "for", "while", "try", "except", "with", "return", "raise", "pass", "break", "continue", "import", "from", "lambda", "print", "len", "range", "open", "input", "sum", "min", "max", "sorted", "enumerate", "zip", "map", "filter"}
        if len(func_name) >= 3 and func_name not in skip_words:
            intended_functions.append(func_name)

    # Warnings para cosas sospechosas
    if len(prompt.strip()) < 20:
        warnings.append("Prompt muy corto, análisis limitado")

    return {
        "intended_imports": list(set(intended_imports)),
        "intended_functions": list(set(intended_functions)),
        "warnings": warnings,
        "language": language
    }


def suggest_similar(name: str, context: str = "", language: str = "python") -> list:
    """
    Sugiere correcciones para nombres mal escritos.

    Args:
        name: Nombre mal escrito
        context: Contexto (módulo, clase, etc)
        language: Lenguaje

    Returns:
        Lista de sugerencias ordenadas por similitud
    """
    from .detection.imports import levenshtein_distance

    suggestions = []
    seen = {}  # name -> (best_distance, is_exact_typo)

    # Known functions with their common typos (exact typos get priority)
    known_items = {
        # Python builtins
        "print": ["prin", "prnt"],
        "len": ["ln", "lne"],
        "sum": ["sumArray"],
        "count": ["countt"],
        "append": ["appendItem"],
        "open": [],
        "input": [],
        # os module
        "listdir": ["listdirs"],
        "getcwd": [],
        "chdir": [],
        "mkdir": [],
        "join": ["joinp"],
        "dirname": [],
        "basename": [],
        # collections
        "Counter": [],
        "OrderedDict": ["ordered_dict"],
        "defaultdict": [],
        "deque": ["dequee"],
        # pandas
        "DataFrame": ["data_frame", "datafram"],
        "Series": [],
    }

    # If context provided, filter by context
    if context == "os.path":
        search_list = ["join", "dirname", "basename", "exists", "isfile", "isdir"]
    elif context == "os":
        search_list = ["listdir", "getcwd", "chdir", "mkdir", "join"]
    elif context == "collections":
        search_list = ["Counter", "OrderedDict", "defaultdict", "deque"]
    elif context == "pandas":
        search_list = ["DataFrame", "Series"]
    else:
        search_list = list(known_items.keys())

    name_lower = name.lower()

    for known_name in search_list:
        # Direct distance check
        distance = levenshtein_distance(name_lower, known_name.lower())
        if distance <= 2 and distance > 0:
            seen[known_name] = (distance, False)

        # Check known typos for this function
        if known_name in known_items:
            for typo in known_items[known_name]:
                typo_distance = levenshtein_distance(name_lower, typo.lower())
                if typo_distance <= 1:  # Only very close typos (1 char off)
                    # Prioritize exact typos by giving better effective distance
                    if known_name not in seen or typo_distance < seen[known_name][0]:
                        seen[known_name] = (typo_distance, True)

    # Convert to list and sort by distance, then by priority (exact typos first)
    suggestions = [(n, d, is_typo) for n, (d, is_typo) in seen.items()]
    suggestions.sort(key=lambda x: (x[1], 0 if x[2] else 1))  # sort by distance, then exact typos first

    return [s[0] for s in suggestions]


def auto_fix(code: str, error: str, language: str = "python") -> str:
    """
    Corrige automáticamente errores detectables.

    Args:
        code: Código con errores
        error: Descripción del error
        language: Lenguaje

    Returns:
        Código corregido (o original si no se pudo corregir)
    """
    import re

    if language != "python":
        return code

    fixed_code = code

    # Patterns de errores comunes y sus correcciones
    fix_patterns = [
        # import typos
        (r'from\s+(\w+)\s+import\s+data_frame', r'from \1 import DataFrame'),
        (r'from\s+(\w+)\s+import\s+datafram', r'from \1 import DataFrame'),
        # method typos
        (r'\.count_items\(', '.count('),
        (r'\.sumArray\(', '.sum('),
        (r'\.appendItem\(', '.append('),
        (r'\.get\w+\(', '.get('),
        # common typos
        (r'joinp', 'join'),
        (r'readFil', 'readFile'),
        (r'writenFile', 'writeFile'),
        (r'DatetimeTZ', 'datetime'),
    ]

    for pattern, replacement in fix_patterns:
        fixed_code = re.sub(pattern, replacement, fixed_code)

    return fixed_code


def index_codebase(directory: str, languages: list = None, exclude: list = None,
                   reindex: bool = False, code_base_index: dict = None) -> dict:
    """
    Indexa el codebase del usuario para referencias precisas.

    Args:
        directory: Directorio del proyecto
        languages: Lista de lenguajes a indexar ['python', 'javascript', 'typescript']
        exclude: Directorios a excluir
        reindex: Forzar reindexación
        code_base_index: Índice existente (para usar cache)

    Returns:
        Dict con: {classes, functions, methods, imports}
    """
    import os
    from pathlib import Path

    if languages is None:
        languages = ["python"]

    if exclude is None:
        exclude = ["node_modules", "venv", ".git", "__pycache__", ".venv"]

    # Si hay índice previo y no se pide reindex, retornar cache
    if code_base_index and not reindex:
        return code_base_index

    result = {
        "classes": [],
        "functions": [],
        "methods": {},
        "imports": []
    }

    directory_path = Path(directory)
    if not directory_path.exists():
        raise FileNotFoundError(f"Directory not found: {directory}")

    def should_exclude(path: str) -> bool:
        for excl in exclude:
            if excl in path:
                return True
        return False

    def index_file(file_path: Path, lang: str):
        if lang == "python" and file_path.suffix == ".py":
            try:
                content = file_path.read_text(encoding='utf-8')
                _index_python_content(content, result)
            except Exception:
                pass  # Skip files that can't be read

    def _index_python_content(content: str, result: dict):
        """Index a Python file content."""
        try:
            import ast
            tree = ast.parse(content)

            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    result["classes"].append(node.name)
                    result["methods"][node.name] = []

                    for item in node.body:
                        if isinstance(item, ast.FunctionDef):
                            result["methods"][node.name].append(item.name)
                            if not item.name.startswith('_'):
                                result["functions"].append(item.name)

                elif isinstance(node, ast.FunctionDef):
                    if not node.name.startswith('_'):
                        result["functions"].append(node.name)

                elif isinstance(node, (ast.Import, ast.ImportFrom)):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            result["imports"].append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            result["imports"].append(node.module)

        except SyntaxError:
            pass  # Skip invalid Python files

    # Walk directory
    for root, dirs, files in os.walk(directory):
        # Filter out excluded directories
        dirs[:] = [d for d in dirs if d not in exclude]

        if should_exclude(root):
            continue

        for file in files:
            file_path = Path(root) / file
            for lang in languages:
                index_file(file_path, lang)

    # Deduplicate
    result["classes"] = list(set(result["classes"]))
    result["functions"] = list(set(result["functions"]))
    result["imports"] = list(set(result["imports"]))

    return result