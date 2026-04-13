/**
 * React Detection Engine
 *
 * Detects hallucinations in React code (JavaScript/TypeScript with React) by verifying:
 * - React hooks and their correct usage patterns
 * - React APIs and component patterns
 * - Common typos in React-specific identifiers
 * - Framework-specific patterns (Next.js, CRA)
 */

import type { Issue, ImportInfo } from "./index.js";

// React Stdlib - Hooks and their expected patterns
export const REACT_STDLIB: Record<string, Set<string>> = {
  // React Hooks
  useState: new Set([
    "setState", "set", "dispatch", "state",
    // Generic typing patterns
    "useState<T>", "useState<", "initialState",
  ]),
  useEffect: new Set([
    "cleanup", "dependency", "array", "return", "subscribe",
    // Effect patterns
    "useEffect(() =>", "useEffect(function",
  ]),
  useCallback: new Set([
    "memoized", "callback", "dependency", "array", "useCallback(() =>",
    "useCallback(function",
  ]),
  useMemo: new Set([
    "memoized", "value", "dependency", "array", "useMemo(() =>",
    "useMemo(function",
  ]),
  useRef: new Set([
    "current", "initial", "null", "useRef<", "useRef(",
    // Common ref patterns
    "useRef(null)", "useRef<HTML", "current.focus()", "current.value",
  ]),
  useContext: new Set([
    "context", "Consumer", "Provider", "useContext(",
  ]),
  useReducer: new Set([
    "state", "dispatch", "action", "reducer", "initialState", "useReducer(",
  ]),
  useLayoutEffect: new Set([
    "sync", "DOM", "layout", "cleanup", "useLayoutEffect(() =>",
    "useLayoutEffect(function",
  ]),
  useImperativeHandle: new Set([
    "ref", "handle", "imperative", "useImperativeHandle(",
  ]),
  useDebugValue: new Set([
    "label", "debug", "useDebugValue(",
  ]),
  // React Component Types
  Component: new Set([
    "render", "props", "state", "setState", "componentDidMount", "componentDidUpdate",
    "componentWillUnmount", "shouldComponentUpdate", "PureComponent",
  ]),
  PureComponent: new Set([
    "render", "props", "state", "shouldComponentUpdate", "memo",
  ]),
  FC: new Set([
    "children", "props", "FunctionComponent", "FC<", "React.FC(",
  ]),
  FunctionComponent: new Set([
    "children", "props", "FC", "React.FunctionComponent",
  ]),
  // React APIs
  createElement: new Set([
    "type", "props", "children", "React.createElement(",
  ]),
  cloneElement: new Set([
    "element", "props", "children", "React.cloneElement(",
  ]),
  // React Built-ins
  Fragment: new Set(["key", "children", "<>", "</>"]),
  StrictMode: new Set(["children", "React.StrictMode"]),
  Children: new Set(["map", "count", "forEach", "only", "toArray", "Children.map", "Children.forEach"]),
  Profiler: new Set(["id", "callback", "children", "onRender"]),
  Suspense: new Set(["fallback", "children", "lazy"]),
  lazy: new Set(["loader", "component", "React.lazy("]),
  // React DOM
  ReactDOM: new Set(["render", "hydrate", "unmountComponentAtNode", "createPortal"]),
  // JSX related
  JSX: new Set(["Element", "IntrinsicElement", "library", "jsx", "jsxs", " Fragment"]),
  // Next.js specific (partial coverage)
  Next: new Set([
    "getServerSideProps", "getStaticProps", "getStaticPaths", "GetServerSideProps",
    "GetStaticProps", "GetStaticPaths", "API", "Page",
  ]),
};

// React-specific typos
export const REACT_TYPOS: Record<string, Record<string, string>> = {
  // Hook typos
  useState: {
    useSatet: "useState",
    useestate: "useState",
    usestate: "useState",
    useState_: "useState",
    setSatte: "setState",
  },
  useEffect: {
    useffect: "useEffect",
    useffet: "useEffect",
    useEfeect: "useEffect",
    useEffect_: "useEffect",
  },
  useCallback: {
    useCallbak: "useCallback",
    usecallback: "useCallback",
    usecallbak: "useCallback",
    useCallback_: "useCallback",
    useballback: "useCallback",
  },
  useMemo: {
    usememo: "useMemo",
    useMemo: "useMemo",
    useMemo_: "useMemo",
    usemamo: "useMemo",
  },
  useRef: {
    useReff: "useRef",
    useref: "useRef",
    useRef_: "useRef",
    useref_: "useRef",
    useRref: "useRef",
  },
  useContext: {
    useContext: "useContext",
    usecontext: "useContext",
    useContext_: "useContext",
  },
  useReducer: {
    useReducer: "useReducer",
    usereducer: "useReducer",
    useReducer_: "useReducer",
    usereducer_: "useReducer",
  },
  useLayoutEffect: {
    useLayoutEffect: "useLayoutEffect",
    uselayouteffect: "useLayoutEffect",
    useLayout_: "useLayoutEffect",
  },
  // Component typos
  Component: {
    Compoent: "Component",
    componet: "Component",
    component: "Component",
    compoent: "Component",
  },
  // Prop/state typos
  props: {
    prosp: "props",
    propps: "props",
    propertys: "props",
    props_: "props",
  },
  state: {
    satte: "state",
    sttate: "state",
    State: "state",
    state_: "state",
  },
  // Method typos
  render: {
    rander: "render",
    rerender: "render",
    render_: "render",
    redner: "render",
  },
  // JSX typos
  Fragment: {
    Fragement: "Fragment",
    fragment: "Fragment",
    fraggment: "Fragment",
  },
  StrictMode: {
    Strictmode: "StrictMode",
    strictmode: "StrictMode",
    strict_mode: "StrictMode",
  },
  // Children typos
  Children: {
    childs: "Children",
    Childs: "Children",
    childrens: "Children",
  },
  // Context typos
  Provider: {
    provide: "Provider",
    Provder: "Provider",
  },
  Consumer: {
    consume: "Consumer",
    consummer: "Consumer",
  },
  // Hook patterns typos
  dependency: {
    dependancy: "dependency",
    dependecies: "dependencies",
    dependancies: "dependencies",
  },
};

// Keywords that indicate React code
const REACT_KEYWORDS = new Set([
  "useState", "useEffect", "useCallback", "useMemo", "useRef", "useContext",
  "useReducer", "useLayoutEffect", "useImperativeHandle", "useDebugValue",
  "useId", "useSyncExternalStore", "useTransition", "useDeferredValue",
  "Component", "PureComponent", "FC", "FunctionComponent",
  "createElement", "cloneElement", "Fragment", "StrictMode",
  "Children", "Profiler", "Suspense", "lazy",
  "props", "state", "render", "return", "jsx", "tsx",
  "React", "jsx", "tsx", "Provider", "Consumer",
]);

// Framework detection patterns
const FRAMEWORK_PATTERNS = {
  nextjs: [
    /getServerSideProps/,
    /getStaticProps/,
    /getStaticPaths/,
    /export\s+async\s+function\s+get/,
    /export\s+const\s+getServerSideProps/,
    /export\s+const\s+getStaticProps/,
    /pages[\\\/]api[\\\/]/,
    /app[\\\/]api[\\\/]/,
    /next[\\\/]config/,
  ],
  createReactApp: [
    /react-scripts/,
    /src[\\\/]index\.js/,
    /src[\\\/]App\.js/,
    /public[\\\/]index\.html/,
    /serviceWorker/,
  ],
  remix: [
    /loader/,
    /action/,
    /useLoaderData/,
    /useActionData/,
    /Form/,
  ],
  gatsby: [
    /gatsby-config/,
    /gatsby-node/,
    /gatsby-browser/,
    /useStaticQuery/,
  ],
};

/**
 * Parse React imports from code
 * Supports: import React from 'react', import { useState } from 'react', require('react')
 */
export function parseReactImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip non-import lines
    if (!trimmed.startsWith("import") && !trimmed.includes("require(")) {
      return;
    }

    // import React from 'react'
    const defaultMatch = trimmed.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultMatch) {
      imports.push({
        name: defaultMatch[1],
        alias: null,
        from_module: defaultMatch[2],
        is_from: true,
        line: idx + 1,
      });
      return;
    }

    // import { useState, useEffect } from 'react'
    const namedMatch = trimmed.match(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
    if (namedMatch) {
      const names = namedMatch[1].split(",").map((n) => n.trim().split(" as ")[0]);
      names.forEach((name) => {
        imports.push({
          name,
          alias: null,
          from_module: namedMatch[2],
          is_from: true,
          line: idx + 1,
        });
      });
      return;
    }

    // import * as React from 'react'
    const namespaceMatch = trimmed.match(/^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (namespaceMatch) {
      imports.push({
        name: namespaceMatch[1],
        alias: null,
        from_module: namespaceMatch[2],
        is_from: true,
        line: idx + 1,
      });
      return;
    }

    // import { useState as stateHook } from 'react'
    const aliasMatch = trimmed.match(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
    if (aliasMatch) {
      const specifiers = aliasMatch[1].split(",");
      specifiers.forEach((spec) => {
        const parts = spec.trim().split(/\s+as\s+/);
        if (parts.length === 2) {
          imports.push({
            name: parts[0].trim(),
            alias: parts[1].trim(),
            from_module: aliasMatch[2],
            is_from: true,
            line: idx + 1,
          });
        }
      });
      return;
    }

    // require('react') or const React = require('react')
    const requireMatch = trimmed.match(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (requireMatch) {
      imports.push({
        name: requireMatch[1],
        alias: null,
        from_module: null,
        is_from: false,
        line: idx + 1,
      });
    }
  });

  return imports;
}

/**
 * Detect typos in React code
 */
function detectReactTypos(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("/*") || line.trim().startsWith("*")) {
      return;
    }

    // Detect typos
    for (const [category, typos] of Object.entries(REACT_TYPOS)) {
      const typoMap = typos as Record<string, string>;
      for (const [typo, correction] of Object.entries(typoMap)) {
        // Create word boundary regex to avoid partial matches
        const escapedTypo = typo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\b${escapedTypo}\\b`);
        if (regex.test(line)) {
          issues.push({
            line: idx + 1,
            code_snippet: line.trim(),
            error_type: "typo",
            message: `Posible typo '${typo}' - ¿quisiste decir '${correction}'?`,
            suggestion: correction,
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Detect hook misuse patterns
 */
function detectHookMisuse(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // useState without proper generic or initial value
    const useStateMatch = trimmed.match(/useState\s*\(\s*\)/);
    if (useStateMatch && !trimmed.includes("useState<")) {
      // Check if this might need a generic type
      const prevLines = lines.slice(Math.max(0, idx - 3), idx);
      const context = prevLines.join(" ");
      if (!context.includes("useState<") && !context.includes("set")) {
        // Potential missing initial state
      }
    }

    // useEffect without dependency array warning patterns
    const useEffectMatch = trimmed.match(/useEffect\s*\(\s*\(\s*\)\s*=>/);
    if (useEffectMatch) {
      // Look for cleanup function without proper return
      const nextLines = lines.slice(idx, Math.min(lines.length, idx + 10));
      const effectBody = nextLines.join("");
      if (effectBody.includes("return") && !effectBody.match(/return\s*\(\s*\)\s*=>/)) {
        // Potential missing cleanup return
      }
    }

    // Missing dependency in useEffect
    const effectDepArray = trimmed.match(/useEffect\s*\([^)]+\)\s*,\s*\[\s*\]/);
    if (effectDepArray) {
      const prevLines = lines.slice(Math.max(0, idx - 5), idx);
      const prevCode = prevLines.join(" ");
      // Check if variables from outer scope are used without being in deps
      const outerVars = prevCode.match(/(?:const|let|var)\s+(\w+)/g);
      if (outerVars) {
        // This is a heuristic - would need AST for accurate detection
      }
    }
  });

  return issues;
}

/**
 * Detect invalid hook calls (not at top level)
 */
function detectInvalidHookCalls(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip if not a hook call
    if (!trimmed.includes("use") || !trimmed.includes("(")) {
      return;
    }

    // Check for hooks called inside conditions, loops, or nested functions
    const hookPattern = /(\w+)\s*\(\s*[^)]*\)\s*/;
    const match = trimmed.match(hookPattern);

    if (match && match[1].startsWith("use") && match[1] !== "use") {
      // Check context before this line
      let braceCount = 0;
      let parenCount = 0;
      let foundHook = false;

      // Count backwards to find if we're inside a condition
      for (let i = idx - 1; i >= 0; i--) {
        const prevLine = lines[i].trim();

        // Track nesting
        braceCount += (prevLine.match(/\{/g) || []).length - (prevLine.match(/\}/g) || []).length;
        parenCount += (prevLine.match(/\(/g) || []).length - (prevLine.match(/\)/g) || []).length;

        // Check for conditional keywords before hook is established at top level
        if (braceCount === 0 && parenCount === 0) {
          if (/^(if|else|for|while|switch)\s*\(/.test(prevLine)) {
            issues.push({
              line: idx + 1,
              code_snippet: trimmed,
              error_type: "invalid_hook_call",
              message: `Hook '${match[1]}' called inside a conditional or nested function. Hooks must be called at the top level.`,
              suggestion: null,
            });
          }
          break;
        }
      }
    }
  });

  return issues;
}

/**
 * Detect missing React import issues
 */
function detectMissingReactImport(code: string, imports: ImportInfo[]): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");
  const hasReactImport = imports.some(
    (imp) => imp.from_module === "react" || imp.name === "React"
  );

  if (!hasReactImport) {
    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Check for JSX elements without React imported
      if (/<\w+[^>]*>/.test(trimmed) && !trimmed.startsWith("//") && !trimmed.startsWith("/*")) {
        // JSX without React import is likely an issue
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "missing_import",
          message: "JSX detected but 'React' is not imported. Add 'import React from \"react\"' or use JSX transform.",
          suggestion: "import React from 'react'",
        });
        return; // Only report once
      }

      // Check for React.createElement without import
      if (/React\.(createElement|cloneElement|Fragment)/.test(trimmed)) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "missing_import",
          message: "React API used but React is not imported.",
          suggestion: "import React from 'react'",
        });
        return;
      }
    });
  }

  return issues;
}

/**
 * Detect framework-specific issues
 */
function detectFrameworkIssues(code: string): Issue[] {
  const issues: Issue[] = [];

  // Detect Next.js specific patterns
  for (const line of code.split("\n")) {
    const trimmed = line.trim();

    // getServerSideProps without async
    if (/export\s+(async\s+)?function\s+getServerSideProps/.test(trimmed)) {
      if (!trimmed.includes("async")) {
        issues.push({
          line: 0,
          code_snippet: trimmed,
          error_type: "framework_issue",
          message: "getServerSideProps should be an async function",
          suggestion: "export async function getServerSideProps",
        });
      }
    }

    // getStaticProps without async or wrong return
    if (/export\s+(async\s+)?function\s+getStaticProps/.test(trimmed)) {
      if (!trimmed.includes("async")) {
        issues.push({
          line: 0,
          code_snippet: trimmed,
          error_type: "framework_issue",
          message: "getStaticProps should be an async function",
          suggestion: "export async function getStaticProps",
        });
      }
    }

    // getStaticPaths without correct export
    if (/export\s+function\s+getStaticPaths/.test(trimmed)) {
      if (!code.includes("getStaticPaths") || !code.includes("paths:")) {
        // Basic check - getStaticPaths should return { paths: [], fallback: ... }
      }
    }

    // API route without proper handler
    if (/pages[\\\/]api[\\\/]/.test(code) || /app[\\\/]api[\\\/]/.test(code)) {
      // API routes need proper HTTP method handlers
    }
  }

  return issues;
}

/**
 * Detect React component issues
 */
function detectComponentIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Class component without render method
    if (/class\s+\w+\s+extends\s+(Component|PureComponent)/.test(trimmed)) {
      // Check if render method exists in the class
      const classBody = lines.slice(idx, idx + 50).join("\n");
      if (!/render\s*\(\s*\)\s*\{/.test(classBody) && !/render\s*\(\s*\)\s*=>/.test(classBody)) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "component_issue",
          message: "Class component missing render() method",
          suggestion: "Add render() { return ... }",
        });
      }
    }

    // Function component with capital letter (React convention)
    const funcCompMatch = trimmed.match(/^function\s+([a-z][a-zA-Z]*)\s*\(/);
    if (funcCompMatch && funcCompMatch[1][0] === funcCompMatch[1][0].toLowerCase()) {
      // React components should start with uppercase
      if (funcCompMatch[1] !== "of" && funcCompMatch[1] !== "if") {
        // heuristic to avoid false positives
      }
    }
  });

  return issues;
}

/**
 * Detect all issues in React code
 */
export function detectReactIssues(code: string): Issue[] {
  const issues: Issue[] = [];

  // Parse imports first
  const imports = parseReactImports(code);

  // Run all detectors
  issues.push(...detectReactTypos(code));
  issues.push(...detectInvalidHookCalls(code));
  issues.push(...detectMissingReactImport(code, imports));
  issues.push(...detectFrameworkIssues(code));
  issues.push(...detectComponentIssues(code));

  // Remove duplicate issues based on line and message
  const seen = new Set<string>();
  const uniqueIssues = issues.filter((issue) => {
    const key = `${issue.line}:${issue.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });

  return uniqueIssues;
}

/**
 * Detect if code is likely React
 */
export function isReactCode(code: string): boolean {
  // Check for React patterns
  const reactPatterns = [
    /useState|useEffect|useCallback|useMemo|useRef|useContext/,
    /import\s+.*\s+from\s+['"]react['"]/,
    /React\.(createElement|cloneElement|Fragment)/,
    /<\w+[^>]*>.*<\/\w+>/, // JSX patterns
    /class\s+\w+\s+extends\s+(Component|PureComponent)/,
    /export\s+(default\s+)?(const|function)\s+\w+.*:/, // Next.js patterns
  ];

  return reactPatterns.some((pattern) => pattern.test(code));
}

/**
 * Detect which framework is being used
 */
export function detectReactFramework(code: string): string | null {
  for (const [framework, patterns] of Object.entries(FRAMEWORK_PATTERNS)) {
    if (patterns.some((pattern) => pattern.test(code))) {
      return framework;
    }
  }
  return null;
}

/**
 * Verify React code - main entry point
 */
export function verifyReact(code: string): Issue[] {
  return detectReactIssues(code);
}
