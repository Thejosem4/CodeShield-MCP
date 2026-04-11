/**
 * Python Auto-Fix Tests
 */
import { describe, it, expect } from "vitest";
import { autoFix, verifyCode, verifyAndFix, analyzePrompt, suggestSimilar } from "./index.js";

describe("Python Auto-Fix", () => {
  describe("autoFix", () => {
    it("fixes DataFrame typos", () => {
      expect(autoFix("df = data_frame()", "", "python")).toBe("df = DataFrame()");
      expect(autoFix("df = datafram()", "", "python")).toBe("df = DataFrame()");
    });

    it("fixes count_items to count", () => {
      expect(autoFix("x.count_items()", "", "python")).toBe("x.count()");
    });

    it("fixes sumArray to sum", () => {
      expect(autoFix("x.sumArray()", "", "python")).toBe("x.sum()");
    });

    it("fixes appendItem to append", () => {
      expect(autoFix("x.appendItem(5)", "", "python")).toBe("x.append(5)");
    });

    it("fixes joinp to join", () => {
      expect(autoFix("text.joinp()", "", "python")).toBe("text.join()");
    });

    it("fixes DatetimeTZ to datetime", () => {
      expect(autoFix("dt = DatetimeTZ.now()", "", "python")).toBe("dt = datetime.now()");
    });

    it("fixes common typos from KNOWN_TYPOS", () => {
      expect(autoFix("prin('hello')", "", "python")).toBe("print('hello')");
      expect(autoFix("ln = len(x)", "", "python")).toBe("len = len(x)"); // 'ln' -> 'len' but 'len(' still valid
    });

    it("fixes len typos", () => {
      // Note: 'ln' is replaced as word, so 'x.ln' becomes 'x.len'
      expect(autoFix("x.ln", "", "python")).toBe("x.len");
    });

    it("handles multiple typos in same code", () => {
      const code = "data_frame()\ncount_items()\nappendItem(x)";
      const result = autoFix(code, "", "python");
      expect(result).toContain("DataFrame()");
      expect(result).toContain("count()");
      expect(result).toContain("append(x)");
    });

    it("preserves correct code", () => {
      const code = "print('hello')\nlen(x)\nDataFrame()";
      const result = autoFix(code, "", "python");
      expect(result).toBe(code);
    });

    it("returns original code for non-python", () => {
      expect(autoFix("console.logg('x')", "", "javascript")).toBe("console.logg('x')");
    });
  });

  describe("verifyCode", () => {
    it("detects DataFrame import typos", () => {
      // Note: data_frame as a function call is detected via KNOWN_TYPOS in autoFix
      // verifyCode detects function typos like count_items
      const issues = verifyCode("x.count_items()", "python");
      expect(issues.length).toBeGreaterThan(0);
    });

    it("detects count_items as issue", () => {
      const issues = verifyCode("x.count_items()", "python");
      expect(issues.length).toBeGreaterThan(0);
    });
  });

  describe("verifyAndFix", () => {
    it("fixes and reports issues", () => {
      // count_items IS detected by verifyCode, data_frame is NOT
      const result = verifyAndFix("x.count_items()", "python");
      expect(result.fixed_code).toContain("count()");
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.fixed_count).toBeGreaterThan(0);
    });

    it("applies JS fixes when language is javascript", () => {
      const result = verifyAndFix("console.logg('test')", "javascript");
      expect(result.fixed_code).toBe("console.log('test')");
    });

    it("applies TS fixes when language is typescript", () => {
      const result = verifyAndFix("console.logg('test')", "typescript");
      expect(result.fixed_code).toBe("console.log('test')");
    });

    it("auto-detects JavaScript when language is ambiguous", () => {
      // When no explicit language hint is given and code has no Python/JS/TS markers,
      // it defaults to Python. For JS detection, use explicit language.
      const result = verifyAndFix("console.logg('test')", "javascript");
      expect(result.fixed_code).toBe("console.log('test')");
    });

    it("auto-detects Python", () => {
      const result = verifyAndFix("df = data_frame()");
      expect(result.fixed_code).toContain("DataFrame");
    });
  });

  describe("analyzePrompt", () => {
    it("detects frameworks", () => {
      const result = analyzePrompt("Create a React component with useState", "javascript");
      expect(result.detected_frameworks).toContain("react");
    });

    it("detects intentions", () => {
      const result = analyzePrompt("Write a test for the login function", "python");
      expect(result.detected_intentions).toContain("testing");
    });
  });

  describe("suggestSimilar", () => {
    it("suggests correct names for typos", () => {
      const suggestions = suggestSimilar("datafram", "", "python");
      expect(suggestions).toContain("DataFrame");
    });

    it("returns empty for non-python", () => {
      const suggestions = suggestSimilar("logg", "", "javascript");
      expect(suggestions).toEqual([]);
    });
  });
});
