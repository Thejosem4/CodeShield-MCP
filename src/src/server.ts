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
  verifyCode,
  verifyAndFix,
  suggestSimilar,
  autoFix,
  indexProject,
} from "./detection/index.js";

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
  code_base_index: z.string().max(MAX_INPUT_SIZE).optional(),
  auto_fix: z.boolean().optional(),
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

// Tool: verify_code
server.registerTool(
  "verify_code",
  {
    description: "Verifica código generado contra el codebase real indexado.",
    inputSchema: VerifyCodeSchema,
  },
  async ({ code, language = "python", code_base_index = "", auto_fix = false }) => {
    // If auto_fix is enabled, use verifyAndFix
    if (auto_fix) {
      const result = verifyAndFix(code, language);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    }

    // Otherwise use standard verifyCode
    let codeBaseIndex;
    if (code_base_index) {
      try {
        codeBaseIndex = JSON.parse(code_base_index);
      } catch {
        return {
          content: [{ type: "text", text: JSON.stringify({ error: "Invalid code_base_index JSON" }, null, 2) }],
        };
      }
    }
    const issues = verifyCode(code, language, codeBaseIndex);

    // Return issues as array (backward compatible)
    return {
      content: [{ type: "text", text: JSON.stringify(issues, null, 2) }],
    };
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