/**
 * CodeShield Entry Point
 *
 * Detects if running as CLI or MCP server based on command arguments.
 * - `codeshield serve` or stdio mode → MCP server
 * - Any other command → CLI
 */

const isMcpMode = process.argv.includes("serve");

if (isMcpMode) {
  // MCP Server mode
  import("./server.js").catch((err) => {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
  });
} else {
  // CLI mode
  import("./cli.js").catch((err) => {
    console.error("Failed to start CLI:", err);
    process.exit(1);
  });
}