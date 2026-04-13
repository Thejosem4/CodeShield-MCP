# Implementation Plan: Ollama Testing Agent for CodeShield-MCP

## Overview

Add an AI-powered testing agent that uses local Ollama (qwen2.5-coder:7b) to run comprehensive tests on the MCP server, detecting security issues, functional bugs, and malfunctions. The agent will analyze test results and provide actionable feedback.

## Requirements

- Local Ollama installation with qwen2.5-coder:7b model
- Windows PowerShell environment
- Integration with existing CodeShield-MCP v0.6.3 architecture
- No external API dependencies (fully local)
- Security-first approach (no code execution without sandbox)

## Architecture

### New Files

| File | Purpose |
|------|---------|
| `src/src/testing/ollama-agent.ts` | Core Ollama client and agent logic |
| `src/src/testing/test-runner.ts` | Test execution and result parsing |
| `src/src/testing/security-analyzer.ts` | Security-specific analysis |
| `src/src/testing/index.ts` | Public API exports |
| `src/tests/ollama-agent.test.ts` | Unit tests |

### Modified Files

| File | Changes |
|------|---------|
| `src/src/server.ts` | Register new MCP tools |
| `src/src/cli.ts` | Add `test` command |

## Core Features

### 1. Ollama Connection Management
- Health check: Verify Ollama is running and model is available
- Connection pooling: Single connection with keep-alive
- Timeout handling: Configurable request timeouts (default 60s)
- Error recovery: Automatic retry with exponential backoff

### 2. Test Categories

| Category | Checks | Example Issues |
|----------|--------|----------------|
| **Security** | Injection vectors, hardcoded secrets, unsafe patterns | SQL injection, XSS, exposed API keys |
| **Functional** | Import validity, API existence, type consistency | Non-existent functions, wrong signatures |
| **Malfunctions** | Error handling, edge cases, null checks | Uncaught exceptions, missing null checks |
| **Code Quality** | Style issues, complexity, duplication | Overly complex functions, code smells |

### 3. Security Considerations
- Code input limit: 500KB max (prevent DoS)
- Path traversal prevention
- Timeout enforcement
- Prompt injection prevention (sandboxed prompts)
- No code execution - read-only analysis

## API Design

### MCP Tools

#### `check_ollama_status`
Verifies Ollama connectivity and model availability.

```typescript
// Output
{
  available: boolean,
  model_loaded: boolean,
  model_name: string,
  ollama_version?: string,
  error?: string
}
```

#### `run_ollama_tests`
Runs Ollama-powered tests on provided code.

```typescript
// Input schema
{
  code?: string,           // Code to test
  file?: string,           // File path to test
  project_dir?: string,    // Project directory for full scan
  categories?: string[],   // ["security", "functional", "malfunctions"]
  auto_fix?: boolean,      // Attempt auto-fix for fixable issues
  model?: string,          // Ollama model (default: qwen2.5-coder:7b)
  timeout?: number         // Timeout in seconds (default: 60)
}

// Output
{
  results: [
    {
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO",
      category: "security" | "functional" | "malfunction" | "quality",
      description: string,
      location: { file: string, line: number },
      suggestion?: string,
      confidence: number  // 0.0 - 1.0
    }
  ],
  summary: {
    total: number,
    critical: number,
    high: number,
    medium: number,
    low: number,
    auto_fixed: number
  },
  ollama_model: string,
  elapsed_ms: number
}
```

### CLI Commands

```bash
# Check Ollama status
codeshield test --status

# Run tests on a file
codeshield test ./src/index.ts --category security,functional

# Run tests on entire project
codeshield test --project . --auto-fix

# Quick security scan
codeshield test ./src/server.ts --category security
```

## Implementation Phases

### Phase 1: Foundation
1. Create Ollama client (`src/src/testing/ollama-agent.ts`)
2. Create test runner (`src/src/testing/test-runner.ts`)
3. Create public API (`src/src/testing/index.ts`)
4. Add `check_ollama_status` tool to server.ts

### Phase 2: Core Analysis
1. Implement security analyzer (`src/src/testing/security-analyzer.ts`)
2. Pre-scan patterns for critical issues
3. Add `run_ollama_tests` MCP tool
4. Add CLI `test` command

### Phase 3: CLI Integration
1. CLI flags support
2. Output formatting (colorized, JSON)
3. Error handling with clear messages

### Phase 4: Testing
1. Unit tests for Ollama client
2. Response parsing tests
3. Security pattern detection tests

## Success Criteria

- [ ] `codeshield test --status` correctly reports Ollama availability
- [ ] `codeshield test <file>` returns security/functional issues
- [ ] MCP tool `run_ollama_tests` works via Claude Code
- [ ] Auto-fix suggestions work for common issues
- [ ] 500KB code limit enforced
- [ ] Path traversal prevented in file mode
- [ ] All new code has unit tests
- [ ] No external API dependencies (fully local)

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Ollama API changes | Low | Medium | Version check, graceful errors |
| Prompt injection | Low | Critical | Input sanitization, sandboxed prompts |
| DoS via large code | Medium | Medium | 500KB limit, timeout enforcement |
| Model hallucinations | Medium | Low | Confidence scoring, pattern pre-scan |
| Ollama not installed | Medium | Low | Clear error message with setup instructions |
