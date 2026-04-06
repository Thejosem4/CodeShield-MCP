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
  suggestSimilar,
  autoFix,
  indexProject,
} from "./detection/index.js";

// Create MCP server
const server = new McpServer({
  name: "CodeShield",
  version: "1.0.0",
});

// Tool schemas
const AnalyzePromptSchema = z.object({
  prompt: z.string(),
  language: z.string().optional(),
});

const VerifyCodeSchema = z.object({
  code: z.string(),
  language: z.string().optional(),
  code_base_index: z.string().optional(),
});

const SuggestSimilarSchema = z.object({
  name: z.string(),
  context: z.string().optional(),
  language: z.string().optional(),
});

const FixCodeSchema = z.object({
  code: z.string(),
  error: z.string().optional(),
  language: z.string().optional(),
});

const IndexProjectSchema = z.object({
  directory: z.string(),
  languages: z.string().optional(),
  exclude: z.string().optional(),
  reindex: z.boolean().optional(),
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
  async ({ code, language = "python", code_base_index = "" }) => {
    const codeBaseIndex = code_base_index ? JSON.parse(code_base_index) : undefined;
    const result = verifyCode(code, language, codeBaseIndex);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
    description: "Indexa el codebase del proyecto para referencias precisas.",
    inputSchema: IndexProjectSchema,
  },
  async ({ directory, languages = "python", exclude = "node_modules,venv,.git,__pycache__,.venv", reindex = false }) => {
    const langs = languages.split(",").map((l: string) => l.trim());
    const excl = exclude.split(",").map((e: string) => e.trim());
    const result = indexProject(directory, langs, excl, reindex);
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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
