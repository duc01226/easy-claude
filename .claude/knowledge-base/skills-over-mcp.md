---
id: skills-over-mcp
title: Skills over MCP — portable workflows with verified lazy loading
description: Use when planning or reviewing remote agents, MCP tools, shared agent workflows, or on-demand skill and tool discovery
kind: technology
review: unreviewed
reviewed: 2026-11-28
sources:
  - kind: web-address
    ref: https://modelcontextprotocol.io/extensions/skills/overview
  - kind: web-address
    ref: https://skills.extensions.modelcontextprotocol.io/specification/beta/skills
  - kind: web-address
    ref: https://github.com/modelcontextprotocol/ext-skills
  - kind: web-address
    ref: https://gofastmcp.com/docs/servers/skills
  - kind: web-address
    ref: https://claude.com/resources/articles/skills-over-mcp-tasks-and-more
  - kind: web-address
    ref: https://www.anthropic.com/research/advanced-tool-use
  - kind: web-address
    ref: https://agentskills.io/client-implementation/adding-skills-support
  - kind: web-address
    ref: https://py.sdk.modelcontextprotocol.io/v2/api/mcp/client/extensions/skills/
triggers:
  skills: [ai-engineering-review, tech-stack-research]
  agents: [ai-engineering-reviewer, researcher]
---

## Digest

Skills over MCP co-locates workflow guidance with a service's tools. It is an option for remote agents and workflows shared across runtimes; verified client support is a prerequisite. The host discovers metadata, loads the selected SKILL.md, and reads supporting files only when needed. Resource transport alone neither activates a skill nor grants authority. Remote content remains untrusted; manifests establish consistency, not publisher trust. Skill caching, model prompt caching and deferred tool-schema loading solve different costs. Compare local packaged skills and fixed workflows; measure task success, tokens and latency before claiming a saving.

## KB-SMCP-1 Status and evidence

Checked 2026-11-28: SEP-2640 is Final; the extension publication is beta, targeting base protocol 2026-07-28. These statuses differ. [Official repository](https://github.com/modelcontextprotocol/ext-skills), [overview](https://modelcontextprotocol.io/extensions/skills/overview).

Anthropic announced Claude/Claude Code public beta on 2026-11-24; its rollout is product-specific. The Python v2 SDK exposes opt-in catalog methods. Neither observation establishes support in Codex, Copilot, every SDK version, or a deployed host. Verify the exact host, server, SDK, protocol revision and approval behavior before designing around them. [Announcement](https://claude.com/resources/articles/skills-over-mcp-tasks-and-more), [SDK](https://py.sdk.modelcontextprotocol.io/v2/api/mcp/client/extensions/skills/).

## KB-SMCP-2 When to offer it

Design inference: consider this option for service-owned multi-tool procedures, workflows duplicated across runtimes, or remote workers needing centrally maintained account-specific playbooks. Co-location reduces distribution work; it adds a remote dependency, host integration and content-update risk. [Service example](https://gofastmcp.com/docs/servers/skills), [client integration alternatives](https://agentskills.io/client-implementation/adding-skills-support).

| Option | Good fit | Cost or limit |
| --- | --- | --- |
| Local or packaged Agent Skills | Offline work, pinned builds, small stable procedures | Distribution/version sync across hosts |
| Skills over MCP | Service-owned, changing or caller-specific workflows | Capability support, network, cache and trust lifecycle |
| Server instructions or MCP prompts/resources | Short guidance or explicitly selected templates | Not equivalent to host skill activation |
| Fixed orchestration in application code | Mandatory ordering, authorization, transactions | Less model-selected flexibility |

The table is engineering judgment, not a protocol requirement. Skills explain procedures; code owns mandatory business invariants and tool authorization. Absence of remote skills is not a defect.

## KB-SMCP-3 Discovery and loading

The server advertises `resources` and `io.modelcontextprotocol/skills`; clients observe support before `skills/list` or `skills/get`. A listed entry already supplies frontmatter and a complete manifest, or `resources: "dynamic"`. A known URI can go directly to `skills/get`; listing is not mandatory. [Overview](https://modelcontextprotocol.io/extensions/skills/overview), [SDK methods](https://py.sdk.modelcontextprotocol.io/v2/api/mcp/client/extensions/skills/).

Host path: discover/select → retain the entry and required approval → `resources/read` SKILL.md → verify size, SHA-256 and matching frontmatter → activate through the host loader → read supporting files on demand against that held manifest. A generic resource read does not activate a skill. Directory reads require advertised `directoryRead`. Verification failure stops loading. [Extension](https://skills.extensions.modelcontextprotocol.io/specification/beta/skills), [FastMCP client responsibilities](https://gofastmcp.com/docs/servers/skills).

## KB-SMCP-4 Trust and execution

Remote skills have greater host-side execution risk than ordinary remote tool calls. Host-side execution requires explicit per-skill approval; remote `allowed-tools` cannot silently grant access. Resource reads stay origin-bound; cross-origin reads need explicit per-call approval naming both servers. Nested skill activation has separate consent. [Security considerations](https://skills.extensions.modelcontextprotocol.io/specification/beta/skills).

Design controls: identify skills by host-assigned server identity plus URI, show provenance, prevent local-name shadowing, isolate any disk cache from automatic local-skill discovery, and validate paths before materializing files. Hash agreement cannot establish publisher trust. Enforcement belongs in the host/tool boundary, not skill prose. [Extension security](https://skills.extensions.modelcontextprotocol.io/specification/beta/skills), [client trust guidance](https://agentskills.io/client-implementation/adding-skills-support).

## KB-SMCP-5 Caching, updates and dynamic catalogs

`ttlMs` and `cacheScope` describe freshness/sharing, not integrity. Persisted approval binds to the manifest's URI/digest set and is revoked when that set changes. `resources: "dynamic"` cannot support content-bound approval; a host may decline it. [Extension](https://skills.extensions.modelcontextprotocol.io/specification/beta/skills).

Engineering design: scope caches to origin, skill URI, authenticated principal/tenant, authorization context and manifest identity; honor expiry, revocation and private responses. On mismatch, stop, refresh metadata and obtain renewed approval where required; use bounded recovery. Never mix files from different approved versions. Specify offline behavior, rollback and deletion. Runtime-generated catalogs can still return stable hashed manifests per request: generation is not synonymous with `resources: "dynamic"`. FastMCP demonstrates caller-specific catalogs and manifest-backed storage. [Providers](https://gofastmcp.com/docs/servers/skills).

## KB-SMCP-6 Context and tool search

Progressive disclosure loads catalog descriptions, selected instructions, then needed references. Downloaded/cached bytes consume model tokens only when placed in context. A large catalog still has a cost; host filtering/search and bounded discovery need evaluation. [Agent Skills integration](https://agentskills.io/client-implementation/adding-skills-support), [MCP overview](https://modelcontextprotocol.io/extensions/skills/overview).

Tool search separately defers tool schemas. Remote skills do not automatically remove eagerly loaded tool definitions. The combination can help large, sparsely used catalogs but adds search/read latency and missed-selection risk. Anthropic's reported tool-search savings are vendor measurements, not a Skills-over-MCP guarantee. Local skill caches reduce retrieval work; provider prompt caching reduces repeated-prefix processing; neither is a context-window expansion. [Tool-search trade-offs](https://www.anthropic.com/research/advanced-tool-use).

## KB-SMCP-7 Implementation seams

FastMCP documentation currently marks the feature new in 4.2.0 and shows `Skill`, `SkillCatalogProvider`, `SkillsDirectoryProvider` and `SkillManifestProvider`. Verify installed APIs; older tutorials may use different providers. A custom cloud agent still needs discovery, selection, a verified loader and permission enforcement; catalog SDK methods alone are insufficient. [FastMCP](https://gofastmcp.com/docs/servers/skills), [client lifecycle](https://agentskills.io/client-implementation/adding-skills-support).

Design inference: keep one skill content owner; isolate volatile SDK/transport behavior behind the project's existing integration seam. Avoid a new abstraction until a real replacement or second consumer warrants it. Keep authorization at both catalog visibility and file/tool access; describe degraded behavior when the origin is unavailable.

## KB-SMCP-8 Evaluation and revisit triggers

Proposed acceptance cases: supported/unsupported capability; known-URI and paginated discovery; correct skill selection and irrelevant-task non-activation; malformed frontmatter; wrong size/hash; unlisted file; changed approval; same-name origins; nested consent; cross-origin reads; local-execution denial; tenant/cache isolation; expiry/revocation; offline behavior; bounded oversized/malicious content. These test obligations are engineering synthesis, not tests already run.

Compare no-skill/local-skill and eager/deferred-tool baselines on the same tasks. Record outcome quality, selection recall, loaded context tokens, cold/warm fetch latency, cost and denied side effects. Revisit after host/SDK/protocol or manifest changes. Unavailable runtime tests remain NOT RUN. [Progressive-disclosure lifecycle](https://agentskills.io/client-implementation/adding-skills-support), [tool-search evaluation and trade-offs](https://www.anthropic.com/research/advanced-tool-use).
