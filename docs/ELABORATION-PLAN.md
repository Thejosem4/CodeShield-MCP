# CodeShield-MCP - Plan de Elaboración
## Versión: v0.4.0
## Fecha: 2026-04-06

---

## Resumen de Cambios

Este release incluye 5 features principales:
1. Autofix en verify_code
2. Cache de index en memoria
3. Resource templates
4. JS/TS detection engine
5. Prompts mejorados

---

## Fase 1: Autofix en verify_code

### Tarea 1.1: Modificar `verify_code` tool schema
**Archivo:** `src/src/server.ts`
**Cambios:**
- Agregar campo `auto_fix?: boolean` al schema
- Cuando `auto_fix: true`, aplicar fix al código

### Tarea 1.2: Crear función `verifyAndFix()`
**Archivo:** `src/src/detection/index.ts`
**Nueva función:**
```typescript
export function verifyAndFix(
  code: string,
  language = "python",
  autoFix = false
): { issues: string[], fixed_code: string | null, fixed_count: number }
```

### Tarea 1.3: Reusar lógica de `autoFix` existente
- La función `autoFix()` ya existe en `index.ts`
- Modificar `verifyAndFix()` para usarla internamente

### Tarea 1.4: Actualizar output del tool
**Output nuevo:**
```typescript
{
  content: [{
    type: "text",
    text: JSON.stringify({
      issues: string[],
      fixed_code: string | null,
      fixed_count: number
    }, null, 2)
  }]
}
```

---

## Fase 2: Cache de index en memoria

### Tarea 2.1: Crear módulo de cache
**Archivo:** `src/src/cache.ts` (nuevo)
**Contenido:**
```typescript
interface CacheEntry {
  index: IndexResult;
  timestamp: number;
  ttl: number; // milliseconds
}

const indexCache = new Map<string, CacheEntry>();

export function getCachedIndex(directory: string, ttl = 300000): IndexResult | null
export function setCachedIndex(directory: string, index: IndexResult, ttl = 300000): void
export function invalidateIndex(directory: string): void
export function clearCache(): void
```

### Tarea 2.2: Integrar cache en `index_project` tool
**Archivo:** `src/src/server.ts`
**Modificación:**
```typescript
// Antes de procesar, verificar cache
const cached = getCachedIndex(directory);
if (cached && !reindex) {
  return cached;
}

// Después de procesar, guardar en cache
setCachedIndex(directory, result);
```

### Tarea 2.3: Soportar TTL configurable
- Agregar `cache_ttl` al schema (default 5 minutos)
- `reindex: true` fuerza invalidate + refresh

---

## Fase 3: Resource templates

### Tarea 3.1: Registrar resource template
**Archivo:** `src/src/server.ts`
**Código:**
```typescript
server.registerResource(
  "codebase-index",
  {
    description: "Índice de funciones, clases e imports del proyecto",
    uriTemplate: "codebase://index/{directory}",
  },
  async (uri) => {
    const directory = uri.pathname.replace(/^\//, '');
    const index = getCachedIndex(directory);
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(index, null, 2)
      }]
    };
  }
);
```

### Tarea 3.2: Actualizar SPEC.md
- Documentar el nuevo resource template

---

## Fase 4: JS/TS detection engine

### Tarea 4.1: Crear módulo JavaScript detection
**Archivo:** `src/src/detection/javascript.ts` (nuevo)
**Estructura:**
```typescript
// Stdlib de JS
const JS_STDLIB: Record<string, Set<string>> = {
  console: new Set(["log", "error", "warn", "info", "debug"]),
  Math: new Set(["floor", "ceil", "round", "abs", "sqrt", "pow", "max", "min", "random"]),
  JSON: new Set(["parse", "stringify"]),
  Array: new Set(["push", "pop", "shift", "unshift", "slice", "splice", "map", "filter", "reduce", "find", "includes"]),
  Object: new Set(["keys", "values", "entries", "assign", "create", "freeze"]),
  String: new Set(["split", "trim", "replace", "match", "search", "slice", "substring", "toLowerCase", "toUpperCase"]),
  Map: new Set(["set", "get", "has", "delete", "size", "clear"]),
  Set: new Set(["add", "has", "delete", "size", "clear"]),
  Promise: new Set(["then", "catch", "finally"]),
};

// Known typos JS
const JS_TYPOS: Record<string, Record<string, string>> = {
  console: { logg: "log", errror: "error" },
  array: { lenght: "length" },
  string: { lengh: "length" },
  object: { keys_: "keys" },
};

// Exports
export function verifyJavaScript(code: string): string[]
export function extractJSImports(code: string): ImportInfo[]
```

### Tarea 4.2: Crear módulo TypeScript detection
**Archivo:** `src/src/detection/typescript.ts` (nuevo)
**Contenido:**
```typescript
// TypeScript specific - extends JS
// - Detectar tipos básicos (string, number, boolean, etc.)
// - Detectar interfaces
// - Detectar generics
```

### Tarea 4.3: Integrar en detection/index.ts
**Modificar:** `src/src/detection/index.ts`
```typescript
import { verifyJavaScript } from "./javascript.js";
import { verifyTypeScript } from "./typescript.js";

// En detectAllIssues():
if (language === "javascript") return verifyJavaScript(code);
if (language === "typescript") return verifyTypeScript(code);
```

---

## Fase 5: Prompts mejorados

### Tarea 5.1: Agregar detección de frameworks
**Archivo:** `src/src/detection/index.ts`
**Agregar:**
```typescript
const FRAMEWORK_PATTERNS = {
  django: /\b(manage\.py|MIGRATIONS|settings\.py|INSTALLED_APPS)\b/,
  flask: /\b(app\.route|@app|Flask\()\b/,
  fastapi: /\b(@app\.|FastAPI|APIRouter)\b/,
  react: /\b(useState|useEffect|Component|jsx)\b/,
  nextjs: /\b(getServerSideProps|getStaticProps|next\/)\b/,
  nodejs: /\b(module\.exports|require\()\b/,
  express: /\b(app\.get|app\.post|router\)\b/,
};

// En analyzePrompt(), agregar:
detected_frameworks: string[]
```

### Tarea 5.2: Mejorar detección de intenciones
```typescript
// Database intentions
const DB_PATTERNS = /\b(postgres|mysql|mongodb|sqlite|redis|sql)\b/i;
// API intentions
const API_PATTERNS = /\b(rest|graphql|endpoint|api)\b/i;
// Testing intentions
const TEST_PATTERNS = /\b(test|jest|pytest|vitest)\b/i;
```

---

## Archivos a Modificar/Crear

| Fase | Archivo | Acción | LOC |
|------|---------|--------|-----|
| 1.1 | src/src/server.ts | Modificar | ~20 |
| 1.2-1.3 | src/src/detection/index.ts | Modificar | ~40 |
| 2.1 | src/src/cache.ts | Crear | ~60 |
| 2.2 | src/src/server.ts | Modificar | ~15 |
| 3.1 | src/src/server.ts | Modificar | ~20 |
| 4.1 | src/src/detection/javascript.ts | Crear | ~150 |
| 4.2 | src/src/detection/typescript.ts | Crear | ~80 |
| 4.3 | src/src/detection/index.ts | Modificar | ~30 |
| 5.1-5.2 | src/src/detection/index.ts | Modificar | ~50 |

**Total estimado:** ~465 LOC

---

## Orden de Implementación Sugerido

```
1. Fase 2 (Cache) - Base para todo
2. Fase 1 (Autofix) - Muy útil, rápido
3. Fase 3 (Resources) - Depende de cache
4. Fase 4 (JS/TS) - Mayor esfuerzo
5. Fase 5 (Prompts) - Rápido, mejora UX
```

---

## Checklist de Implementación

- [ ] Tarea 2.1: Crear cache.ts
- [ ] Tarea 2.2: Integrar cache en index_project
- [ ] Tarea 1.1: Modificar verify_code schema
- [ ] Tarea 1.2: Crear verifyAndFix()
- [ ] Tarea 1.3: Reusar autoFix en verifyAndFix
- [ ] Tarea 1.4: Actualizar output del tool
- [ ] Tarea 3.1: Registrar resource template
- [ ] Tarea 4.1: Crear javascript.ts
- [ ] Tarea 4.2: Crear typescript.ts
- [ ] Tarea 4.3: Integrar JS/TS en detection/index.ts
- [ ] Tarea 5.1: Agregar detección de frameworks
- [ ] Tarea 5.2: Mejorar detección de intenciones
- [ ] Tests para cada fase
- [ ] Update SPEC.md
- [ ] Update CHANGELOG.md

---

## Dependencias

```
cache.ts (Tarea 2.1)
    ↓
index_project con cache (Tarea 2.2)
    ↓
Resource template (Tarea 3.1) ← requiere cache

verify_code con autofix (Tareas 1.x)
    ↓
verifyAndFix (Tareas 1.2-1.3)

javascript.ts (Tarea 4.1)
    ↓
typescript.ts (Tarea 4.2)
    ↓
Integración en index.ts (Tarea 4.3)
```

---

*Plan de elaboración: 2026-04-06*
*Versión target: v0.4.0*
*Total: ~465 LOC, ~10-12h de desarrollo*