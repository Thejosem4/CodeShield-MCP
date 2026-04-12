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
  // --- 2023-2024 CVEs ---
  log4j: {
    versions: "<2.17",
    cve: "CVE-2021-44228",
    description: "Remote code execution (Log4Shell)",
    severity: "critical",
    recommendation: "Upgrade to >=2.17",
  },
  "log4j-core": {
    versions: "<2.17",
    cve: "CVE-2021-44228",
    description: "Remote code execution (Log4Shell)",
    severity: "critical",
    recommendation: "Upgrade to >=2.17",
  },
  "log4j-api": {
    versions: "<2.15",
    cve: "CVE-2021-45046",
    description: "DoS via unbounded LDAP lookup",
    severity: "critical",
    recommendation: "Upgrade to >=2.17",
  },
  postgresql: {
    versions: "<42.7.2",
    cve: "CVE-2024-1593",
    description: "SQL injection via pg_largeobject",
    severity: "high",
    recommendation: "Upgrade to >=42.7.2",
  },
  sqlalchemy: {
    versions: "<2.0.25",
    cve: "CVE-2023-30537",
    description: "Code execution via SQLAlchemy dialects",
    severity: "medium",
    recommendation: "Upgrade to >=2.0.25",
  },
  redis: {
    versions: "<5.0.14",
    cve: "CVE-2023-41053",
    description: "Redis bloom filter RCE",
    severity: "critical",
    recommendation: "Upgrade to >=5.0.14",
  },
  tensorflow: {
    versions: "<2.16.0",
    cve: "CVE-2024-2613",
    description: "Arbitrary memory write in TensorFlow",
    severity: "high",
    recommendation: "Upgrade to >=2.16.0",
  },
  "tensorflow-gpu": {
    versions: "<2.16.0",
    cve: "CVE-2024-2613",
    description: "Arbitrary memory write in TensorFlow",
    severity: "high",
    recommendation: "Upgrade to >=2.16.0",
  },
  numpy: {
    versions: "<1.26.4",
    cve: "CVE-2024-3733",
    description: "Buffer overflow in numpy.inner()",
    severity: "medium",
    recommendation: "Upgrade to >=1.26.4",
  },
  pillow: {
    versions: "<10.3.0",
    cve: "CVE-2024-28219",
    description: "Buffer overflow in ImageFont",
    severity: "high",
    recommendation: "Upgrade to >=10.3.0",
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

  const actual = parseVersionParts(version);
  const required = parseVersionParts(cveVersion);

  // If either version is invalid, we can't properly compare against the constraint
  if (!actual.isValid || !required.isValid) {
    return false;
  }

  // Pre-release versions are considered lower, so if we have a pre-release
  // and the CVE threshold is a release version, we're likely safe
  if (actual.hasPrerelease && !required.hasPrerelease) {
    // Pre-release is lower than release, so if cveOp is ">" or ">=" we might be safe
    // But if cveOp is "<" and the threshold is a release, we could still match
    // For safety, compare numeric parts only with < operator
    if (cveOperator === "<" || cveOperator === "<=") {
      // Compare numeric parts
      const maxLen = Math.max(actual.numbers.length, required.numbers.length);
      for (let i = 0; i < maxLen; i++) {
        const av = actual.numbers[i] ?? 0;
        const rv = required.numbers[i] ?? 0;
        if (av < rv) return true;  // vulnerable
        if (av > rv) return false; // safe
      }
      return cveOperator === "<=";
    }
  }

  // Compare version arrays
  const maxLen = Math.max(actual.numbers.length, required.numbers.length);
  for (let i = 0; i < maxLen; i++) {
    const av = actual.numbers[i] ?? 0;
    const rv = required.numbers[i] ?? 0;

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
 * Parse version string into numeric parts and pre-release info.
 * Handles versions like "1.2.3-beta", "2.0.0-alpha", "1.2.3rc1"
 * Returns: { numbers: number[], hasPrerelease: boolean }
 * NaN parts cause immediate return indicating invalid/incomplete version.
 */
function parseVersionParts(v: string): { numbers: number[]; hasPrerelease: boolean; isValid: boolean } {
  const parts = v.split(".");
  const numbers: number[] = [];

  for (const part of parts) {
    // Strip pre-release suffix (beta, alpha, rc, etc.) from last part only
    // e.g., "3-beta" -> "3", "2-alpha1" -> "2"
    const cleanPart = part.replace(/-(alpha|beta|rc|alpha\d|beta\d|rc\d)$/i, '');
    const num = parseInt(cleanPart, 10);

    if (isNaN(num)) {
      // If this part has non-numeric content (like "beta" or "alpha"), don't convert to 0
      // Check if there's actual numeric content before the suffix
      const numericMatch = part.match(/^(\d+)/);
      if (numericMatch) {
        numbers.push(parseInt(numericMatch[1], 10));
        // Has pre-release suffix after the number
        return { numbers, hasPrerelease: true, isValid: true };
      }
      // Pure non-numeric part (like "beta") - invalid version
      return { numbers, hasPrerelease: true, isValid: false };
    }
    numbers.push(num);
  }

  return { numbers, hasPrerelease: false, isValid: true };
}

/**
 * Compare two version strings.
 * Returns: negative if v1 < v2, positive if v1 > v2, 0 if equal.
 * Pre-release versions (with suffix like beta, alpha, rc) are considered lower than release.
 */
function compareVersions(v1: string, v2: string): number {
  const a = parseVersionParts(v1);
  const b = parseVersionParts(v2);

  // If either version is invalid/incomplete, we can't properly compare
  if (!a.isValid || !b.isValid) {
    // Treat as equal if we can't compare properly
    return 0;
  }

  // Pre-release versions are always lower than release versions
  // e.g., "1.2.3-beta" < "1.2.3"
  if (a.hasPrerelease && !b.hasPrerelease) return -1;
  if (!a.hasPrerelease && b.hasPrerelease) return 1;

  const maxLen = Math.max(a.numbers.length, b.numbers.length);
  for (let i = 0; i < maxLen; i++) {
    const av = a.numbers[i] ?? 0;
    const bv = b.numbers[i] ?? 0;
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
