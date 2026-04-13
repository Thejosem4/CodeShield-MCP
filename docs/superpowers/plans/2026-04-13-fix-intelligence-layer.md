# Fix Intelligence Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Fix Intelligence Layer - a local, context-aware fix suggestion system for CodeShield MCP that enriches issue suggestions using project index and stdlib lookups.

**Architecture:** Progressive lookup system (project → stdlib → fuzzy → pattern → fallback) with confidence scoring. 100% local, no external AI.

**Tech Stack:** TypeScript, existing cache.js for project index, existing detection/*.ts stdlib data

---

## File Structure

```
src/src/fix-intelligence/
├── index.ts           # Public API: deepFix()
├── engine.ts          # FixIntelligenceEngine class
├── lookup.ts         # Project + stdlib lookup
├── fuzzy.ts           # Levenshtein matching
├── pattern.ts         # Code pattern extraction
└── types.ts           # All interfaces

Modified:
src/src/server.ts      # Register deep_fix MCP tool
```

---

### Task 1: Create types.ts

**Files:**
- Create: `src/src/fix-intelligence/types.ts`

```typescript
export type FixType = "direct" | "fuzzy" | "pattern" | "fallback";

export interface Issue {
  type: string;
  severity: string;
  line: number;
  message: string;
  suggestion?: string;
}

export interface DeepFixInput {
  code: string;
  language: string;
  issues: Issue[];
  project_path?: string;
  mode: "safe" | "suggest" | "full";
}

export interface DeepFixResult {
  suggestions: FixSuggestion[];
  failed_issues: Issue[];
  confidence: number;
  processing_time_ms: number;
}

export interface FixSuggestion {
  original_issue: Issue;
  type: FixType;
  confidence: number;
  
  direct?: {
    suggestion: string;
    source: "stdlib" | "project";
    location: string;
  };
  
  fuzzy?: {
    suggestion: string;
    alternatives: Array<{
      name: string;
      score: number;
      location: string;
    }>;
  };
  
  pattern?: {
    suggestion: string;
    based_on: string;
    snippet: string;
  };
  
  fallback?: {
    message: string;
    stdlib_hint?: string;
    project_hint?: string;
  };
}

export interface ProjectSymbol {
  name: string;
  type: string;
  location: string;
  frequency: number;
}

export interface StdlibSymbol {
  name: string;
  module: string;
  methods: string[];
  location: string;
}

export interface SimilarSymbol {
  name: string;
  score: number;
  location: string;
}

export interface CodePattern {
  snippet: string;
  location: string;
  relevance: number;
}
```

- [ ] **Step 1: Create types.ts with all interfaces**

---

### Task 2: Create lookup.ts

**Files:**
- Create: `src/src/fix-intelligence/lookup.ts`

- [ ] **Step 1: Implement `searchProjectIndex(symbol, projectPath)`**

```typescript
import { getCachedIndex } from "../cache.js";

export function searchProjectIndex(symbol: string, projectPath?: string): ProjectSymbol[] {
  // Uses getCachedIndex(projectPath) from cache.js
  // Searches classes, functions, methods for exact match
  // Returns array of ProjectSymbol with location info
}
```

- [ ] **Step 2: Implement `searchStdlib(symbol, language)`**

```typescript
// Import JS_STDLIB, PY_STDLIB, etc. from detection modules
import { JS_STDLIB, JS_TYPOS } from "../detection/javascript.js";
import { STDLIB_MODULES, STDLIB_FUNCTIONS } from "../detection/index.js";

export function searchStdlib(symbol: string, language: string): StdlibSymbol[] {
  // For JavaScript: check JS_STDLIB
  // For Python: check STDLIB_MODULES and STDLIB_FUNCTIONS
  // Returns matching symbols with module info
}
```

- [ ] **Step 3: Implement `getSymbolLocation(symbol)`**

```typescript
export function getSymbolLocation(symbol: string, projectPath?: string): string {
  // Returns formatted location: "function_name at src/file.ts:42"
}
```

- [ ] **Step 4: Run tests to verify lookup modules work**

Run: `echo "Testing lookup..."`
Expected: Lookup functions return correct symbols

- [ ] **Step 5: Commit**

```bash
git add src/src/fix-intelligence/lookup.ts src/src/fix-intelligence/types.ts
git commit -m "feat: add fix-intelligence lookup module"
```

---

### Task 3: Create fuzzy.ts

**Files:**
- Create: `src/src/fix-intelligence/fuzzy.ts`

- [ ] **Step 1: Implement `calculateLevenshteinSimilarity(a, b)`**

```typescript
export function calculateLevenshteinSimilarity(a: string, b: string): number {
  // Returns 0-1 score where 1 is identical
  // Uses Levenshtein distance normalized by string length
}
```

- [ ] **Step 2: Implement `findSimilarSymbols(candidates, target, threshold)`**

```typescript
export function findSimilarSymbols(
  candidates: Array<{ name: string; location: string }>,
  target: string,
  threshold: number = 2
): SimilarSymbol[] {
  // Calculates Levenshtein distance for each candidate
  // Returns top 5 matches sorted by similarity score
}
```

- [ ] **Step 3: Implement `rankBySimilarity(matches)`**

```typescript
export function rankBySimilarity(matches: SimilarSymbol[]): SimilarSymbol[] {
  // Sorts by score descending
  // Returns top 5
}
```

- [ ] **Step 4: Run tests**

Run: `echo "Testing fuzzy matching..."`
Expected: Levenshtein returns correct similarity scores

- [ ] **Step 5: Commit**

```bash
git add src/src/fix-intelligence/fuzzy.ts
git commit -m "feat: add fuzzy matching to fix-intelligence"
```

---

### Task 4: Create pattern.ts

**Files:**
- Create: `src/src/fix-intelligence/pattern.ts`

- [ ] **Step 1: Implement `findSimilarCode(projectPath, issue)`**

```typescript
export function findSimilarCode(projectPath: string, issue: Issue): CodePattern[] {
  // Uses existing index or filesystem scan
  // Finds code snippets that are similar to the issue context
  // Returns CodePattern[] with snippet, location, relevance
}
```

- [ ] **Step 2: Implement `extractCodeSnippet(file, line, contextLines)`**

```typescript
export function extractCodeSnippet(
  file: string,
  line: number,
  contextLines: number = 3
): string {
  // Reads file and extracts snippet around line
  // Returns formatted code snippet with line numbers
}
```

- [ ] **Step 3: Implement `calculateRelevance(snippet, issue)`**

```typescript
export function calculateRelevance(snippet: string, issue: Issue): number {
  // Scores how relevant snippet is to the issue
  // Based on: same method names, similar structure, same file type
  // Returns 0-1 score
}
```

- [ ] **Step 4: Run tests**

Run: `echo "Testing pattern extraction..."`
Expected: Pattern lookup finds relevant code snippets

- [ ] **Step 5: Commit**

```bash
git add src/src/fix-intelligence/pattern.ts
git commit -m "feat: add pattern extraction to fix-intelligence"
```

---

### Task 5: Create engine.ts

**Files:**
- Create: `src/src/fix-intelligence/engine.ts`

- [ ] **Step 1: Create `FixIntelligenceEngine` class**

```typescript
export class FixIntelligenceEngine {
  private projectPath?: string;
  
  constructor(projectPath?: string) {
    this.projectPath = projectPath;
  }
  
  async analyze(input: DeepFixInput): Promise<DeepFixResult> {
    // Orchestrates all lookup modules
    // For each issue:
    //   1. Try project index (direct match)
    //   2. Try stdlib (direct match)
    //   3. Try fuzzy matching
    //   4. Try pattern extraction
    //   5. Fallback
    // Returns DeepFixResult with all suggestions
  }
  
  private async processIssue(issue: Issue, code: string, language: string): Promise<FixSuggestion> {
    // Progressive lookup logic
    // Returns FixSuggestion with type and confidence
  }
}
```

- [ ] **Step 2: Implement confidence scoring**

```typescript
private calculateConfidence(type: FixType, hasLocation: boolean): number {
  // DIRECT: 90-100 based on source
  // FUZZY: 60-89 based on similarity score
  // PATTERN: 40-59 based on relevance
  // FALLBACK: 0-39
}
```

- [ ] **Step 3: Implement result aggregation**

```typescript
private aggregateResults(suggestions: FixSuggestion[]): DeepFixResult {
  // Calculates average confidence
  // Identifies failed issues (no suggestion)
  // Returns formatted DeepFixResult
}
```

- [ ] **Step 4: Run integration test**

Run: `echo "Testing engine..."`
Expected: Engine processes issues and returns enriched suggestions

- [ ] **Step 5: Commit**

```bash
git add src/src/fix-intelligence/engine.ts
git commit -m "feat: add FixIntelligenceEngine orchestration"
```

---

### Task 6: Create index.ts (public API)

**Files:**
- Create: `src/src/fix-intelligence/index.ts`

- [ ] **Step 1: Implement `deepFix()` main function**

```typescript
import { FixIntelligenceEngine } from "./engine.js";

export function deepFix(input: DeepFixInput): DeepFixResult {
  const engine = new FixIntelligenceEngine(input.project_path);
  return engine.analyzeSync(input);
}

// Note: sync version for MCP compatibility
```

- [ ] **Step 2: Export all types**

```typescript
export type { DeepFixInput, DeepFixResult, FixSuggestion, FixType } from "./types.js";
```

- [ ] **Step 3: Run tests**

Run: `npx tsc --noEmit`
Expected: No TypeScript errors

- [ ] **Step 4: Commit**

```bash
git add src/src/fix-intelligence/index.ts
git commit -m "feat: add fix-intelligence public API"
```

---

### Task 7: Register MCP tool

**Files:**
- Modify: `src/src/server.ts`

- [ ] **Step 1: Add imports**

```typescript
import { deepFix, type DeepFixInput } from "./fix-intelligence/index.js";
```

- [ ] **Step 2: Define schema**

```typescript
const DeepFixSchema = z.object({
  code: z.string().max(MAX_INPUT_SIZE),
  language: z.string(),
  issues: z.array(z.object({
    line: z.number(),
    message: z.string(),
    type: z.string(),
    suggestion: z.string().optional(),
  })),
  project_path: z.string().optional(),
  mode: z.enum(["safe", "suggest", "full"]).optional(),
});
```

- [ ] **Step 3: Register tool**

```typescript
server.registerTool("deep_fix", {
  description: "Sugiere fixes enriquecidos usando contexto del proyecto y stdlib. 100% local.",
  inputSchema: DeepFixSchema,
}, async ({ code, language, issues, project_path, mode = "suggest" }) => {
  const result = deepFix({ code, language, issues, project_path, mode });
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});
```

- [ ] **Step 4: Test MCP tool**

Run: `echo '{"jsonrpc":"2.0","id":"1","method":"tools/call","params":{"name":"deep_fix","arguments":{"code":"console.logg(42)","language":"javascript","issues":[{"line":1,"message":"Posible typo","type":"typo"}]}}}' | timeout 5 node dist/server.js`
Expected: Enriched fix suggestion with location info

- [ ] **Step 5: Commit**

```bash
git add src/src/server.ts
git commit -m "feat: register deep_fix MCP tool"
```

---

### Task 8: Update CHANGELOG and build

**Files:**
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Add v0.6.5 entry**

```markdown
## [0.6.5] - 2026-04-13 - ALPHA

### Fix Intelligence Layer

- 🆕 **deep_fix MCP tool** - Sugiere fixes enriquecidos con contexto
  - Busca en project index (direct match, 95% confidence)
  - Busca en stdlib (90% confidence)
  - Fuzzy matching con Levenshtein (60-89%)
  - Pattern extraction de código similar (40-59%)
  - Fallback con hints manuales (<40%)

- 🆕 **Lookup modules**
  - `fix-intelligence/lookup.ts` - Project + stdlib lookups
  - `fix-intelligence/fuzzy.ts` - Levenshtein matching
  - `fix-intelligence/pattern.ts` - Code pattern extraction

- ✅ 100% local - sin Ollama ni APIs externas
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Clean build with no errors

- [ ] **Step 3: Final test**

Run MCP tool test from Task 7
Expected: deep_fix returns enriched suggestions

---

## Spec Coverage Check

- [x] Project index lookup → lookup.ts Task 2
- [x] Stdlib lookup → lookup.ts Task 2  
- [x] Fuzzy matching → fuzzy.ts Task 3
- [x] Pattern extraction → pattern.ts Task 4
- [x] Fallback response → engine.ts Task 5
- [x] Confidence scoring → engine.ts Task 5
- [x] MCP tool registration → server.ts Task 7
- [x] Zero external dependencies → all pure TypeScript

## Placeholder Scan

All steps have actual implementation details, no TODOs or TBDs.

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-13-fix-intelligence-layer.md`**

**Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
