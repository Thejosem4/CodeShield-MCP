/**
 * JavaScript Auto-Fix Tests
 */
import { describe, it, expect } from "vitest";
import { fixJavaScript, verifyJavaScript } from "./javascript.js";

describe("JavaScript Auto-Fix", () => {
  describe("fixJavaScript", () => {
    it("fixes console.logg to console.log", () => {
      const result = fixJavaScript("console.logg('test')");
      expect(result).toBe("console.log('test')");
    });

    it("fixes console.errror to console.error", () => {
      const result = fixJavaScript("console.errror('error')");
      expect(result).toBe("console.error('error')");
    });

    it("fixes console.warng to console.warn", () => {
      const result = fixJavaScript("console.warng('warning')");
      expect(result).toBe("console.warn('warning')");
    });

    it("fixes json.stringify typos", () => {
      // Note: JS_TYPOS uses lowercase 'json', so we use lowercase in test
      const result = fixJavaScript("json.stringfy(x)");
      expect(result).toBe("json.stringify(x)");
    });

    it("fixes json.parse typos", () => {
      const result = fixJavaScript("json.parsee(x)");
      expect(result).toBe("json.parse(x)");
    });

    it("fixes promise.then typos", () => {
      const result = fixJavaScript("promise.theen(x)");
      expect(result).toBe("promise.then(x)");
    });

    it("fixes promise.catch typos", () => {
      const result = fixJavaScript("promise.cathch(x)");
      expect(result).toBe("promise.catch(x)");
    });

    it("handles multiple fixes in same code", () => {
      const code = "console.logg('test'); json.stringfy(x)";
      const result = fixJavaScript(code);
      expect(result).toBe("console.log('test'); json.stringify(x)");
    });

    it("preserves correct code", () => {
      const code = "console.log('test'); JSON.stringify(x)";
      const result = fixJavaScript(code);
      expect(result).toBe("console.log('test'); JSON.stringify(x)");
    });
  });

  describe("verifyJavaScript", () => {
    it("detects console.logg as issue", () => {
      const issues = verifyJavaScript("console.logg('test')");
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0].error_type).toBe("typo");
    });

    it("detects unbalanced parentheses", () => {
      // Note: detection requires > 1 difference, so 3 open vs 1 close
      const issues = verifyJavaScript("func(((x)");  // 3 open, 1 close = diff of 2
      expect(issues.some(i => i.error_type === "syntax_error")).toBe(true);
    });
  });
});
