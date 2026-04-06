# CodeShield-MCP Development Plan
# Fecha: 2026-04-06
# Versión target: v0.3.0

---

## Scope v0.3.0 - Implementable

### Features Confirmadas (sin streaming, sin AI, sin lógica)

| # | Feature | Descripción | Prioridad |
|---|---------|-------------|-----------|
| 1 | Autofix en verify_code | `verify_code` retorna código corregido + errores | ALTA |
| 2 | Cache de index | Index en memoria entre llamadas MCP (stateful) | ALTA |
| 3 | Resource templates | Exponer índice como MCP resource | MEDIA |
| 4 | Prompts mejorados | `pre_analyze` con contexto de proyecto | MEDIA |
| 5 | JS/TS detection engine | Motor de detección para JS/TS | MEDIA |

### Features Descartadas (v1.x+)

| # | Feature | Razón |
|---|---------|-------|
| - | Streaming | Stdio transport no soporta true streaming |
| - | AI-powered suggestions | Requiere modelo local (Ollama/LM Studio) |
| - | Detección de lógica | Requiere análisis semántico/IA |

---

## Implementación Fase por Fase

### Fase 1: Autofix en verify_code (2h)

**Archivos a modificar:**
- `src/src/detection/index.ts` - agregar función `verifyAndFix()`
- `src/src/server.ts` - nuevo tool `verify_and_fix` o ampliar `verify_code`

**API propuesta:**
```typescript
// Input
{ code: string, language?: string, auto_fix?: boolean }

// Output
{
  issues: string[],           // Lista de errores
  fixed_code: string | null,  // Código corregido si autofix=true
  fixed_count: number         // Cuántos fixes se aplicaron
}
```

**Casos de auto-fix:**
- `count_items()` → `count()`
- `sumArray()` → `sum()`
- `appendItem()` → `append()`
- `data_frame` → `DataFrame`
- Keywords mal escritos (deff → def, etc.)

---

### Fase 2: Cache de index en memoria (1h)

**Archivos a modificar:**
- `src/src/server.ts` - agregar Map para cache

**Implementación:**
```typescript
// Cache en memoria
const indexCache = new Map<string, IndexResult>();

// Tool: index_project con cache
// - Si directory ya está indexado y reindex=false, usar cache
// - TTL: 5 minutos (configurable)
// - Invalidar con reindex=true
```

**Consideraciones:**
- Process restart limpia cache (comportamiento esperado)
- Soportar múltiples proyectos (cache por directory)
- .codeshield.yaml para TTL configurable

---

### Fase 3: Resource templates (1h)

**Archivos a modificar:**
- `src/src/server.ts` - registrar resource template

**Implementación:**
```typescript
// Resource: codebase://index/{directory}
server.registerResource(
  "codebase-index",
  {
    description: "Índice de funciones, clases e imports del proyecto",
    uriTemplate: "codebase://index/{directory}",
  },
  (uri) => {
    const dir = extractDirFromUri(uri);
    return {
      contents: [{
        uri: uri.href,
        mimeType: "application/json",
        text: JSON.stringify(indexCache.get(dir))
      }]
    };
  }
);
```

**Beneficio:** Claude Code puede usar el índice en contexto sin llamar tool.

---

### Fase 4: JS/TS detection engine (4-6h)

**Archivos a crear:**
- `src/src/detection/javascript.ts` - Motor JS
- `src/src/detection/typescript.ts` - Motor TS (extiende JS)

**Scope inicial:**
```typescript
// JS detection
const JS_STDLIB: Record<string, Set<string>> = {
  console: new Set(["log", "error", "warn", "info"]),
  Math: new Set(["floor", "ceil", "round", "abs", "sqrt", "pow", "max", "min"]),
  JSON: new Set(["parse", "stringify"]),
  Array: new Set(["push", "pop", "shift", "slice", "splice", "map", "filter", "reduce"]),
  Object: new Set(["keys", "values", "entries", "assign"]),
  String: new Set(["split", "trim", "replace", "match", "search"]),
};

// JS common typos
const JS_TYPOS = {
  console: { logg: "log", errror: "error" },
  array: { lenght: "length", firs: "first" },
};
```

**Probar con:**
```javascript
// Detectar
arr.lenght     // → length
console.logg() // → log
json.parse()   // ✓
arr.map()      // ✓
```

---

### Fase 5: Prompts mejorados (2h)

**Archivos a modificar:**
- `src/src/detection/index.ts` - mejorar `analyzePrompt()`

**Mejoras:**
```typescript
// Agregar: detección de intención de framework
const FRAMEWORK_PATTERNS = {
  django: /\b(manage\.py|MIGRATIONS|settings\.py|INSTALLED_APPS)\b/,
  flask: /\b(app\.route|@app|Flask\()\b/,
  fastapi: /\b(@app\.|FastAPI|APIRouter)\b/,
  react: /\b(useState|useEffect|Component|jsx)\b/,
  nextjs: /\b(getServerSideProps|getStaticProps|next\/)\b/,
};

// Agregar: sugerencias basadas en contexto
// "quiero conectar a postgres" → detecta intención de database
// "dame un endpoint REST" → detecta intención de API
```

---

## Archivos a Modificar/Crear

### Modificar:
1. `src/src/detection/index.ts` - autofix, JS/TS, prompts mejorados
2. `src/src/server.ts` - cache, resources, nuevos tools

### Crear:
1. `src/src/detection/javascript.ts` - motor JS
2. `src/src/detection/typescript.ts` - motor TS
3. `docs/DEVELOPMENT.md` - guía para contributors

---

## Timeline Estimado

| Fase | Duración | Entregable |
|------|----------|-----------|
| Fase 1: Autofix | 2h | verify_code retorna fixed_code |
| Fase 2: Cache | 1h | index persists entre calls |
| Fase 3: Resources | 1h | codebase://index template |
| Fase 4: JS/TS | 4-6h | detection para JS/TS |
| Fase 5: Prompts | 2h | analyzePrompt con contexto |

**Total estimado:** 10-12h de desarrollo

---

## Checklist de Implementación

- [ ] Fase 1: Autofix en verify_code
- [ ] Fase 2: Cache de index en memoria
- [ ] Fase 3: Resource templates
- [ ] Fase 4: JS/TS detection engine
- [ ] Fase 5: Prompts mejorados
- [ ] Tests para todas las features
- [ ] Update SPEC.md con nuevas features
- [ ] Update CHANGELOG.md para v0.3.0
- [ ] Cleanup de archivos innecesarios

---

*Plan creado: 2026-04-06*
*Última actualización: 2026-04-06*