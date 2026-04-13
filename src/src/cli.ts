/**
 * CodeShield CLI
 *
 * Command-line interface for CodeShield verification and code analysis.
 * Called when the binary is executed without the "serve" flag.
 */
import * as fs from "fs";
import * as path from "path";
import { verifyCode, autoFix, scanProject } from "./detection/index.js";
import { checkOllamaStatus, runOllamaTests } from "./testing/index.js";
import {
  saveContext,
  listContexts,
  getContext,
  deleteContext,
} from "./context-store.js";

// Version - sync with package.json
const VERSION = "0.6.2";

// === Types ===

interface GlobalFlags {
  json: boolean;
  quiet: boolean;
}

interface VerifyOptions extends GlobalFlags {
  language?: string;
}

interface ScanOptions extends GlobalFlags {
  extensions?: string;
}

interface ExplainOptions extends GlobalFlags {}

interface AuditDepsOptions extends GlobalFlags {}

interface ContextSaveOptions extends GlobalFlags {
  files?: string;
  notes?: string;
}

interface ContextListOptions extends GlobalFlags {}

interface ContextRestoreOptions extends GlobalFlags {}

interface ContextDeleteOptions extends GlobalFlags {}

interface TestOptions extends GlobalFlags {
  category?: string;
  model?: string;
  timeout?: number;
  auto_fix?: boolean;
  status?: boolean;
  mode?: "quick" | "standard" | "deep" | "audit";
  report?: "bug" | "security" | "coverage" | "quality" | "recommendations";
}

// === Output Formatters ===

function printBanner(): void {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    CodeShield CLI                       ║
║           LLM Hallucination Verification                ║
╚═══════════════════════════════════════════════════════════╝
`);
}

function printJson<T>(data: T): void {
  console.log(JSON.stringify(data, null, 2));
}

function printMetrics(startTime: number, issueCount: number, quiet: boolean, json: boolean): void {
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  if (json) {
    printJson({ elapsed_seconds: parseFloat(elapsed), issues_found: issueCount });
    return;
  }

  if (!quiet) {
    console.log(`\n── Metrics ───────────────────────────`);
    console.log(`  Time: ${elapsed}s`);
    console.log(`  Issues: ${issueCount}`);
  }
}

// === Command Implementations ===

async function handleVerify(
  filePath: string,
  options: VerifyOptions,
  _flags: string[]
): Promise<void> {
  const { language, json, quiet } = options;
  const startTime = Date.now();

  if (!fs.existsSync(filePath)) {
    const msg = json
      ? JSON.stringify({ error: `File not found: ${filePath}` })
      : `Error: File not found: ${filePath}`;
    console.error(msg);
    process.exit(1);
  }

  // Validate supported file extensions
  const supportedExtensions = [".py", ".js", ".ts", ".jsx", ".tsx", ".java", ".cpp", ".c", ".go", ".rs", ".rb", ".php"];
  const ext = path.extname(filePath).toLowerCase();
  if (!supportedExtensions.includes(ext)) {
    const msg = json
      ? JSON.stringify({ error: `Unsupported file extension: ${ext}. Supported: ${supportedExtensions.join(", ")}` })
      : `Error: Unsupported file extension: ${ext}. Supported: ${supportedExtensions.join(", ")}`;
    console.error(msg);
    process.exit(1);
  }

  const code = fs.readFileSync(filePath, "utf-8");
  const inferredLang = language || path.extname(filePath).slice(1) || "python";
  const issues = verifyCode(code, inferredLang);

  if (json) {
    printJson({
      file: filePath,
      language: inferredLang,
      issues,
      issue_count: issues.length,
      is_valid: issues.length === 0,
    });
  } else {
    if (!quiet) {
      console.log(`\nVerifying: ${filePath}`);
      console.log(`Language: ${inferredLang}`);
    }

    if (issues.length === 0) {
      console.log("\n✓ No issues found - code appears valid");
    } else {
      console.log(`\n✗ Found ${issues.length} issue(s):\n`);
      issues.forEach((issue) => console.log(`  • ${issue}`));
    }
  }

  printMetrics(startTime, issues.length, quiet, json);
}

async function handleScan(
  directory: string,
  options: ScanOptions,
  _flags: string[]
): Promise<void> {
  const { extensions, json, quiet } = options;
  const startTime = Date.now();

  const targetDir = directory || process.cwd();

  // Resolve symlinks and verify directory exists
  let resolvedDir: string;
  try {
    resolvedDir = fs.realpathSync(targetDir);
  } catch {
    const msg = json
      ? JSON.stringify({ error: `Directory not found: ${targetDir}` })
      : `Error: Directory not found: ${targetDir}`;
    console.error(msg);
    process.exit(1);
  }

  if (!fs.statSync(resolvedDir).isDirectory()) {
    const msg = json
      ? JSON.stringify({ error: `Path is not a directory: ${targetDir}` })
      : `Error: Path is not a directory: ${targetDir}`;
    console.error(msg);
    process.exit(1);
  }

  const extList = extensions
    ? extensions.split(",").map((e) => e.trim())
    : [".ts", ".js"];

  const summary = scanProject(targetDir, extList);

  if (json) {
    printJson(summary);
  } else {
    if (!quiet) {
      console.log(`\nScanning: ${targetDir}`);
      console.log(`Extensions: ${extList.join(", ")}`);
    }

    console.log(`\n── Scan Results ───────────────────────────`);
    console.log(`  Total files: ${summary.total_files}`);
    console.log(`  Clean files: ${summary.clean_files}`);
    console.log(`  Files with issues: ${summary.files_with_issues}`);
    console.log(`  Total issues: ${summary.total_issues}`);

    if (summary.results.length > 0) {
      console.log(`\n── Files with Issues ──────────────────────`);
      for (const result of summary.results) {
        if (!result.is_valid) {
          console.log(`\n  ${result.file}`);
          if (result.error) {
            console.log(`    Error: ${result.error}`);
          } else {
            result.issues.forEach((issue) => console.log(`    • ${issue}`));
          }
        }
      }
    }
  }

  printMetrics(startTime, summary.total_issues, quiet, json);
}

async function handleExplain(
  filePath: string,
  options: ExplainOptions,
  _flags: string[]
): Promise<void> {
  const { json, quiet } = options;

  if (!fs.existsSync(filePath)) {
    const msg = json
      ? JSON.stringify({ error: `File not found: ${filePath}` })
      : `Error: File not found: ${filePath}`;
    console.error(msg);
    process.exit(1);
  }

  const code = fs.readFileSync(filePath, "utf-8");
  const inferredLang = path.extname(filePath).slice(1) || "python";
  const issues = verifyCode(code, inferredLang);

  if (json) {
    printJson({
      file: filePath,
      language: inferredLang,
      explanation: issues.length > 0 ? issues : ["No issues found"],
      issue_count: issues.length,
    });
  } else {
    if (!quiet) {
      console.log(`\nExplaining: ${filePath}`);
      console.log(`Language: ${inferredLang}`);
    }

    if (issues.length === 0) {
      console.log("\n✓ No issues found to explain");
    } else {
      console.log("\n── Issues Explanation ────────────────────\n");
      issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. ${issue}`);
        console.log("     This indicates a potential LLM hallucination.\n");
      });
    }
  }
}

async function handleAuditDeps(
  filePath: string,
  options: AuditDepsOptions,
  _flags: string[]
): Promise<void> {
  const { json, quiet } = options;

  // Default to requirements.txt in current directory
  const targetPath = filePath || path.join(process.cwd(), "requirements.txt");

  if (!fs.existsSync(targetPath)) {
    const msg = json
      ? JSON.stringify({ error: `Requirements file not found: ${targetPath}` })
      : `Error: Requirements file not found: ${targetPath}`;
    console.error(msg);
    process.exit(1);
  }

  const content = fs.readFileSync(targetPath, "utf-8");
  const { auditDependencies } = await import("./audit-deps.js");
  const results = auditDependencies(content);

  if (json) {
    printJson({
      file: targetPath,
      vulnerabilities: results,
      count: results.length,
      is_clean: results.length === 0,
    });
  } else {
    if (!quiet) {
      console.log(`\nAuditing: ${targetPath}`);
    }

    if (results.length === 0) {
      console.log("\n✓ No known vulnerabilities found");
    } else {
      console.log(`\n✗ Found ${results.length} vulnerability(ies):\n`);
      for (const r of results) {
        console.log(`  • ${r.package} ${r.operator}${r.currentVersion || ""} [${r.severity}]`);
        console.log(`    CVE: ${r.cve}`);
        console.log(`    ${r.description}`);
        console.log(`    Recommendation: ${r.recommendation}\n`);
      }
    }
  }

  const startTime = Date.now();
  printMetrics(startTime, results.length, quiet, json);
}

async function handleContextSave(
  name: string,
  options: ContextSaveOptions,
  _flags: string[]
): Promise<void> {
  const { files: filesStr, notes, json } = options;

  if (!name) {
    console.error(json ? JSON.stringify({ error: "Context name required" }) : "Error: Context name required");
    process.exit(1);
  }

  // Sanitize name: only alphanumeric, underscore, and hyphen allowed
  const sanitizedName = name.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!sanitizedName) {
    console.error(json ? JSON.stringify({ error: "Context name must contain valid characters (alphanumeric, underscore, hyphen)" }) : "Error: Context name must contain valid characters (alphanumeric, underscore, hyphen)");
    process.exit(1);
  }

  const fileList = filesStr
    ? filesStr.split(",").map((f) => f.trim())
    : [];

  try {
    const result = await saveContext(sanitizedName, fileList, { notes });

    if (json) {
      printJson(result);
    } else {
      console.log(`✓ Context "${sanitizedName}" saved successfully`);
      if (fileList.length > 0) {
        console.log(`  Files: ${fileList.length}`);
      }
    }
  } catch (error) {
    console.error(json ? JSON.stringify({ error: String(error) }) : `Error: ${error}`);
    process.exit(1);
  }
}

async function handleContextList(
  _options: ContextListOptions,
  _flags: string[]
): Promise<void> {
  try {
    const contexts = await listContexts();

    if (contexts.length === 0) {
      console.log("No saved contexts found");
      return;
    }

    console.log(`\n── Saved Contexts ─────────────────────────`);
    for (const ctx of contexts) {
      console.log(`\n  ${ctx.name}`);
      console.log(`    Created: ${ctx.createdAt}`);
      console.log(`    Files: ${ctx.files.length}`);
      if (ctx.notes) {
        console.log(`    Notes: ${ctx.notes.substring(0, 50)}${ctx.notes.length > 50 ? "..." : ""}`);
      }
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

async function handleContextRestore(
  name: string,
  _options: ContextRestoreOptions,
  _flags: string[]
): Promise<void> {
  if (!name) {
    console.error("Error: Context name required");
    process.exit(1);
  }

  try {
    const context = await getContext(name);

    if (!context) {
      console.error(`Error: Context "${name}" not found`);
      process.exit(1);
    }

    console.log(`\n── Restoring Context: ${name} ───────────────`);
    console.log(`  Created: ${context.createdAt}`);
    console.log(`  Files:`);
    context.files.forEach((f) => console.log(`    - ${f}`));
    if (context.notes) {
      console.log(`  Notes: ${context.notes}`);
    }

    // Note: Actual restoration logic would reload files, etc.
    // This is a stub that shows the context data
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

async function handleContextDelete(
  name: string,
  _options: ContextDeleteOptions,
  _flags: string[]
): Promise<void> {
  if (!name) {
    console.error("Error: Context name required");
    process.exit(1);
  }

  try {
    const deleted = await deleteContext(name);

    if (deleted) {
      console.log(`✓ Context "${name}" deleted`);
    } else {
      console.log(`Context "${name}" not found (may already be deleted)`);
    }
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
}

async function handleServe(
  _args: string[],
  _flags: string[]
): Promise<void> {
  // Dynamic import triggers server.ts top-level main() execution
  // which starts the MCP server via StdioServerTransport
  const serverPath = path.resolve(__dirname, "server.js");
  await import("file://" + serverPath.replace(/\\/g, "/"));
  // Note: server runs until killed, this await won't resolve
}

async function handleTest(
  filePath: string,
  options: TestOptions,
  _flags: string[]
): Promise<void> {
  const { category, model, timeout, auto_fix, json, quiet, mode = "standard", report } = options;
  const startTime = Date.now();

  // Handle --status flag for checking Ollama status
  if (options["status"] === true || filePath === "--status") {
    const status = await checkOllamaStatus();

    if (json) {
      printJson(status);
    } else {
      console.log("\n── Ollama Status ────────────────────────");
      console.log(`  Available: ${status.available ? "Yes" : "No"}`);
      console.log(`  Model: ${status.model_name}`);
      console.log(`  Model Loaded: ${status.model_loaded ? "Yes" : "No"}`);
      if (status.error) {
        console.log(`  Error: ${status.error}`);
      }
      if (status.ollama_version) {
        console.log(`  Version: ${status.ollama_version}`);
      }
    }
    return;
  }

  // Validate file path
  if (!filePath) {
    const msg = json
      ? JSON.stringify({ error: "File path required. Use --status to check Ollama status." })
      : "Error: File path required. Use --status to check Ollama status.";
    console.error(msg);
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    const msg = json
      ? JSON.stringify({ error: `File not found: ${filePath}` })
      : `Error: File not found: ${filePath}`;
    console.error(msg);
    process.exit(1);
  }

  // Check if it's a directory - if so, we'll scan files
  let isDirectory = false;
  try {
    isDirectory = fs.statSync(filePath).isDirectory();
  } catch {}

  // Parse categories
  const validCategories: Array<"security" | "functional" | "malfunction" | "quality"> = [
    "security", "functional", "malfunction", "quality"
  ];
  const categories = category
    ? category.split(",").map((c) => c.trim()).filter((c): c is typeof validCategories[number] => validCategories.includes(c as any))
    : validCategories;

  if (isDirectory) {
    // Scan all TypeScript/JavaScript files in directory
    const exts = [".ts", ".tsx", ".js", ".jsx"];
    const files = fs.readdirSync(filePath, { recursive: true })
      .filter((f: string | Buffer) => exts.some(ext => String(f).endsWith(ext)))
      .slice(0, 20); // Limit to 20 files for now

    const allResults: any[] = [];
    const startTime = Date.now();

    for (const file of files) {
      const fullPath = path.join(filePath, String(file));
      try {
        const code = fs.readFileSync(fullPath, "utf-8");
        const result = await runOllamaTests({
          code,
          file: fullPath,
          categories,
          auto_fix: auto_fix ?? false,
          model: model ?? "qwen2.5-coder:7b",
          timeout: timeout ?? 60,
          mode: mode as any,
          report: report as any,
        });
        allResults.push(...result.results);
      } catch {
        // Skip files that fail
      }
    }

    const summary = {
      total: allResults.length,
      critical: allResults.filter(i => i.severity === "CRITICAL").length,
      high: allResults.filter(i => i.severity === "HIGH").length,
      medium: allResults.filter(i => i.severity === "MEDIUM").length,
      low: allResults.filter(i => i.severity === "LOW").length,
      info: allResults.filter(i => i.severity === "INFO").length,
      auto_fixed: 0,
    };

    if (json) {
      printJson({
        directory: filePath,
        files_scanned: files.length,
        model: "qwen2.5-coder:7b",
        mode: mode,
        issues: allResults,
        summary,
        elapsed_ms: Date.now() - startTime,
      });
    } else {
      console.log(`\n── Ollama Test Results ───────────────────`);
      console.log(`  Directory: ${filePath}`);
      console.log(`  Files scanned: ${files.length}`);
      console.log(`  Model: qwen2.5-coder:7b`);
      console.log(`  Mode: ${mode}`);
      console.log(`\n── Summary ───────────────────────────────`);
      console.log(`  Total: ${summary.total} | Critical: ${summary.critical} | High: ${summary.high} | Medium: ${summary.medium}`);
    }
    return;
  }

  try {
    const code = fs.readFileSync(filePath, "utf-8");
    const result = await runOllamaTests({
      code,
      file: filePath,
      categories,
      auto_fix: auto_fix ?? false,
      model: model ?? "qwen2.5-coder:7b",
      timeout: timeout ?? 60,
      mode,
      report,
    });

    if (json) {
      printJson({
        file: filePath,
        model: result.ollama_model,
        mode: result.mode,
        report_type: result.report_type,
        issues: result.results,
        summary: result.summary,
        elapsed_ms: result.elapsed_ms,
      });
    } else {
      if (!quiet) {
        console.log(`\n── Ollama Test Results ───────────────────`);
        console.log(`  File: ${filePath}`);
        console.log(`  Model: ${result.ollama_model}`);
        console.log(`  Mode: ${result.mode}`);
        console.log(`  Time: ${result.elapsed_ms}ms`);
      }

      console.log(`\n── Summary ───────────────────────────────`);
      console.log(`  Total: ${result.summary.total}`);
      console.log(`  Critical: ${result.summary.critical}`);
      console.log(`  High: ${result.summary.high}`);
      console.log(`  Medium: ${result.summary.medium}`);
      console.log(`  Low: ${result.summary.low}`);
      console.log(`  Info: ${result.summary.info}`);

      if (result.results.length > 0) {
        console.log(`\n── Issues ─────────────────────────────────`);
        for (const issue of result.results) {
          console.log(`  [${issue.severity}] ${issue.category}: ${issue.description}`);
          if (issue.location.line) {
            console.log(`    Location: line ${issue.location.line}`);
          }
          if (issue.suggestion) {
            console.log(`    Suggestion: ${issue.suggestion}`);
          }
        }
      } else {
        console.log("\n  No issues found");
      }
    }

    printMetrics(startTime, result.summary.total, quiet, json);
  } catch (error) {
    const msg = json
      ? JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" })
      : `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
    console.error(msg);
    process.exit(1);
  }
}

// === CLI Parser ===

interface ParsedArgs {
  command: string;
  args: string[];
  options: Record<string, string | boolean>;
  flags: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
  // Input length validation to prevent DoS
  const totalLength = argv.join("").length;
  if (totalLength > 100000) {
    throw new Error("Input too long (max 100KB)");
  }

  const args: string[] = [];
  const options: Record<string, string | boolean> = {};
  const flags: string[] = [];

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];

    if (arg.startsWith("--")) {
      const flag = arg.slice(2);
      if (flag.includes("=")) {
        const [key, value] = flag.split("=", 2);
        options[key] = value;
      } else {
        // Check if next arg is a value
        if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) {
          options[flag] = argv[++i];
        } else {
          options[flag] = true;
        }
      }
    } else if (arg.startsWith("-") && arg.length > 1) {
      // Short flags
      for (const c of arg.slice(1)) {
        flags.push(c);
      }
    } else {
      args.push(arg);
    }
  }

  const command = args[0] || "help";
  const commandArgs = args.slice(1);

  return { command, args: commandArgs, options, flags };
}

// === Command Router ===

async function run(): Promise<void> {
  const argv = process.argv;
  const { command, args, options, flags } = parseArgs(argv);

  // Global flags
  const json = options.json === true || flags.includes("j");
  const quiet = options.quiet === true || flags.includes("q");

  // Handle version flag early
  if (options.version === true || flags.includes("v")) {
    if (json) {
      printJson({ version: VERSION });
    } else {
      console.log(`CodeShield CLI v${VERSION}`);
    }
    return;
  }

  // Handle help
  if (command === "help" || command === "--help" || command === "-h") {
    if (json) {
      printJson({
        commands: {
          "verify <file>": "Verify a file for code issues",
          "scan [directory]": "Scan a directory for code issues",
          "explain <file>": "Explain issues found in a file",
          "audit-deps [requirements.txt]": "Audit dependencies (stub)",
          "context save <name>": "Save current context",
          "context list": "List saved contexts",
          "context restore <name>": "Restore a context",
          "context delete <name>": "Delete a context",
          "test <file> [--status]": "Run Ollama-powered tests on code",
          "serve": "Start the MCP server",
          "--version": "Show version",
        },
        global_flags: {
          "--json": "Output as JSON",
          "--quiet": "Suppress metrics banner",
        },
      });
    } else {
      printBanner();
      console.log(`
Usage: codeshield <command> [options]

Commands:
  verify <file> [--language py|js|ts] [--json] [--quiet]
    Verify a file for code hallucination issues

  scan [directory] [--extensions .ts,.js] [--json] [--quiet]
    Scan a directory recursively for code issues

  explain <file> [--json] [--quiet]
    Explain issues found in a file

  audit-deps [requirements.txt] [--json]
    Audit dependencies for known issues (coming soon)

  context save <name> [--files "path1,path2"] [--notes "..."]
    Save current coding context

  context list [--json]
    List all saved contexts

  context restore <name>
    Restore a saved context

  context delete <name>
    Delete a saved context

  test <file> [--status] [--mode quick|standard|deep|audit] [--report bug|security|coverage|quality|recommendations]
    Run AI-powered Ollama tests on code. Use --status to check Ollama availability.
    Modes: quick (critical only), standard (normal), deep (full analysis), audit (security + quality)
    Reports: bug, security, coverage, quality, recommendations

  serve
    Start the CodeShield MCP server

Global Flags:
  --json     Output as JSON
  --quiet    Suppress metrics banner
  --version  Show version

Examples:
  codeshield verify myfile.py --language python
  codeshield scan ./src --extensions .ts,.js --json
  codeshield explain script.ts
  codeshield test myfile.ts --mode deep --report security
  codeshield test src/server.ts --mode audit
  codeshield test --status
  codeshield context save my-feature --files "a.py,b.py" --notes "WIP"
`);
    }
    return;
  }

  // Route commands
  switch (command) {
    case "verify":
      await handleVerify(args[0], options as unknown as VerifyOptions, flags);
      break;
    case "scan":
      await handleScan(args[0], options as unknown as ScanOptions, flags);
      break;
    case "explain":
      await handleExplain(args[0], options as unknown as ExplainOptions, flags);
      break;
    case "audit-deps":
      await handleAuditDeps(args[0], options as unknown as AuditDepsOptions, flags);
      break;
    case "context":
      switch (args[0]) {
        case "save":
          await handleContextSave(args[1], options as unknown as ContextSaveOptions, flags);
          break;
        case "list":
          await handleContextList(options as unknown as ContextListOptions, flags);
          break;
        case "restore":
          await handleContextRestore(args[1], options as unknown as ContextRestoreOptions, flags);
          break;
        case "delete":
          await handleContextDelete(args[1], options as unknown as ContextDeleteOptions, flags);
          break;
        default:
          console.error(json ? JSON.stringify({ error: "Unknown context command" }) : "Error: Unknown context command. Use 'codeshield help' for usage.");
          process.exit(1);
      }
      break;
    case "serve":
      await handleServe(args, flags);
      break;
    case "test":
      await handleTest(args[0], options as unknown as TestOptions, flags);
      break;
    default:
      console.error(json ? JSON.stringify({ error: `Unknown command: ${command}` }) : `Error: Unknown command: ${command}. Use 'codeshield help' for usage.`);
      process.exit(1);
  }
}

run().catch((error) => {
  console.error(`Fatal error: ${error}`);
  process.exit(1);
});
