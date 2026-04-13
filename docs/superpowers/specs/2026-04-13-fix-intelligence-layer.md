# Fix Intelligence Layer - Design Specification

**Date:** 2026-04-13
**Project:** CodeShield MCP
**Status:** Approved

---

## 1. Concept & Vision

Sistema de sugerencias de fix inteligente y contextual para CodeShield MCP. Analiza cada issue detectado, busca contexto relevante en el proyecto y stdlib, y devuelve sugerencias enrichidas con locations y código de referencia. **100% local** - sin llamadas a APIs externas u Ollama.

El sistema debe ser como un "senior developer mirando tu código" - conoce el proyecto, conoce el stdlib, y puede decirte "quisiste decir X? está justo aquí en tu código".

---

## 2. Design Language

### Core Principles
- **Zero external dependencies** para lookup básico
- **Progressive enhancement** - lookup simple → fuzzy → pattern
- **Transparency** - siempre mostrar source de la sugerencia
- **No hallucination** - nunca generar código nuevo con AI

### Architecture Pattern
```
verify_code → issues[]
     ↓
deep_fix → enriched suggestions
     ↓
apply_fix (user choice)
```

### Data Flow
1. receive issues[] from verify_code
2. for each issue, search in order:
   - Project index (exact match)
   - Stdlib (exact match)
   - Fuzzy match (Levenshtein)
   - Pattern match (code snippets)
   - Fallback (manual check)
3. enrich each suggestion with context
4. return ranked suggestions with confidence

---

## 3. Layout & Structure

### Module Location
```
src/src/fix-intelligence/
├── index.ts           # Public API
├── engine.ts          # FixIntelligenceEngine class
├── lookup.ts         # Project + stdlib lookup
├── fuzzy.ts           # Levenshtein matching
├── pattern.ts         # Code pattern extraction
└── types.ts           # All interfaces
```

### File Responsibilities

**types.ts**
- `FixSuggestion` interface
- `DeepFixInput`, `DeepFixResult` interfaces
- `FixType` enum

**lookup.ts**
- `searchProjectIndex(symbol)` → ProjectSymbol[]
- `searchStdlib(symbol, language)` → StdlibSymbol[]
- `getSymbolLocation(symbol)` → location string

**fuzzy.ts**
- `findSimilarSymbols(candidates, target, threshold)` → SimilarSymbol[]
- `calculateLevenshteinSimilarity(a, b)` → number

**pattern.ts**
- `findSimilarCode(projectPath, issue)` → CodePattern[]
- `extractCodeSnippet(file, line)` → string

**engine.ts**
- `FixIntelligenceEngine.analyze(issues, code, language)` → DeepFixResult
- orchestrates all lookup modules
- handles confidence scoring

**index.ts**
- exports `deepFix()` main function
- exports types

---

## 4. Features & Interactions

### Core Features

**F1: Project Index Lookup**
- Busca símbolos en índice del proyecto
- Devuelve: { name, location, type, frequency }
- Confidence: 95% (exact match)

**F2: Stdlib Lookup**
- Busca en stdlib del lenguaje (JS_STDLIB, PY_STDLIB, etc.)
- Devuelve: { name, module, methods, location }
- Confidence: 90%

**F3: Fuzzy Matching**
- Levenshtein distance con threshold configurable
- Busca en: project index → stdlib → all candidates
- Devuelve ranked list por similarity score
- Confidence: score * 100 (e.g., 85% → 85)

**F4: Pattern Extraction**
- Busca código similar en proyecto
- Extrae snippets de líneas cercanas
- Devuelve: { snippet, location, relevance }
- Confidence: 70%

**F5: Fallback Response**
- Cuando nada matchea:
  - Stdlib issue → hint a docs
  - Project issue → "no similar found"
  - Never generate code with AI
- Confidence: 20%

### Confidence Tiers
| Tier | Score | Source | Action |
|------|-------|--------|--------|
| DIRECT | 90-100 | project index / stdlib | suggest with location |
| FUZZY | 60-89 | fuzzy match | "did you mean X?" |
| PATTERN | 40-59 | code pattern | show snippet |
| FALLBACK | 0-39 | no match | manual check hint |

### Input Schema (MCP)
```typescript
{
  code: string,           // código fuente
  language: string,        // javascript, python, etc.
  issues: Issue[],         // de verify_code
  project_path?: string,  // para project lookups
  mode: "safe" | "suggest" | "full"
}
```

### Output Schema (MCP)
```typescript
{
  suggestions: FixSuggestion[],
  failed_issues: Issue[],    // sin sugerencia
  confidence: number,        // promedio 0-100
  processing_time_ms: number
}

interface FixSuggestion {
  original_issue: Issue;
  type: "direct" | "fuzzy" | "pattern" | "fallback";
  confidence: number;
  
  // ONE OF:
  direct?: { suggestion: string; source: "stdlib" | "project"; location: string };
  fuzzy?: { suggestion: string; alternatives: Array<{ name: string; score: number; location: string }> };
  pattern?: { suggestion: string; based_on: string; snippet: string };
  fallback?: { message: string; stdlib_hint?: string; project_hint?: string };
}
```

---

## 5. Component Inventory

### FixIntelligenceEngine

**States:**
- `idle` - waiting for input
- `analyzing` - processing issues
- `complete` - results ready
- `error` - something failed

**Methods:**
- `analyze(input: DeepFixInput): DeepFixResult`
- `lookupInProject(symbol: string): ProjectSymbol[]`
- `lookupInStdlib(symbol: string, language: string): StdlibSymbol[]`
- `findFuzzyMatches(symbol: string, candidates: Symbol[]): SimilarSymbol[]`
- `findPatterns(issue: Issue): CodePattern[]`

### Lookup Modules

**project-lookup:**
- Uses existing `getCachedIndex()` from cache.js
- Falls back to filesystem scan if no index
- Timeout: 100ms max

**stdlib-lookup:**
- Uses existing JS_STDLIB, PY_STDLIB, etc. from detection modules
- No external calls

**fuzzy-lookup:**
- Levenshtein distance algorithm
- Threshold: 2 for short words, 3 for longer
- Returns top 5 matches

**pattern-lookup:**
- Grep for similar function calls in project
- Extracts 3 lines context around match
- Uses existing project indexing

---

## 6. Technical Approach

### Dependencies
- Uses existing `cache.js` for project index
- Uses existing `detection/*.ts` stdlib data
- Pure TypeScript, no external AI/LLM

### Performance Targets
| Operation | Target | Method |
|-----------|--------|--------|
| lookup | < 50ms | in-memory stdlib maps |
| fuzzy | < 100ms | optimized Levenshtein |
| pattern | < 200ms | regex + context |
| full analyze | < 500ms | parallel processing |

### Integration Points
- MCP tool: `deep_fix`
- Uses existing `verify_code` output as input
- Returns enriched suggestions

### Error Handling
- If project index unavailable → skip project lookup, continue with stdlib
- If no matches → return fallback with hints
- If error in lookup → log and return partial results

---

## 7. MCP Tool Registration

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

server.registerTool("deep_fix", {
  description: "Sugiere fixes enriquecidos usando contexto del proyecto",
  inputSchema: DeepFixSchema,
}, async ({ code, language, issues, project_path, mode = "suggest" }) => {
  const result = deepFix({ code, language, issues, project_path, mode });
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

---

## 8. Testing Strategy

1. **Unit tests** para cada lookup module
2. **Integration tests** con mock project structure
3. **E2E tests** con actual verify_code → deep_fix flow
4. **Benchmark tests** para performance targets

---

## 9. Future Considerations (Out of Scope)

- AI-powered generation (use Ollama internally, not in product)
- Learning from user corrections (feedback loop)
- Cross-project pattern libraries
- Fix application automation
