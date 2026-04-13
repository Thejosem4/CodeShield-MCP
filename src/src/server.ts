/**
 * CodeShield MCP Server
 *
 * Expone las herramientas de CodeShield como servidor MCP (Model Context Protocol)
 * con transporte stdio — compatible con Claude Code, Claude CLI, Gemini CLI, y otros.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import {
  analyzePrompt,
  verifyCode as verifyCodeDetection,
  verifyAndFix,
  suggestSimilar,
  autoFix,
  indexProject,
} from "./detection/index.js";

import {
  verifyCode,
  checkImports,
  suggestFix,
  quickFix,
  type Issue,
  type VerificationResult,
} from "./verification/index.js";

import { deepFix } from "./fix-intelligence/index.js";

import {
  checkOllamaStatus,
  runOllamaTests,
  CheckOllamaStatusSchema,
  RunOllamaTestsSchema,
  runComprehensiveAnalysis,
} from "./testing/index.js";

import {
  getCachedIndex,
  setCachedIndex,
  invalidateIndex,
  getCacheStats,
} from "./cache.js";

// Create MCP server
const server = new McpServer({
  name: "CodeShield",
  version: "1.0.0",
});

const MAX_INPUT_SIZE = 1_000_000; // 1MB limit for all string inputs

// Tool schemas
const AnalyzePromptSchema = z.object({
  prompt: z.string().max(MAX_INPUT_SIZE),
  language: z.string().optional(),
});

const VerifyCodeSchema = z.object({
  code: z.string().max(MAX_INPUT_SIZE),
  language: z.string().optional(),
  check_level: z.enum(["fast", "standard", "thorough"]).optional(),
});

const SuggestFixSchema = z.object({
  code: z.string().max(MAX_INPUT_SIZE),
  issue: z.object({
    line: z.number(),
    message: z.string(),
    suggestion: z.string().optional(),
  }),
  language: z.string(),
});

const CheckImportsSchema = z.object({
  code: z.string().max(MAX_INPUT_SIZE),
  language: z.string(),
  project_path: z.string().optional(),
});

const QuickFixSchema = z.object({
  code: z.string().max(MAX_INPUT_SIZE),
  language: z.string(),
  auto_apply: z.array(z.string()).optional(),
});

const DeepFixSchema = z.object({
  code: z.string().max(MAX_INPUT_SIZE),
  language: z.string(),
  issues: z.array(z.object({
    line: z.number(),
    message: z.string(),
    type: z.string(),
    severity: z.string().optional().default("warning"),
    suggestion: z.string().optional(),
  })),
  project_path: z.string().optional(),
  mode: z.enum(["safe", "suggest", "full"]).optional().default("suggest"),
});

const SuggestSimilarSchema = z.object({
  name: z.string().max(10_000),
  context: z.string().max(MAX_INPUT_SIZE).optional(),
  language: z.string().optional(),
});

const FixCodeSchema = z.object({
  code: z.string().max(MAX_INPUT_SIZE),
  error: z.string().max(MAX_INPUT_SIZE).optional(),
  language: z.string().optional(),
});

const IndexProjectSchema = z.object({
  directory: z.string().max(10_000),
  languages: z.string().optional(),
  exclude: z.string().max(10_000).optional(),
  reindex: z.boolean().optional(),
  cache_ttl: z.number().optional(),
});

// Tool: analyze_prompt
server.registerTool(
  "analyze_prompt",
  {
    description: "Analiza un prompt antes de generar código.",
    inputSchema: AnalyzePromptSchema,
  },
  async ({ prompt, language = "python" }) => {
    const result = analyzePrompt(prompt, language);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: verify_code (local verification - no tokens)
server.registerTool(
  "verify_code",
  {
    description: "Verifica código en local (0 tokens) para errores de sintaxis, typos, imports faltantes. Soporta: javascript, typescript, python, rust, go, react, angular.",
    inputSchema: VerifyCodeSchema,
  },
  async ({ code, language = "python", check_level }) => {
    try {
      const result = verifyCode(code, language, { checkLevel: check_level });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }, null, 2) }],
      };
    }
  }
);

// Tool: suggest_fix
server.registerTool(
  "suggest_fix",
  {
    description: "Sugiere una corrección específica para un issue detectado.",
    inputSchema: SuggestFixSchema,
  },
  async ({ code, issue, language }) => {
    try {
      const result = suggestFix(code, language, issue);
      if (!result) {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "No suggestion available for this issue" }, null, 2) }],
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }, null, 2) }],
      };
    }
  }
);

// Tool: check_imports
server.registerTool(
  "check_imports",
  {
    description: "Verifica que los imports en el código existan en el stdlib o proyecto.",
    inputSchema: CheckImportsSchema,
  },
  async ({ code, language, project_path }) => {
    try {
      const result = checkImports(code, language, project_path);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }, null, 2) }],
      };
    }
  }
);

// Tool: quick_fix
server.registerTool(
  "quick_fix",
  {
    description: "Aplica correcciones automáticas para issues comunes (typos, etc).",
    inputSchema: QuickFixSchema,
  },
  async ({ code, language, auto_apply = [] }) => {
    try {
      const result = quickFix(code, language, auto_apply);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }, null, 2) }],
      };
    }
  }
);

// Tool: deep_fix
server.registerTool(
  "deep_fix",
  {
    description: "Sugiere fixes enriquecidos usando contexto del proyecto y stdlib. 100% local. Recibe issues de verify_code y devuelve sugerencias con locations.",
    inputSchema: DeepFixSchema,
  },
  async ({ code, language, issues, project_path, mode = "suggest" }) => {
    try {
      const result = deepFix({ code, language, issues, project_path, mode });
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }, null, 2) }],
      };
    }
  }
);

// Tool: suggest_similar_name
server.registerTool(
  "suggest_similar_name",
  {
    description: "Sugiere nombres válidos similares a uno mal escrito.",
    inputSchema: SuggestSimilarSchema,
  },
  async ({ name, context = "", language = "python" }) => {
    const result = suggestSimilar(name, context, language);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  }
);

// Tool: fix_code
server.registerTool(
  "fix_code",
  {
    description: "Corrige automáticamente errores detectables en el código.",
    inputSchema: FixCodeSchema,
  },
  async ({ code, error = "", language = "python" }) => {
    const result = autoFix(code, error, language);
    return {
      content: [{ type: "text", text: result }],
    };
  }
);

// Tool: index_project
server.registerTool(
  "index_project",
  {
    description: "Indexa el codebase del proyecto para referencias precisas. Usa cache si está disponible.",
    inputSchema: IndexProjectSchema,
  },
  async ({ directory, languages = "python", exclude = "node_modules,venv,.git,__pycache__,.venv", reindex = false, cache_ttl }) => {
    const langs = languages.split(",").map((l: string) => l.trim());
    const excl = exclude.split(",").map((e: string) => e.trim());

    // Check cache first (unless reindex is requested)
    if (!reindex) {
      const ttl = cache_ttl ? cache_ttl * 1000 : undefined;
      const cached = getCachedIndex(directory, ttl);
      if (cached) {
        return {
          content: [{ type: "text", text: JSON.stringify({ ...cached, cached: true }, null, 2) }],
        };
      }
    }

    // Invalidate if reindex
    if (reindex) {
      invalidateIndex(directory);
    }

    // Index the project
    const result = indexProject(directory, langs, excl, reindex);

    // Store in cache
    const ttl = cache_ttl ? cache_ttl * 1000 : undefined;
    setCachedIndex(directory, result, ttl);

    return {
      content: [{ type: "text", text: JSON.stringify({ ...result, cached: false }, null, 2) }],
    };
  }
);

// Tool: cache_stats (utility tool)
server.registerTool(
  "cache_stats",
  {
    description: "Obtiene estadísticas del cache de índices.",
    inputSchema: z.object({}),
  },
  async () => {
    const stats = getCacheStats();
    return {
      content: [{ type: "text", text: JSON.stringify(stats, null, 2) }],
    };
  }
);

// Tool: cache_clear (utility tool)
server.registerTool(
  "cache_clear",
  {
    description: "Limpia todo el cache de índices.",
    inputSchema: z.object({}),
  },
  async () => {
    const { clearCache } = await import("./cache.js");
    clearCache();
    return {
      content: [{ type: "text", text: JSON.stringify({ success: true }, null, 2) }],
    };
  }
);

// Tool: check_ollama_status
server.registerTool(
  "check_ollama_status",
  {
    description: "Verifica si Ollama está corriendo y el modelo qwen2.5-coder:7b está disponible",
    inputSchema: CheckOllamaStatusSchema,
  },
  async () => {
    const status = await checkOllamaStatus();
    return {
      content: [{ type: "text", text: JSON.stringify(status, null, 2) }],
    };
  }
);

// Tool: run_ollama_tests
server.registerTool(
  "run_ollama_tests",
  {
    description: "Ejecuta tests impulsados por IA local (Ollama) en código para detectar errores de seguridad, funcionales y mal funcionamiento. Modes: quick (critical only), standard (normal), deep (full analysis), audit (security + quality).",
    inputSchema: RunOllamaTestsSchema,
  },
  async ({ code, file, project_dir, categories, auto_fix, model, timeout, mode = "standard", report }) => {
    try {
      // Run comprehensive pattern analysis first
      const patternIssues = code ? runComprehensiveAnalysis(code) : [];

      // Run Ollama tests
      const result = await runOllamaTests({ code, file, project_dir, categories, auto_fix, model, timeout, mode, report });

      // Merge pattern analysis results with AI results
      const mergedResults = [...patternIssues, ...result.results];

      const mergedSummary = {
        total: mergedResults.length,
        critical: mergedResults.filter(i => i.severity === "CRITICAL").length,
        high: mergedResults.filter(i => i.severity === "HIGH").length,
        medium: mergedResults.filter(i => i.severity === "MEDIUM").length,
        low: mergedResults.filter(i => i.severity === "LOW").length,
        info: mergedResults.filter(i => i.severity === "INFO").length,
        auto_fixed: result.summary.auto_fixed,
      };

      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            ...result,
            results: mergedResults,
            summary: mergedSummary,
            pattern_analysis_count: patternIssues.length,
          }, null, 2),
        }],
      };
    } catch (error) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }, null, 2) }],
      };
    }
  }
);

// Resource: codebase-index
// URI template: codeshield://index/{directory}
const CODEBASE_INDEX_URI = "codeshield://index";
const INDEX_TEMPLATE = `${CODEBASE_INDEX_URI}/{directory}` as const;

server.registerResource(
  "codebase-index",
  INDEX_TEMPLATE,
  {
    description: "Índice de funciones, clases e imports del proyecto",
  },
  async (uri: { pathname: string }) => {
    // Extract directory from URI
    const directory = decodeURIComponent(uri.pathname.replace(/^\//, ""));

    if (!directory) {
      return {
        contents: [{
          uri: `${CODEBASE_INDEX_URI}/`,
          mimeType: "application/json",
          text: JSON.stringify({ error: "directory required" }, null, 2),
        }],
      };
    }

    // Get from cache
    const index = getCachedIndex(directory);

    if (!index) {
      return {
        contents: [{
          uri: `${CODEBASE_INDEX_URI}/${encodeURIComponent(directory)}`,
          mimeType: "application/json",
          text: JSON.stringify({ error: "index not found. Use index_project tool first." }, null, 2),
        }],
      };
    }

    return {
      contents: [{
        uri: `${CODEBASE_INDEX_URI}/${encodeURIComponent(directory)}`,
        mimeType: "application/json",
        text: JSON.stringify(index, null, 2),
      }],
    };
  }
);

// Resource template: list of cached indices
server.registerResource(
  "codebase-index-list",
  `${CODEBASE_INDEX_URI}/list` as const,
  {
    description: "Lista de todos los índices en cache",
  },
  async () => {
    const stats = getCacheStats();
    const indices = stats.entries.map(dir => ({
      directory: dir,
      uri: `${CODEBASE_INDEX_URI}/${encodeURIComponent(dir)}`,
    }));

    return {
      contents: [{
        uri: `${CODEBASE_INDEX_URI}/list`,
        mimeType: "application/json",
        text: JSON.stringify({ indices, count: stats.size }, null, 2),
      }],
    };
  }
);

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("CodeShield MCP Server started");
}

main().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});