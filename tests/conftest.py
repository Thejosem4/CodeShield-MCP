"""
Pytest configuration y fixtures compartidos
"""
import pytest
import sys
from pathlib import Path

# Add src to path para imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))


@pytest.fixture
def sample_python_code():
    """Código Python válido de ejemplo"""
    return """
import os
from typing import List, Optional
import pandas as pd

def process_data(items: List[int]) -> Optional[int]:
    '''Procesa una lista de items y retorna la suma.'''
    if not items:
        return None
    return sum(items)

class DataProcessor:
    def __init__(self, name: str):
        self.name = name
        self.data = []

    def add(self, item: int):
        self.data.append(item)

    def get_sum(self) -> int:
        return sum(self.data)
"""


@pytest.fixture
def sample_javascript_code():
    """Código JavaScript válido de ejemplo"""
    return """
const fs = require('fs');
const path = require('path');

class FileProcessor {
    constructor(directory) {
        this.directory = directory;
        this.files = [];
    }

    async scan() {
        const entries = await fs.promises.readdir(this.directory);
        this.files = entries.filter(f => !f.startsWith('.'));
        return this.files;
    }

    getCount() {
        return this.files.length;
    }
}

module.exports = { FileProcessor };
"""


@pytest.fixture
def sample_typescript_code():
    """Código TypeScript válido de ejemplo"""
    return """
interface User {
    id: number;
    name: string;
    email: string;
    active: boolean;
}

class UserService {
    private users: User[] = [];

    async getAll(): Promise<User[]> {
        return this.users;
    }

    async getById(id: number): Promise<User | undefined> {
        return this.users.find(u => u.id === id);
    }

    async create(data: Omit<User, 'id'>): Promise<User> {
        const user: User = { id: Date.now(), ...data };
        this.users.push(user);
        return user;
    }
}

export { User, UserService };
"""


@pytest.fixture
def code_with_import_errors():
    """Código con errores de import intencionales"""
    return """
import pandas as pd
from pandas import data_frame  # ERROR: no existe
from nonexistent_library import missing_func  # ERROR: no existe

import numpy as np
arr = np.sumArray([1, 2, 3])  # ERROR: sumArray no existe
"""


@pytest.fixture
def code_base_index_sample():
    """Índice de codebase de ejemplo"""
    return {
        "classes": ["User", "Product", "Order", "DataProcessor"],
        "functions": ["validate_email", "process_order", "calculate_total"],
        "methods": {
            "User": ["get_id", "get_name", "set_active"],
            "Product": ["get_price", "set_price"],
            "DataProcessor": ["process", "reset"]
        },
        "imports": ["django", "rest_framework", "myapp.models"]
    }


@pytest.fixture
def temp_project_dir(tmp_path):
    """Directorio temporal simulando un proyecto real"""
    (tmp_path / "src").mkdir()
    (tmp_path / "tests").mkdir()
    (tmp_path / "models.py").write_text("""
from django.db import models

class Product(models.Model):
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
""")
    (tmp_path / "views.py").write_text("""
from django.http import JsonResponse

def index(request):
    return JsonResponse({'status': 'ok'})
""")
    (tmp_path / "requirements.txt").write_text("django>=4.0\ndjangorestframework>=3.14")
    return tmp_path