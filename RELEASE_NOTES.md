# v0.6.1

## Security fixes and tests

### Changes
- File locking in context-store.ts with stale lock detection
- Atomic writes with temp file + rename
- ReDoS prevention in detectTyposFromKnown (memoization + early exit)
- JSON.parse error handling in server.ts
- Cache DoS protection (MAX_CACHE_ENTRIES=100, LRU eviction)
- 14 new security tests
- CVE database updated (21 packages, 10 new CVEs 2023-2024)
- CLI improvements: path resolution, extension validation, name sanitization

### Test Results
- Build: SUCCESS
- Tests: 99 passed (5 test files)
- Security tests: 14 new tests