# Detection module - Core engine para detectar alucinaciones
# Exports all detection engines

from .imports import (
    detect_all_issues as detect_import_issues,
    extract_imports,
    suggest_similar_function,
    levenshtein_distance,
    is_stdlib_module,
    check_import_exists,
    detect_import_issues as check_imports,
    detect_function_typos as detect_function_issues,
    detect_syntax_errors,
    STDLIB_MODULES,
    STDLIB_FUNCTIONS,
)

from .functions import (
    detect_all_function_issues,
    extract_function_calls,
    detect_function_typos,
    detect_undefined_functions,
    detect_wrong_arguments,
)

from .classes import (
    detect_all_class_issues,
    extract_class_definitions,
    extract_class_instantiations,
    detect_class_typos,
    detect_undefined_classes,
)

__all__ = [
    # Imports engine
    "detect_import_issues",
    "extract_imports",
    "suggest_similar_function",
    "levenshtein_distance",
    "is_stdlib_module",
    "check_import_exists",
    "check_imports",
    # Functions engine
    "detect_all_function_issues",
    "extract_function_calls",
    "detect_function_issues",
    "detect_function_typos",
    "detect_undefined_functions",
    "detect_wrong_arguments",
    # Classes engine
    "detect_all_class_issues",
    "extract_class_definitions",
    "extract_class_instantiations",
    "detect_class_typos",
    "detect_undefined_classes",
]