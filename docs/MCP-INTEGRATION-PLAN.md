# CodeShield MCP Integration Plan - Claude Code Workflow

## Overview

Integrate CodeShield MCP with Claude Code (and other MCP clients) to provide real-time, inline code verification that catches errors BEFORE they cause problems. Uses LOCAL pattern matching for speed (0 tokens).

**Two distinct use cases:**
1. **End-user workflow** (Claude Code, Gemini CLI, etc.) — Fast local verification with inline suggestions
2. **Internal development** (CodeShield team) — Deep analysis with Ollama agents

---

## Architecture

### End-User Integration (Claude Code)

```
┌─────────────────────────────────────────────────────┐
│ Claude Code / Gemini CLI / Open Code                 │
│                                                     │
│   Developer writes code                              │
│         │                                            │
│         ▼                                            │
│   ┌─────────────────────────────────────────┐       │
│   │ CodeShield MCP Client                    │       │
│   │                                         │       │
│   │ • verify_code(code) → issues[]          │       │
│   │ • suggest_fix(issue) → fix              │       │
│   │ • check_imports(code) → missing[]      │       │
│   │ • detect_hallucinations(code) → []    │       │
│   └─────────────────────────────────────────┘       │
│         │                                            │
│         ▼                                            │
│   ┌─────────────────────────────────────────┐       │
│   │ CodeShield MCP Server (LOCAL)           │       │
│   │                                         │       │
│   │ • Pattern matching (0 tokens)           │       │
│   │ • Syntax validation                     │       │
│   │ • Import verification                   │       │
│   │ • Levenshtein distance for typos       │       │
│   └─────────────────────────────────────────┘       │
│         │                                            │
│         ▼                                            │
│   INLINE NOTIFICATION TO DEVELOPER                   │
│   "⚠️ Line 15: Missing semicolon"                  │
│   "💡 Fix: ;"                                       │
└─────────────────────────────────────────────────────┘
```

### Internal Development (CodeShield Team)

```
┌─────────────────────────────────────────────────────┐
│ CodeShield Development                              │
│                                                     │
│   codeshield-test.ps1                               │
│         │                                            │
│         ▼                                            │
│   ┌─────────────────────────────────────────┐       │
│   │ Multi-Model Agent (Ollama)               │       │
│   │                                         │       │
│   │ TIER 1: qwen2.5-coder:7b (quick)      │       │
│   │ TIER 2: deepseek-r1:7b (reasoning)      │       │
│   │ TIER 3: ministral-3:8b (deep)          │       │
│   └─────────────────────────────────────────┘       │
│         │                                            │
│         ▼                                            │
│   Deep Analysis Reports (JSON/HTML)                  │
└─────────────────────────────────────────────────────┘
```

---

## MCP Tools for End Users

### Tool 1: `verify_code`

Verifies code for syntax errors, typos, and hallucinations. FAST and LOCAL.

```typescript
// Input
{
  code: string,        // Code to verify (max 100KB)
  language: string,     // "python", "javascript", "typescript", etc.
  check_level: "fast" | "standard" | "thorough"
}

// Output
{
  issues: [
    {
      type: "syntax" | "typo" | "import" | "function" | "logic",
      severity: "critical" | "warning" | "info",
      line: number,
      column?: number,
      message: string,          // Human-readable message
      suggestion: string,        // Exact fix to apply
      confidence: number,       // 0.0 - 1.0
    }
  ],
  stats: {
    lines_checked: number,
    issues_found: number,
    verification_time_ms: number
  }
}
```

### Tool 2: `suggest_fix`

Given an issue, returns the exact fix.

```typescript
// Input
{
  code: string,
  issue: {
    type: string,
    line: number,
    column?: number,
    message: string
  },
  language: string
}

// Output
{
  original: string,     // Original line
  fixed: string,       // Fixed line
  diff: string,         // Unified diff
  explanation: string  // Why this fix is correct
}
```

### Tool 3: `check_imports`

Verifies that all imports exist in the project.

```typescript
// Input
{
  code: string,
  project_path: string,    // For relative imports
  language: string
}

// Output
{
  valid_imports: [
    { path: string, exists: true, location: string }
  ],
  invalid_imports: [
    { path: string, exists: false, suggestion?: string }
  ],
  potential_hallucinations: [
    { import: string, similar_existing: string[], line: number }
  ]
}
```

### Tool 4: `quick_fix`

Apply fixes automatically for common issues.

```typescript
// Input
{
  code: string,
  language: string,
  auto_apply: string[]   // List of fix IDs to apply
}

// Output
{
  original_code: string,
  fixed_code: string,
  applied_fixes: string[],
  skipped_fixes: string[]  // Fixes that couldn't be applied
}
```

---

## Implementation Tasks

### Phase 1: Core Verification Engine

- [ ] Create `src/src/verification/syntax-validator.ts`
  - Parse code into AST (using `@babel/parser` for JS/TS, `pygments` for Python)
  - Detect syntax errors with exact line/column
  - Generate precise error messages

- [ ] Create `src/src/verification/import-checker.ts`
  - Extract imports from code
  - Verify against project filesystem
  - Suggest similar existing imports for typos

- [ ] Create `src/src/verification/typo-detector.ts`
  - Use Levenshtein distance (already exists in detection/)
  - Compare identifiers against project symbols
  - Generate auto-fix suggestions

### Phase 2: MCP Tool Registration

- [ ] Register `verify_code` tool in `server.ts`
- [ ] Register `suggest_fix` tool in `server.ts`
- [ ] Register `check_imports` tool in `server.ts`
- [ ] Register `quick_fix` tool in `server.ts`

### Phase 3: Claude Code Integration

- [ ] Document MCP connection in README
- [ ] Create `.claudecodeshield` config example
- [ ] Test with Claude Code end-to-end

### Phase 4: Internal Ollama Pipeline (Development Only)

- [ ] Complete `multi-model-agent.ts` integration
- [ ] Create `codeshield-test.ps1` with new multi-model support
- [ ] Test deep analysis workflow

---

## Inline Notification Format

When CodeShield detects an issue, it should format notifications like:

```
┌──────────────────────────────────────────────────┐
│ CodeShield • verify_code                          │
├──────────────────────────────────────────────────┤
│ ⚠️ syntax error                                  │
│    src/index.ts:15:10                           │
│                                                  │
│    Expected ';' after expression                │
│                                                  │
│ 💡 Suggestion:                                   │
│    Add ';' at position 15                       │
│                                                  │
│    [Apply Fix]  [Ignore]  [Explain]            │
└──────────────────────────────────────────────────┘
```

For hallucinations (functions/imports that don't exist):

```
┌──────────────────────────────────────────────────┐
│ CodeShield • verify_code                          │
├──────────────────────────────────────────────────┤
│ ⚠️ potential hallucination                       │
│    src/utils.ts:8:1                             │
│                                                  │
│    Function 'getUserData' not found in project  │
│                                                  │
│ 💡 Similar functions found:                       │
│    • getUser (src/auth.ts:42)                  │
│    • fetchUserData (src/api.ts:15)              │
│                                                  │
│    [Use getUser]  [Ignore]  [View All]         │
└──────────────────────────────────────────────────┘
```

---

## Performance Targets

| Operation | Target Time | Method |
|-----------|-------------|--------|
| verify_code (100 lines) | < 50ms | Local pattern matching |
| verify_code (1000 lines) | < 200ms | Local pattern matching |
| suggest_fix | < 20ms | Pre-computed suggestions |
| check_imports | < 100ms | Filesystem lookup |

---

## Example Claude Code Session with CodeShield

```
> user: Create a function that validates email addresses

> claude: I'll create an email validation function for you.

```typescript
export function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/

  return regex.test(email)
}
```

> CodeShield (background):
>   ✓ Code verified - no issues found

---

> user: Now add a function to get user by ID from the database

> claude:

```typescript
export async function getUserById(id: string) {
  const result = await db.query('SELECT * FROM users WHERE id = ?', id)
  return result.rows[0]
}
```

> CodeShield (inline notification):
> ⚠️ potential hallucination
>    db.query not found in project
>
>    Similar modules found:
>    • database.query (src/database.ts:12)
>    • db.get (src/db-connection.ts:8)
>
>    [Use database.query]  [Ignore]  [View All]

> claude: I'll use the existing database module:

```typescript
import { database } from '../database'

export async function getUserById(id: string) {
  const result = await database.query('SELECT * FROM users WHERE id = ?', id)
  return result.rows[0]
}
```

> CodeShield:
>   ✓ Code verified
```

---

## Success Metrics

- [ ] 90% of syntax errors caught before code execution
- [ ] < 100ms average verification time
- [ ] < 10% false positive rate
- [ ] Claude Code session demonstrates value (user applies suggestions)

---

## Files to Create/Modify

### New Files

```
src/src/verification/
├── index.ts              # Public API
├── syntax-validator.ts    # AST-based syntax checking
├── import-checker.ts      # Import verification
├── typo-detector.ts       # Typo detection with Levenshtein
└── fix-engine.ts         # Apply automatic fixes

src/src/mcp/
└── tools.ts              # MCP tool definitions
```

### Modified Files

```
src/src/server.ts         # Register new verification tools
src/src/cli.ts           # Add verify command
src/src/detection/       # Reuse existing patterns
```

---

## Testing Strategy

1. **Unit tests** for each verification module
2. **Integration tests** with mock Claude Code sessions
3. **E2E tests** with actual Claude Code (manual verification)
4. **Benchmark tests** to ensure < 100ms verification time
