/**
 * CodeShield CLI
 *
 * Command-line interface for CodeShield verification and code analysis.
 * Called when the binary is executed without the "serve" flag.
 */
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { verifyCode, autoFix, scanProject } from "./detection/index.js";
import {
  saveContext,
  listContexts,
  getContext,
  deleteContext,
} from "./context-store.js";

// Version - sync with package.json
const VERSION = "0.6.4";

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

interface InitOptions extends GlobalFlags {}

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

// ============================================
// INTERCEPTOR SCRIPT CONTENT
// ============================================

/**
 * Genera dinámicamente el contenido del script interceptor,
 * inyectando la ruta ABSOLUTA del CLI que ejecutó el comando init.
 *
 * ¿Por qué una función y no una constante?
 * Porque la ruta del binario solo se conoce en tiempo de ejecución (process.argv[1]).
 * Esto garantiza que el interceptor siempre use el mismo motor CodeShield que lo instaló,
 * independientemente de si 'codeshield' está en el $PATH global o no.
 *
 * @param cliPath - Ruta absoluta al JS del CLI con backslashes YA escapados para embeber en string
 */
function buildInterceptorContent(cliPath: string): string {
  return `#!/usr/bin/env node
/**
 * CodeShield Hook Interceptor
 * Auto-generated by: codeshield init
 * CLI path (absolute): ${cliPath}
 * DO NOT EDIT MANUALLY.
 *
 * Acts as a middleware guardian between the LLM and disk writes.
 * Invoked by the client's BeforeTool event on write_file / replace / bash.
 */
'use strict';

const { execSync } = require('child_process');
const chunks = [];

process.stdin.on('data', (chunk) => chunks.push(chunk));
process.stdin.on('end', () => {
  const input = Buffer.concat(chunks).toString('utf-8');

  let payload;
  try {
    payload = JSON.parse(input);
  } catch {
    // Not JSON -- pass through (not a code write event)
    process.exit(0);
  }

  // Extract code content from common hook payload shapes
  const code =
    payload?.params?.content ||
    payload?.content ||
    payload?.code ||
    payload?.input ||
    '';

  if (!code || typeof code !== 'string' || code.length < 10) {
    process.exit(0); // No substantial code -- pass through
  }

  try {
    // Use the absolute CLI path baked in at install time.
    // This works even if 'codeshield' is NOT in the global PATH.
    const result = execSync(
      'node "${cliPath}" verify --json --stdin',
      { input: code, timeout: 10000 }
    ).toString();

    const parsed = JSON.parse(result);
    const hasCritical =
      (parsed.issues || []).some((i) => i.severity === 'critical') ||
      (parsed.triage?.summary?.critical ?? 0) > 0;

    if (hasCritical) {
      process.stderr.write(JSON.stringify({
        blocked: true,
        reason: 'CodeShield detected CRITICAL issues that would corrupt the file.',
        critical_count: parsed.triage?.summary?.critical ||
          (parsed.issues || []).filter((i) => i.severity === 'critical').length,
        details: parsed,
      }, null, 2));
      process.exit(1); // BLOCK the write
    }
  } catch {
    // If codeshield is unavailable or times out -- fail open (don't block)
    process.exit(0);
  }

  process.exit(0); // APPROVE the write
});
`;
}

// ============================================
// INIT COMMAND
// ============================================

async function handleInit(
  _options: InitOptions,
  _flags: string[]
): Promise<void> {
  const homeDir = os.homedir();

  // === Resolver la ruta ABSOLUTA del CLI en tiempo de ejecución ===
  // process.argv[1] es el archivo JS que Node.js está ejecutando actualmente.
  // En Windows los backslashes deben escaparse para embeber la ruta en el template literal del interceptor.
  const rawCliPath = process.argv[1] ?? "";
  const cliPath = process.platform === "win32"
    ? rawCliPath.replace(/\\/g, "\\\\") // "C:\path\to\index.js" -> "C:\\path\\to\\index.js"
    : rawCliPath;

  if (!rawCliPath) {
    console.error("✗ No se pudo determinar la ruta del CLI (process.argv[1] vacío).");
    process.exit(1);
  }

  // Generar el script interceptor con la ruta absoluta inyectada
  const interceptorContent = buildInterceptorContent(cliPath);

  // Known hook directories for supported clients
  const hookTargets: { client: string; hooksDir: string }[] = [
    {
      client: "Gemini CLI",
      hooksDir: path.join(homeDir, ".gemini", "hooks"),
    },
    {
      client: "Claude Code",
      hooksDir: path.join(homeDir, ".claude", "hooks"),
    },
  ];

  let anyInstalled = false;

  for (const target of hookTargets) {
    const { client, hooksDir } = target;
    const hooksJson = path.join(hooksDir, "hooks.json");
    const interceptorPath = path.join(hooksDir, "codeshield-interceptor.js");

    console.log(`\n[CodeShield Init] Checking ${client}...`);
    console.log(`  Hooks directory: ${hooksDir}`);

    // Create hooks directory if it doesn't exist
    if (!fs.existsSync(hooksDir)) {
      try {
        fs.mkdirSync(hooksDir, { recursive: true });
        console.log(`  ✓ Created hooks directory`);
      } catch (err) {
        console.error(`  ✗ Could not create hooks directory: ${err}`);
        continue;
      }
    }

    // Write the interceptor script
    try {
      fs.writeFileSync(interceptorPath, interceptorContent, { mode: 0o755 });
      console.log(`  ✓ Interceptor written: ${interceptorPath}`);
    } catch (err) {
      console.error(`  ✗ Could not write interceptor: ${err}`);
      continue;
    }

    // Read or initialize hooks.json
    let hooksConfig: Record<string, unknown> = {};
    if (fs.existsSync(hooksJson)) {
      try {
        const existing = fs.readFileSync(hooksJson, "utf-8");
        // Backup before modifying
        fs.writeFileSync(hooksJson + ".codeshield.bak", existing);
        hooksConfig = JSON.parse(existing) as Record<string, unknown>;
        console.log(`  ✓ Backed up existing hooks.json → hooks.json.codeshield.bak`);
      } catch {
        console.warn(`  ⚠ Could not read existing hooks.json — will create new one`);
        hooksConfig = {};
      }
    }

    // Inject our interceptor into BeforeTool hooks
    const HOOK_ENTRY = {
      name: "codeshield-interceptor",
      command: `node ${interceptorPath}`,
      description: "CodeShield: Blocks LLM writes that contain CRITICAL code errors",
      events: ["BeforeTool"],
      tools: ["write_file", "replace", "replace_file_content", "create_file"],
    };

    // Normalize hooks array (support both array and object shapes)
    if (!Array.isArray(hooksConfig.hooks)) {
      hooksConfig.hooks = [];
    }
    const existingHooks = hooksConfig.hooks as Record<string, unknown>[];

    // Avoid duplicate entries
    const alreadyExists = existingHooks.some(
      (h) => h.name === "codeshield-interceptor"
    );

    if (!alreadyExists) {
      existingHooks.push(HOOK_ENTRY);
      hooksConfig.hooks = existingHooks;
    } else {
      // Update existing entry
      const idx = existingHooks.findIndex(
        (h) => h.name === "codeshield-interceptor"
      );
      existingHooks[idx] = HOOK_ENTRY;
      console.log(`  ✓ Updated existing CodeShield hook entry`);
    }

    try {
      fs.writeFileSync(hooksJson, JSON.stringify(hooksConfig, null, 2));
      console.log(`  ✓ hooks.json updated: ${hooksJson}`);
      anyInstalled = true;
    } catch (err) {
      console.error(`  ✗ Could not write hooks.json: ${err}`);
    }
  }

  console.log("");
  if (anyInstalled) {
    console.log("✅ CodeShield Init complete!");
    console.log(
      "   The interceptor will now block LLM writes containing CRITICAL code errors."
    );
    console.log(
      "   Restart your AI client to activate the hooks."
    );
  } else {
    console.log("⚠  No hook clients were configured. Check errors above.");
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
          "audit-deps [requirements.txt]": "Audit dependencies",
          "context save <name>": "Save current context",
          "context list": "List saved contexts",
          "context restore <name>": "Restore a context",
          "context delete <name>": "Delete a context",
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

  init
    Install CodeShield hooks into Gemini CLI and Claude Code.
    Automatically intercepts LLM writes and blocks CRITICAL code errors.

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
  codeshield context save my-feature --files "a.py,b.py" --notes "WIP"
  codeshield init
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
    case "init":
      await handleInit(options as unknown as InitOptions, flags);
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
