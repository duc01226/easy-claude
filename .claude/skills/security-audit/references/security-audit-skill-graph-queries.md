# Security audit — graph intelligence queries (optional advice)

> Read when the change is high-risk (shared contract, many callers, cross-module/service/public flow) and `.code-graph/graph.db` exists. Graph output is a hint; verify every path by reading. Absence never blocks.

## Graph Intelligence — Security-Specific Queries (optional advice)

> For high-risk shared contracts, many callers or cross-module/service/public flows, `.code-graph/graph.db` may add callers, dependents and impacted tests. It can lag uncommitted/unindexed paths: verify every hint with grep/read. Skip low-risk/local changes; absence never blocks. These queries extend **Graph-Assisted Investigation** below:

- **Trace data flow to sensitive functions:** `python .claude/scripts/code_graph query callers_of <function> --json`
- **What does this function call?** `python .claude/scripts/code_graph query callees_of <function> --json`
- **Batch analysis:** `python .claude/scripts/code_graph batch-query file1 file2 --json`
- **Vulnerable-dependency reachability:** `callers_of` on the vulnerable API to prove (or rule out) exploitability

### Graph-Trace for Data Flow Analysis

Optionally, when a graph DB exists, `trace` can hint at data flow paths for security review (confirm every path by reading the code):

- `python .claude/scripts/code_graph trace <entry-point> --direction downstream --json` — trace data flow from input to all consumers (find where untrusted data travels)
- `python .claude/scripts/code_graph trace <sensitive-file> --direction upstream --json` — find all entry points that reach sensitive code
- **Blast-radius / exploitability reachability:** `python .claude/scripts/code_graph trace <vulnerable-file> --direction downstream --json` (or `/graph-code --mode=blast-radius`) — size the exploitability fan-out of a finding: which callers, consumers, and trust boundaries a vulnerable function reaches. A finding with a large reachable blast-radius is higher severity; one with no reachable untrusted entry point may be unexploitable.
- Trace reveals cross-service MESSAGE_BUS flows where data crosses trust boundaries
