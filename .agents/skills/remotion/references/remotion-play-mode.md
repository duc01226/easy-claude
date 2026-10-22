# Remotion — PLAY mode steps

> Read when Phase 0 classifies the prompt as PLAY (preview, open studio, start server, watch, launch, dev server). Paths beginning `refs/` resolve from the Remotion skill root.

## Phase 2: PLAY Mode

### Step 2.1 — Verify project exists

If `PROJECT_EXISTS = false`:

> "No Remotion project found. Run `$remotion <description>` to create one first."
> Exit.

### Step 2.2 — Find launch command

```bash
cat {PROJECT_PATH}/package.json | grep '"studio"'
# → use: npm run studio
# → fallback: npx remotion studio
```

### Step 2.3 — Start dev server (background)

```bash
cd {PROJECT_PATH} && npm run studio
```

> Remotion Studio launches at **http://localhost:3000**

Server runs in background. Report URL and composition IDs visible in `{source-root}/Root.tsx`.

### Step 2.4 — Optional: one-frame render check

```bash
npx remotion still [composition-id] --scale=0.25 --frame=30
# At 30fps, --frame=30 = one-second mark (zero-based)
```
