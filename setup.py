"""
CodeShield MCP - Setup
"""
from setuptools import setup, find_packages

setup(
    name="codeshield-mcp",
    version="0.2.0",
    description="MCP server that prevents LLM hallucinations before code generation",
    long_description=open("README.md", encoding="utf-8").read(),
    long_description_content_type="text/markdown",
    author="CodeShield",
    license="MIT",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    python_requires=">=3.11",
    install_requires=[
        "mcp>=0.9.0",
        "astroid>=3.0.0",
        "PyYAML>=6.0",
        "python-dotenv>=1.0.0",
    ],
    extras_require={
        "dev": [
            "pytest>=8.0.0",
            "pytest-asyncio>=0.23.0",
            "flake8>=7.0.0",
        ],
    },
    entry_points={
        "console_scripts": [
            "codeshield=codeshield.server:mcp.run[transport=stdio]",
        ],
    },
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
        "Programming Language :: Python :: 3.13",
    ],
)
