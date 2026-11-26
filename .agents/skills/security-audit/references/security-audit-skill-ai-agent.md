# Security audit — D10 AI / LLM & Agent Workflow Security

> Read when D10 is in scope (`full` or relevant model, prompt, agent, tool/MCP, retrieval, memory or coding-agent policy changes). Its last item, the AI-surface route, applies only when the audit target contains a model call, prompt, agent, tool/MCP, retrieval or eval.

- [ ] Coding-agent containment applies without an AI product: native sandbox/scoped credentials/egress, review of instruction/tool/hook/CI policy edits, and preserved session authority. Prompt wording/local hooks alone are not enforcement.
- [ ] Prompt injection: untrusted content (cloned repos, web pages, user docs, tool outputs) is treated as data — agent instructions never sourced from it
- [ ] MCP servers / agent tools: provenance known, configs reviewed; a malicious MCP server = arbitrary tool execution
- [ ] Agent credentials least-privilege: an agent that only reads code must not hold deploy/prod-DB credentials
- [ ] AI-generated code reviewed before execution — especially shell commands, install commands, and anything touching credentials
- [ ] Agent-run install commands go through the D4 vetting gate first — automation does NOT bypass vetting
- [ ] Validate model output at shell/query/HTML/path/URL/API sinks; enforce end-user/tool authorization outside the model.
- [ ] Prove retrieval/memory isolation, parameter-bound approvals, exfiltration/tool-abuse denial and cost/time/retry limits with negative/adversarial cases; retain model/prompt/tool/retrieval versions and disclose unexecuted evals.
- [ ] **AI surface?** Only if the audit scope contains a model call, prompt, agent, tool/MCP, retrieval or eval (see `node .claude/scripts/ai-signal-scan.cjs`): read `.claude/skills/shared/protocols/ai-engineering-gate.md`, apply its security clauses and route depth to `$ai-engineering-review`; otherwise skip this line.
