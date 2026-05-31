/**
 * CodeShield Diff Engine — Surgical Diffs
 *
 * Calcula qué líneas fueron modificadas o añadidas entre dos versiones de código.
 * Usado por el motor de verificación para filtrar issues irrelevantes (legados)
 * y reportar únicamente errores en el código nuevo o cambiado.
 *
 * Implementa un margen de seguridad configurable para capturar errores de
 * contexto adyacentes (ej: cambio en línea 10 → analiza líneas 8-12).
 */

import { diffLines } from "diff";

/**
 * Calcula el conjunto de números de línea afectados por cambios entre
 * el código original y el código propuesto.
 *
 * @param originalCode  — Código actualmente en disco (o string vacío si es archivo nuevo)
 * @param newCode       — Código propuesto por el LLM
 * @param margin        — Líneas de contexto a añadir alrededor de cada cambio (default: 2)
 * @returns Set<number> con todos los números de línea afectados (1-indexed)
 */
export function getAffectedLines(
  originalCode: string,
  newCode: string,
  margin: number = 2
): Set<number> {
  const affectedLines = new Set<number>();

  // Edge case: archivo nuevo (sin original) — todas las líneas son afectadas
  if (!originalCode || originalCode.trim() === "") {
    const totalLines = newCode.split("\n").length;
    for (let i = 1; i <= totalLines; i++) {
      affectedLines.add(i);
    }
    return affectedLines;
  }

  const changes = diffLines(originalCode, newCode);

  let currentLine = 1; // 1-indexed line counter in the NEW file

  for (const part of changes) {
    const lineCount = part.count ?? part.value.split("\n").filter((_, i, arr) =>
      // don't count the trailing empty string from a final newline
      i < arr.length - 1 || part.value[part.value.length - 1] !== "\n"
    ).length;

    if (part.added) {
      // Lines added in new code — mark them + margin
      for (let i = currentLine; i < currentLine + lineCount; i++) {
        for (let m = Math.max(1, i - margin); m <= i + margin; m++) {
          affectedLines.add(m);
        }
      }
      currentLine += lineCount;
    } else if (part.removed) {
      // Lines removed from old code — mark the surrounding context in NEW file
      // Removal doesn't advance currentLine in the new file, but does affect context
      // Add margin around the current position in the new file
      for (let m = Math.max(1, currentLine - margin); m <= currentLine + margin; m++) {
        affectedLines.add(m);
      }
      // currentLine does NOT advance for removed lines (they don't exist in new file)
    } else {
      // Unchanged lines — advance line counter without marking
      currentLine += lineCount;
    }
  }

  return affectedLines;
}

/**
 * Verifica si un número de línea está dentro del rango afectado.
 * Helper de conveniencia para uso en el motor de verificación.
 */
export function isLineAffected(
  line: number,
  affectedLines: Set<number>
): boolean {
  return affectedLines.has(line);
}

/**
 * Determina si un archivo fue completamente nuevo (sin original previo).
 * Útil para saltarse el filtrado quirúrgico cuando todo el código es nuevo.
 */
export function isNewFile(originalCode: string | null | undefined): boolean {
  return !originalCode || originalCode.trim() === "";
}
