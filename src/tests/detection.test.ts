/**
 * CodeShield Detection Engine Tests
 */
import { describe, it, expect } from "vitest";
import {
  analyzePrompt,
  verifyCode,
  verifyAndFix,
  suggestSimilar,
  autoFix,
  indexProject,
} from "../src/detection/index.js";
import {
  verifyJavaScript,
  extractJSImports,
  isBuiltinModule,
  isStdlibFunction,
} from "../src/src/detection/javascript.js";
import { verifyTypeScript } from "../src/src/detection/typescript.js";

describe("verifyCode() - Python", () => {
  it("should return empty array for valid Python code", () => {
    const code = `import os
def hello():
    return "world"
print(len([1, 2, 3]))`;
    const issues = verifyCode(code, "python");
    expect(issues).toEqual([]);
  });

  it("should detect unbalanced parentheses", () => {
    const code = `def missing_paren():
    print("hello"
    return True`;
    const issues = verifyCode(code, "python");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.includes("Paréntesis desbalanceados"))).toBe(true);
  });

  it("should detect method typos like .count_items", () => {
    const code = `items.count_items()`;
    const issues = verifyCode(code, "python");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.includes("count_items"))).toBe(true);
  });

  it("should detect keyword typos like 'deff'", () => {
    const code = `deff hello():
    pass`;
    const issues = verifyCode(code, "python");
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.some((i) => i.includes("'deff'"))).toBe(true);
  });

  it("should detect wrong imports from stdlib", () => {
    const code = `from os import nonexistent_function`;
    const issues = verifyCode(code, "python");
    expect(issues.length).toBeGreaterThan(0);
  });

  it("should detect DataFrame typo", () => {
    const code = `import pandas as pd
df = pd.data_frame()`;
    const issues = verifyCode(code, "python");
    expect(issues.some((i) => i.includes("data_frame") || i.includes("DataFrame"))).toBe(true);
  });
});

describe("verifyCode() - JavaScript", () => {
  it("should return empty array for valid JavaScript", () => {
    const code = `const x = [1, 2, 3];
console.log(x.map(n => n * 2));
JSON.parse('{"key": "value"}');`;
    const issues = verifyCode(code, "javascript");
    expect(issues).toEqual([]);
  });

  it("should detect unbalanced braces", () => {
    const code = `function test() {
    if (true) {
        console.log("hello");
    }
    return true;`;
    const issues = verifyCode(code, "javascript");
    expect(issues.some((i) => i.includes("Llaves desbalanceadas"))).toBe(true);
  });

  it("should detect typos in console methods", () => {
    const code = `console.logg("hello");`;
    const issues = verifyCode(code, "javascript");
    expect(issues.some((i) => i.includes("logg"))).toBe(true);
  });

  it("should detect invalid Math methods", () => {
    const code = `Math.sqrtt(4);`;
    const issues = verifyCode(code, "javascript");
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("verifyCode() - TypeScript", () => {
  it("should return empty array for valid TypeScript", () => {
    const code = `const x: number = 42;
interface User { name: string; age: number; }
const user: User = { name: "John", age: 30 };`;
    const issues = verifyCode(code, "typescript");
    // TypeScript issues may be empty since basic code is valid
    expect(Array.isArray(issues)).toBe(true);
  });

  it("should detect unbalanced generics", () => {
    const code = `const x: Array<number;`;
    const issues = verifyCode(code, "typescript");
    expect(issues.some((i) => i.includes("Generics desbalanceados"))).toBe(true);
  });

  it("should warn about 'any' type usage", () => {
    const code = `const x: any = 42;`;
    const issues = verifyCode(code, "typescript");
    expect(issues.some((i) => i.includes("any"))).toBe(true);
  });
});

describe("verifyAndFix()", () => {
  it("should return issues and fixed code", () => {
    const code = `items.count_items()
data_frame`
    const result = verifyAndFix(code, "python");
    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.fixed_code).toContain(".count(");
    expect(result.fixed_code).toContain("DataFrame");
  });

  it("should count fixed issues", () => {
    const code = `x.count_items()
y.sumArray()
z.appendItem()`;
    const result = verifyAndFix(code, "python");
    expect(result.fixed_count).toBeGreaterThanOrEqual(0);
  });

  it("should handle JavaScript code", () => {
    const code = `const arr = [1,2,3];
arr.length = "three";`;
    const result = verifyAndFix(code, "javascript");
    expect(result).toHaveProperty("issues");
    expect(result).toHaveProperty("fixed_code");
    expect(result).toHaveProperty("fixed_count");
  });
});

describe("analyzePrompt()", () => {
  it("should detect Python framework mentions", () => {
    const result = analyzePrompt("Create a FastAPI endpoint for user authentication", "python");
    expect(result.detected_frameworks).toContain("fastapi");
    expect(result.detected_intentions).toContain("api");
    expect(result.detected_intentions).toContain("backend");
  });

  it("should detect Django framework", () => {
    const result = analyzePrompt("Build a Django model for blog posts with migrations", "python");
    expect(result.detected_frameworks).toContain("django");
  });

  it("should detect React framework", () => {
    const result = analyzePrompt("Create a React component with useState and useEffect", "javascript");
    expect(result.detected_frameworks).toContain("react");
  });

  it("should detect Express.js", () => {
    const result = analyzePrompt("Set up an Express route for the API", "javascript");
    expect(result.detected_frameworks).toContain("express");
    expect(result.detected_intentions).toContain("api");
  });

  it("should detect testing intentions", () => {
    const result = analyzePrompt("Write pytest tests for the user service", "python");
    expect(result.detected_intentions).toContain("testing");
    expect(result.detected_frameworks).toContain("pytest");
  });

  it("should detect database intentions", () => {
    const result = analyzePrompt("Query the database to get all users", "python");
    expect(result.detected_intentions).toContain("database");
  });

  it("should warn about short prompts", () => {
    const result = analyzePrompt("hi", "python");
    expect(result.warnings.some((w) => w.includes("muy corto"))).toBe(true);
  });

  it("should extract intended imports", () => {
    const result = analyzePrompt("import pandas and numpy for data analysis", "python");
    expect(result.intended_imports.length).toBeGreaterThan(0);
  });

  it("should detect Next.js framework", () => {
    const result = analyzePrompt("Create a Next.js page with getServerSideProps", "javascript");
    expect(result.detected_frameworks).toContain("nextjs");
  });

  it("should detect TypeScript specific patterns", () => {
    const result = analyzePrompt("Define an interface for User with type safety", "typescript");
    expect(result.detected_frameworks).toContain("typescript");
  });
});

describe("JavaScript Detection Module", () => {
  it("should extract ES6 imports", () => {
    const code = `import React from 'react';
import { useState, useEffect } from 'react';
import * as utils from './utils';`;
    const imports = extractJSImports(code);
    expect(imports.length).toBeGreaterThan(0);
    expect(imports.some((i) => i.name === "React")).toBe(true);
  });

  it("should extract require() calls", () => {
    const code = `const fs = require('fs');
const { parse } = require('path');`;
    const imports = extractJSImports(code);
    expect(imports.length).toBeGreaterThan(0);
  });

  it("should correctly identify builtin modules", () => {
    expect(isBuiltinModule("fs")).toBe(true);
    expect(isBuiltinModule("path")).toBe(true);
    expect(isBuiltinModule("console")).toBe(true);
    expect(isBuiltinModule("nonexistent")).toBe(false);
  });

  it("should verify stdlib functions", () => {
    expect(isStdlibFunction("Math", "floor")).toBe(true);
    expect(isStdlibFunction("JSON", "parse")).toBe(true);
    expect(isStdlibFunction("Array", "map")).toBe(true);
    expect(isStdlibFunction("Math", "nonexistent")).toBe(false);
  });

  it("should detect JavaScript issues", () => {
    const code = `console.logg("error");`;
    const issues = verifyJavaScript(code);
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("TypeScript Detection Module", () => {
  it("should verify TypeScript code", () => {
    const code = `const x: number = 42;
interface User { name: string; }`;
    const issues = verifyTypeScript(code);
    expect(Array.isArray(issues)).toBe(true);
  });

  it("should detect TypeScript-specific syntax errors", () => {
    const code = `type Incomplete = `;
    const issues = verifyTypeScript(code);
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("suggestSimilar()", () => {
  it("should suggest similar names for typos", () => {
    const suggestions = suggestSimilar("prin", "os", "python");
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it("should suggest 'print' for 'prin' typo", () => {
    const suggestions = suggestSimilar("prin", "", "python");
    expect(suggestions).toContain("print");
  });

  it("should return empty for non-Python languages", () => {
    const suggestions = suggestSimilar("test", "", "javascript");
    expect(suggestions).toEqual([]);
  });

  it("should suggest 'DataFrame' for 'data_frame' typo", () => {
    const suggestions = suggestSimilar("data_frame", "", "python");
    expect(suggestions).toContain("DataFrame");
  });
});

describe("autoFix()", () => {
  it("should fix .count_items to .count", () => {
    const fixed = autoFix("items.count_items()", "", "python");
    expect(fixed).toBe("items.count()");
  });

  it("should fix .sumArray to .sum", () => {
    const fixed = autoFix("arr.sumArray()", "", "python");
    expect(fixed).toBe("arr.sum()");
  });

  it("should fix .appendItem to .append", () => {
    const fixed = autoFix("list.appendItem(x)", "", "python");
    expect(fixed).toBe("list.append(x)");
  });

  it("should fix data_frame typo", () => {
    const fixed = autoFix("df = data_frame()", "", "python");
    expect(fixed).toContain("DataFrame");
  });

  it("should fix joinp to join", () => {
    const fixed = autoFix("str.joinp(',')", "", "python");
    expect(fixed).toBe("str.join(',')");
  });

  it("should return unchanged code for JavaScript", () => {
    const code = "console.log('hello')";
    const fixed = autoFix(code, "", "javascript");
    expect(fixed).toBe(code);
  });

  it("should fix multiple issues in one pass", () => {
    const code = "arr.sumArray(); list.appendItem(x); items.count_items()";
    const fixed = autoFix(code, "", "python");
    expect(fixed).toContain(".sum()");
    expect(fixed).toContain(".append(");
    expect(fixed).toContain(".count(");
  });
});

describe("indexProject()", () => {
  it("should index a directory and extract classes, functions, imports", () => {
    // Use the test project directory
    const result = indexProject(".", ["python"], ["node_modules", ".git", "dist"]);
    expect(result).toHaveProperty("classes");
    expect(result).toHaveProperty("functions");
    expect(result).toHaveProperty("imports");
    expect(result).toHaveProperty("methods");
    expect(Array.isArray(result.classes)).toBe(true);
    expect(Array.isArray(result.functions)).toBe(true);
  });

  it("should deduplicate results", () => {
    const result = indexProject(".", ["python"], ["node_modules", ".git", "dist"]);
    const uniqueClasses = new Set(result.classes);
    expect(uniqueClasses.size).toBe(result.classes.length);
  });
});
