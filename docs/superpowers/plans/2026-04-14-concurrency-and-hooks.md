# Arquitectura: Concurrencia Stateless y Sincronización Automática de Hooks
**Fecha:** 2026-04-14
**Objetivo:** Resolver el volumen excesivo de *code reviews* durante la generación y sincronizar automáticamente el MCP con los clientes (Gemini CLI, Claude Code) para operar como un interceptor transparente. Todo manteniendo la filosofía *stateless* del protocolo MCP.

---

## 1. Instalación y Sincronización Automática (Hooks)

Actualmente, MCP depende de que el LLM decida usar verify_code. Cambiaremos a una postura proactiva ("Push") usando el sistema de hooks del cliente.

### 1.1 npx codeshield init (CLI Setup)
El paquete NPM incluirá un comando de inicialización interactivo.

**Tareas a desarrollar:**
1.  **Scanner de Entorno:** Módulo en src/cli.ts que busca configuraciones de clientes conocidos (~/.gemini/hooks/hooks.json, ~/.claude/hooks/hooks.json).
2.  **Inyección del Interceptor:** El CLI generará un script Node.js ligero (el "Interceptor") y lo copiará a la carpeta de hooks del usuario.
    *   *Ejemplo de ruta:* ~/.gemini/hooks/codeshield-interceptor.js.
3.  **Registro en hooks.json:** El CLI modificará el archivo de hooks del cliente para añadir el interceptor bajo el evento que se ejecuta *antes* de que el LLM modifique un archivo (ej. BeforeTool para las herramientas write_file, replace, o bash si implica edición).

### 1.2 Lógica del Interceptor (El Guardián)
El script codeshield-interceptor.js actúa como middleware entre el LLM y el disco.

**Flujo del Interceptor:**
1.  **Intercepción:** Recibe el payload del LLM (ej. el contenido de write_file).
2.  **Validación Rápida:** Ejecuta codeshield verify --json --stdin (pasando el código por *standard input*).
3.  **Bloqueo:** Si CodeShield detecta errores CRITICAL (sintaxis rota, dependencias fantasma):
    *   El interceptor termina con código de salida distinto a 0 (process.exit(1)).
    *   Imprime el JSON con los errores a stderr.
    *   *Resultado:* El cliente (Gemini/Claude) cancela la escritura en disco y devuelve el error al LLM, forzándolo a corregir su alucinación antes de dañar el archivo.
4.  **Aprobación:** Si no hay errores críticos, termina con código 0 (process.exit(0)) y permite la escritura.

---

## 2. Reducción de Volumen de Review (Surgical Diffs)

Si un agente modifica 5 líneas en un archivo de 2000, no debe recibir *warnings* del código legacy.

### 2.1 Módulo diff-engine.ts
Crear un nuevo módulo en src/src/verification/diff-engine.ts.

**Tareas a desarrollar:**
1.  **Detección de Estado Previo:** Cuando CodeShield verifica código, debe poder leer la versión actual en disco (si existe).
2.  **Cálculo del Diff:** Integrar una librería rápida (como diff o fast-myers-diff) para comparar el código original vs el código propuesto por el LLM.
3.  **Mapeo de Líneas Afectadas:** Extraer un Set<number> con los números de línea que han sido insertados o modificados.
    *   *Contexto adicional:* Añadir un margen (ej. +/- 2 líneas) para detectar errores de contexto cercanos.

### 2.2 Filtrado Quirúrgico en verification/index.ts
1.  Ejecutar el análisis completo (detectAllIssues) sobre el código propuesto (para tener el contexto del AST). 
2.  **Post-Filtro:** Iterar sobre el array de Issue[] devuelto.
3.  Si un Issue está en una línea que **NO** está en el Set<number> de líneas afectadas (y no es un error de importación global), **se descarta**.

---

## 3. Concurrencia Multi-Agente (SQLite WAL)

Para soportar múltiples instancias de CodeShield corriendo en paralelo (debido a múltiples ventanas de terminal) sin corromper el caché y manteniendo la naturaleza *stateless*.

### 3.1 Migración a SQLite (cache.ts)
Reemplazar el guardado actual en archivos JSON planos o en memoria por una base de datos SQLite embebida usando better-sqlite3.

**Tareas a desarrollar:**
1.  **Instalación:** npm install better-sqlite3.
2.  **Inicialización de la DB:** El archivo de caché será ~/.codeshield/index_cache.db.
3.  **Activación de WAL Mode:** 
    const db = new Database('~/.codeshield/index_cache.db');
    db.pragma('journal_mode = WAL');
4.  **Schema de Caché:** Crear una tabla simple (ej. CREATE TABLE IF NOT EXISTS project_index (path TEXT PRIMARY KEY, data JSON, last_updated INTEGER)).
5.  **Beneficio Inmediato:** El modo *Write-Ahead Logging* (WAL) de SQLite permite que múltiples procesos lean y escriban simultáneamente sin bloquearse, resolviendo las *race conditions* de caché sin necesitar un servidor Daemon central.

---

## 4. Prioritization & Triage Adaptativo (con Análisis de Causalidad Semántica)

Mejorar la estructura de salida del MCP para proteger el contexto ("Cognitive Load") del LLM, y proveer la Causa Raíz en lugar de múltiples errores en cascada.

### 4.1 Análisis de Causalidad (AST-Aware Diffs)
En lugar de solo aplicar Surgical Diffs (texto plano), el sistema comprenderá el impacto del cambio a nivel de AST.
1.  **Detección de Símbolos Mutados:** Identificar si se eliminó o renombró un símbolo (ej. un import o función).
2.  **Rastreo de Referencias (Scope Tracking):** Escanear el archivo en busca de las referencias rotas causadas por el símbolo modificado.
3.  **Expansión del Diff:** Añadir automáticamente las líneas con referencias rotas al Set<number> de líneas afectadas, agrupándolas bajo una misma "Causa Raíz".

### 4.2 Refactor de la Interfaz de Respuesta
Modificar VerificationResult para reflejar las causas raíz y priorizar el triage adaptativo:

**Estructura Propuesta:**
```json
{
  "summary": {
    "total_issues": 40,
    "root_causes": 1,
    "suppressed_by_diff": 5
  },
  "instruction_for_agent": "Has provocado un error en cascada. Arregla la causa raíz para solucionar los 40 problemas derivados.",
  "issues_by_priority": [
    {
      "severity": "CRITICAL",
      "category": "Cascading Reference Error",
      "root_cause": {
        "action": "Borraste o renombraste el import 'verificarAuth' en la línea 2",
        "cascading_impact": "Esto ha roto 40 referencias en el resto del archivo (ej. línea 85, 302, 500)."
      },
      "suggested_fix": "Vuelve a importar 'verificarAuth' desde './auth' o actualiza las 40 referencias con el nuevo nombre."
    }
  ]
}
```

### 4.3 Triage Inteligente
Si el volumen sigue siendo alto:
1.  **Hard Capping:** Limitar la salida a los 5 Root Causes más severos.
2.  **Notificación de Truncado:** Añadir un mensaje al JSON indicando que se han ocultado problemas para proteger el contexto.

---

## 5. Resumen de Ejecución en Antigravity IDE

Para implementar esta arquitectura, el orden de desarrollo recomendado es:

1.  **Fase 1 (Datos & Concurrencia):** Refactorizar cache.ts para usar better-sqlite3 con modo WAL. Asegura la estabilidad base.
2.  **Fase 2 (El Interceptor):** Desarrollar codeshield init en cli.ts y el script hook standalone. Probar intercepciones manuales en terminal.
3.  **Fase 3 (Surgical Diffs):** Implementar el cálculo de Diffs de texto y el filtrado en verification/index.ts.
4.  **Fase 4 (Causalidad & Triage):** Actualizar los esquemas Zod. Implementar rastreo de dependencias (AST-Aware Diffs) para agrupar errores en cascada bajo una "Causa Raíz", y limitar la salida a un payload priorizado.
