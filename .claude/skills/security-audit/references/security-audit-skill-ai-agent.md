# Security audit — D10 AI / LLM & Agent Workflow Security

> Read when D10 is in scope (`full`), or the audit target contains a model call, prompt, agent, tool/MCP, retrieval or eval.

- [ ] Prompt injection: untrusted content (cloned repos, web pages, user docs, tool outputs) is treated as data — agent instructions never sourced from it
- [ ] MCP servers / agent tools: provenance known, configs reviewed; a malicious MCP server = arbitrary tool execution
- [ ] Agent credentials least-privilege: an agent that only reads code must not hold deploy/prod-DB credentials
- [ ] AI-generated code reviewed before execution — especially shell commands, install commands, and anything touching credentials
- [ ] Agent-run install commands go through the D4 vetting gate first — automation does NOT bypass vetting
- [ ] LLM outputs never piped to shell/eval unsanitized
- [ ] **AI surface?** Only if the audit scope contains a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md`, apply its security clauses and route depth to `/ai-engineering-review`; otherwise skip this line.
