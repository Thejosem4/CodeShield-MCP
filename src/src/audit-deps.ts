/**
 * CodeShield Dependency Auditor
 *
 * Audita dependencias en requirements.txt contra database de CVEs conocidos.
 */

export interface AuditResult {
  package: string;
  severity: "low" | "medium" | "high" | "critical";
  cve?: string;
  description: string;
  recommendation: string;
  currentVersion?: string;
  operator?: string;
}

const CVE_DATABASE: Record<
  string,
  {
    versions: string;
    cve: string;
    description: string;
    severity: "low" | "medium" | "high" | "critical";
    recommendation: string;
  }
> = {
  pyyaml: {
    versions: "<5.4",
    cve: "CVE-2020-14343",
    description: "arbitrary code execution via yaml.load",
    severity: "critical",
    recommendation: "Upgrade to >=5.4",
  },
  requests: {
    versions: "<2.20",
    cve: "CVE-2018-18074",
    description: "session cookie leak",
    severity: "high",
    recommendation: "Upgrade to >=2.20",
  },
  django: {
    versions: "<3.2",
    cve: "EOL",
    description: "Security support ended",
    severity: "critical",
    recommendation: "Upgrade to >=3.2",
  },
  jinja2: {
    versions: "<2.11.3",
    cve: "CVE-2020-28493",
    description: "ReDOS",
    severity: "medium",
    recommendation: "Upgrade to >=2.11.3",
  },
  urllib3: {
    versions: "<1.26.5",
    cve: "CVE-2021-33503",
    description: "ReDOS",
    severity: "medium",
    recommendation: "Upgrade to >=1.26.5",
  },
  pillow: {
    versions: "<9.0",
    cve: "CVE-2022-45198",
    description: "Buffer overflow",
    severity: "high",
    recommendation: "Upgrade to >=9.0",
  },
  cryptography: {
    versions: "<3.3",
    cve: "CVE-2020-36242",
    description: "integer overflow",
    severity: "medium",
    recommendation: "Upgrade to >=3.3",
  },
  paramiko: {
    versions: "<2.10",
    cve: "CVE-2022-24302",
    description: "race condition",
    severity: "medium",
    recommendation: "Upgrade to >=2.10",
  },
  setuptools: {
    versions: "<65.5.1",
    cve: "CVE-2022-40897",
    description: "ReDOS",
    severity: "medium",
    recommendation: "Upgrade to >=65.5.1",
  },
  numpy: {
    versions: "<1.22",
    cve: "CVE-2021-41496",
    description: "Buffer overflow in numpy",
    severity: "high",
    recommendation: "Upgrade to >=1.22",
  },
  pandas: {
    versions: "<1.3",
    cve: "CVE-2022-33899",
    description: "Arbitrary code execution",
    severity: "critical",
    recommendation: "Upgrade to >=1.3",
  },
  openssl: {
    versions: "<1.1.1",
    cve: "Multiple",
    description: "Multiple vulnerabilities in OpenSSL",
    severity: "critical",
    recommendation: "Upgrade to >=1.1.1",
  },
  flask: {
    versions: "<2.0",
    cve: "CVE-2019-1010083",
    description: "Path traversal",
    severity: "high",
    recommendation: "Upgrade to >=2.0",
  },
};

/**
 * Parse a requirements.txt line to extract package name, operator and version.
 * Returns null for comments, empty lines, or lines without a valid package.
 */
function parseRequirementLine(
  line: string
): { name: string; operator: string; version: string } | null {
  const trimmed = line.trim();

  // Ignore empty lines
  if (!trimmed) {
    return null;
  }

  // Ignore comments
  if (trimmed.startsWith("#")) {
    return null;
  }

  // Match: package (>=|<=|==|!=|>|<|~=) version
  const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*([><=~!]+)\s*([^\s#;]+)/);
  if (!match) {
    // Try matching just package name without version
    const nameOnly = trimmed.match(/^([a-zA-Z0-9_-]+)/);
    if (!nameOnly) {
      return null;
    }
    return { name: nameOnly[1].toLowerCase(), operator: "", version: "" };
  }

  const name = match[1].toLowerCase();
  const operator = match[2];
  const version = match[3];

  return { name, operator, version };
}

/**
 * Compare version against a version constraint.
 * Handles simple semver-like comparisons like "<5.4", "<2.20", etc.
 * Returns true if version is VULNERABLE (matches the CVE constraint).
 */
function versionMatchesConstraint(
  version: string,
  constraint: string,
  requiredOperator?: string,
  requiredVersion?: string
): boolean {
  if (!version) {
    return false;
  }

  // Parse constraint like "<5.4" or ">=2.20"
  const constraintMatch = constraint.match(/^([<>]=?|~=?|=)\s*([^\s]+)/);
  if (!constraintMatch) {
    return false;
  }

  const cveOperator = constraintMatch[1] || "=";
  const cveVersion = constraintMatch[2];

  // If user specified >= operator and version meets/exceeds CVE threshold, it's SAFE
  if (requiredOperator === ">=" && requiredVersion) {
    const userVersionOk = compareVersions(requiredVersion, cveVersion) >= 0;
    if (userVersionOk) {
      return false; // Not vulnerable
    }
  }

  const parseVersion = (v: string): number[] =>
    v.split(".").map((part) => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });

  const actual = parseVersion(version);
  const required = parseVersion(cveVersion);

  // Compare version arrays
  for (let i = 0; i < Math.max(actual.length, required.length); i++) {
    const av = actual[i] ?? 0;
    const rv = required[i] ?? 0;

    if (av < rv) {
      return cveOperator !== "=" && cveOperator !== ">=";
    }
    if (av > rv) {
      return cveOperator === ">" || cveOperator === ">=";
    }
  }

  // Versions are equal
  return cveOperator === "=" || cveOperator === ">=";
}

/**
 * Compare two version strings.
 * Returns: negative if v1 < v2, positive if v1 > v2, 0 if equal.
 */
function compareVersions(v1: string, v2: string): number {
  const parseVersion = (v: string): number[] =>
    v.split(".").map((part) => {
      const num = parseInt(part, 10);
      return isNaN(num) ? 0 : num;
    });

  const a = parseVersion(v1);
  const b = parseVersion(v2);

  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av < bv) return -1;
    if (av > bv) return 1;
  }
  return 0;
}

/**
 * Audit dependencies in requirements.txt content against known CVE database.
 */
export function auditDependencies(requirementsContent: string): AuditResult[] {
  const results: AuditResult[] = [];
  const lines = requirementsContent.split("\n");

  for (const line of lines) {
    const parsed = parseRequirementLine(line);
    if (!parsed) {
      continue;
    }

    const cveEntry = CVE_DATABASE[parsed.name];
    if (!cveEntry) {
      continue;
    }

    // Check if version matches the vulnerable constraint
    if (versionMatchesConstraint(parsed.version, cveEntry.versions, parsed.operator, parsed.version)) {
      results.push({
        package: parsed.name,
        severity: cveEntry.severity,
        cve: cveEntry.cve,
        description: cveEntry.description,
        recommendation: cveEntry.recommendation,
        currentVersion: parsed.version,
        operator: parsed.operator,
      });
    }
  }

  return results;
}
