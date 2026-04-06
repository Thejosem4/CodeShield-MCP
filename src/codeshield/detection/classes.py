"""
Detection engine para clases y sus usos.
Detecta referencias a clases inexistentes o con typos.
"""
import ast
from typing import List, Dict, Set, Optional


def extract_class_definitions(code: str) -> List[Dict[str, any]]:
    """
    Extrae todas las definiciones de clases del código.

    Returns:
        Lista de dicts con: {name, lineno, base_classes, methods}
    """
    classes = []

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef):
            methods = [n.name for n in node.body if isinstance(n, ast.FunctionDef)]
            bases = [b.attr if isinstance(b, ast.Attribute) else (b.id if isinstance(b, ast.Name) else str(b))
                     for b in node.bases]

            classes.append({
                "name": node.name,
                "lineno": node.lineno,
                "base_classes": bases,
                "methods": methods
            })

    return classes


def extract_class_instantiations(code: str) -> List[Dict[str, any]]:
    """
    Extrae todas las llamadas a clases (instantiations).

    Returns:
        Lista de dicts con: {name, lineno, args}
    """
    instantiations = []

    try:
        tree = ast.parse(code)
    except SyntaxError:
        return []

    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            # Check if this is a class instantiation (Capitalized name)
            if isinstance(node.func, ast.Name):
                name = node.func.id
                # Heuristic: class names are typically PascalCase
                if name and name[0].isupper() and len(name) > 1:
                    instantiations.append({
                        "name": name,
                        "lineno": node.lineno,
                        "args": len(node.args),
                        "keywords": [kw.arg for kw in node.keywords] if hasattr(node, 'keywords') else []
                    })
            # Also check for Constructor patterns like datetime.datetime()
            elif isinstance(node.func, ast.Attribute):
                if isinstance(node.func.value, ast.Name):
                    # Might be Module.Class pattern
                    pass

    return instantiations


def detect_class_typos(code: str) -> List[Dict[str, any]]:
    """
    Detecta typos en nombres de clases.

    Returns:
        Lista de issues
    """
    issues = []

    # Known class names and common typos
    # Format: {correct_name: [typo1, typo2, ...]}
    KNOWN_CLASS_TYPOS = {
        "DataFrame": ["datafram", "data_frame", "Dataframe", "Datafram"],
        "datetime": ["DatetimeTZ", "Datetime", "DateTime"],
        "Counter": ["Counterr", "Count", "Counterrr"],
        "OrderedDict": ["OrderedDictt", "Ordereddictionary", "OrderedDictt"],
        "deque": ["dequee", "dequeue"],
        "defaultdict": ["defaultdictt", "DefaultDict"],
    }

    # Classes that exist and should NOT be flagged
    KNOWN_VALID_CLASSES = {
        "DataFrame", "Series", "datetime", "date", "time", "timedelta",
        "Counter", "OrderedDict", "defaultdict", "deque", "namedtuple",
        "int", "str", "float", "bool", "list", "dict", "set", "tuple",
        "object", "type", "Exception", "TypeError", "ValueError", "KeyError",
    }

    instantiations = extract_class_instantiations(code)

    for inst in instantiations:
        class_name = inst["name"]

        # Skip if it's a known valid class
        if class_name in KNOWN_VALID_CLASSES:
            continue

        # Check against known typos (case-insensitive)
        class_name_lower = class_name.lower()
        for correct_name, typos in KNOWN_CLASS_TYPOS.items():
            if class_name_lower in [t.lower() for t in typos]:
                issues.append({
                    "line": inst["lineno"],
                    "code_snippet": f"{class_name}(...)",
                    "error_type": "class_typo",
                    "message": f"La clase '{class_name}' no existe. ¿Quisiste decir '{correct_name}'?",
                    "suggestion": correct_name
                })
                break

    return issues


def detect_undefined_classes(code: str, known_classes: Set = None) -> List[Dict[str, any]]:
    """
    Detecta clases instanciadas que no están definidas.

    Args:
        code: Código a analizar
        known_classes: Set de clases conocidas (del codebase)

    Returns:
        Lista de issues
    """
    if known_classes is None:
        known_classes = set()

    issues = []

    if known_classes is None:
        known_classes = set()

    # First, get all classes defined in this code
    defined_in_code = set(c["name"] for c in extract_class_definitions(code))

    # Now check instantiations
    instantiations = extract_class_instantiations(code)

    for inst in instantiations:
        class_name = inst["name"]

        # Skip if defined in this code
        if class_name in defined_in_code:
            continue

        # Skip if it's a known builtin
        if class_name in {"int", "str", "float", "bool", "list", "dict", "set", "tuple", "object"}:
            continue

        # Skip if it's a known stdlib class
        KNOWN_STDLIB = {
            "Exception", "TypeError", "ValueError", "KeyError", "IndexError",
            "RuntimeError", "ImportError", "StopIteration", "GeneratorExit",
            "BaseException", "SystemExit", "KeyboardInterrupt", "MemoryError",
            "AssertionError", "AttributeError", "EOFError", "NameError",
            "OSError", "ReferenceError", "NotImplementedError", "IndentationError",
            "TabError", "SyntaxError", "SystemError", "UnboundLocalError",
            "UnicodeError", "UnicodeDecodeError", "UnicodeEncodeError", "UnicodeTranslateError",
            "Warning", "DeprecationWarning", "PendingDeprecationWarning", "RuntimeWarning",
            "FutureWarning", "ImportWarning", "FloatingPointError", "ZeroDivisionError",
        }

        if class_name in KNOWN_STDLIB:
            continue

        # Check if it's in user's known_classes (from index)
        if class_name in known_classes:
            continue

        # If we can't verify it, don't report as error (could be external library)
        # Only report if it's clearly a typo

    return issues


def detect_wrong_inheritance(code: str) -> List[Dict[str, any]]:
    """
    Detecta clases que heredan de clases inexistentes.

    Returns:
        Lista de issues
    """
    issues = []

    classes = extract_class_definitions(code)
    known_bases = {"object", "Exception", "BaseException"}  # Minimal known bases

    for cls in classes:
        for base in cls["base_classes"]:
            if base and base not in known_bases:
                # Could be undefined base class
                # For now, we just note it - actual detection would need more context
                pass

    return issues


def detect_all_class_issues(code: str, known_classes: Set = None) -> List[Dict[str, any]]:
    """
    Detecta todos los issues relacionados con clases.

    Args:
        code: Código a analizar
        known_classes: Set opcional de clases conocidas

    Returns:
        Lista de todos los issues
    """
    issues = []

    # 1. Typos en nombres de clases
    issues.extend(detect_class_typos(code))

    # 2. Clases indefinidas
    issues.extend(detect_undefined_classes(code, known_classes))

    return issues