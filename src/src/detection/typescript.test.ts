/**
 * TypeScript Auto-Fix Tests
 */
import { describe, it, expect } from "vitest";
import { fixTypeScript, verifyTypeScript } from "./typescript.js";

describe("TypeScript Auto-Fix", () => {
  describe("fixTypeScript", () => {
    it("fixes console.logg to console.log (inherits JS fix)", () => {
      const result = fixTypeScript("console.logg('test')");
      expect(result).toBe("console.log('test')");
    });

    it("fixes console.errror to console.error", () => {
      const result = fixTypeScript("console.errror('error')");
      expect(result).toBe("console.error('error')");
    });

    it("handles TypeScript code with JS typos", () => {
      const code = `const x: string = "hello";
console.logg(x);`;
      const result = fixTypeScript(code);
      expect(result).toContain("console.log(x)");
    });

    it("preserves TypeScript syntax", () => {
      const code = `interface User {
  name: string;
  age: number;
}`;
      const result = fixTypeScript(code);
      expect(result).toBe(code);
    });
  });

  describe("verifyTypeScript", () => {
    it("detects TypeScript-specific : any warning", () => {
      const issues = verifyTypeScript("const x: any = 5;");
      expect(issues.some(i => i.error_type === "typescript_warning")).toBe(true);
    });

    it("detects JS typos as issues", () => {
      const issues = verifyTypeScript("console.logg('test')");
      expect(issues.some(i => i.error_type === "typo")).toBe(true);
    });
  });
});
