# CodeShield MCP - Quick Start

## Installation

```bash
# Clone repository
git clone https://github.com/yourusername/codeshield-mcp.git
cd codeshield-mcp

# Create virtual environment (recommended)
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\Scripts\activate  # Windows

# Install dependencies
pip install --upgrade mcp
pip install -r requirements.txt
```

## Configuration

```bash
# Copy config template
cp config/codeshield.template.yaml .codeshield/codeshield.yaml

# Edit configuration
code .codeshield/codeshield.yaml
```

## Run Tests

```bash
# All tests
pytest tests/ -v

# Unit tests only
pytest tests/unit/ -v

# With coverage
pytest tests/ --cov=src/codeshield --cov-report=html
```

## Development

```bash
# Activate virtual environment
source venv/bin/activate

# Run with MCP (local development)
python -m src/codeshield.server

# Run tests
pytest tests/unit/ -v
```

## Available Tools

| Tool | Description |
|------|-------------|
| `pre_analyze_prompt` | Analiza prompt antes de generar código |
| `verify_generated_code` | Verifica código generado |
| `suggest_similar` | Sugiere correcciones |
| `auto_fix` | Corrige automáticamente |
| `index_codebase` | Indexa el codebase |

## Next Steps

1. Read `SPEC.md` for full specification
2. Check `CLAUDE.md` for development guidelines
3. Review `config/codeshield.template.yaml` for configuration options