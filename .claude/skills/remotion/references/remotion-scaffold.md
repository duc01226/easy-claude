# Remotion — scaffold a new project (Step 3.2)

> Read when Phase 1A finds no existing Remotion project (`PROJECT_EXISTS = false`) on the CREATE path. Paths beginning `refs/` resolve from the Remotion skill root, not from this reference directory.

## Step 3.2 — Scaffold New Project

**Only when no existing Remotion project found.**

#### 3.2.1 Bootstrap with create-video (preferred)

```bash
# Creates {PROJECT_PATH}/ with blank template (no Tailwind)
npx create-video@latest --yes --blank --no-tailwind {PROJECT_PATH}
cd {PROJECT_PATH}
npm install @remotion/transitions  # add transitions support
```

Replace generated `{source-root}/` with project structure below (keep `package.json` and `tsconfig.json` from scaffold).

#### Fallback (manual) — when `npx create-video` unavailable

```bash
mkdir -p {PROJECT_PATH}/{source-root}/compositions {PROJECT_PATH}/{source-root}/components {PROJECT_PATH}/{source-root}/utils
cd {PROJECT_PATH}
npm init -y
npm install remotion @remotion/cli @remotion/transitions react react-dom
npm install -D @types/react @types/react-dom typescript
```

#### Directory structure (both paths)

```
{PROJECT_PATH}/
  package.json          ← scripts: studio, render, still
  tsconfig.json
  {source-root}/
    index.ts            ← registerRoot
    Root.tsx            ← register compositions
    components/
      Shared.tsx        ← palette + reusable UI components
    utils/
      animations.ts     ← easeOut, staggeredEaseOut, pop, counter
    compositions/
      {CompositionName}.tsx
```

#### 3.2.3 Create `package.json` scripts (merge into existing after install)

```json
{
    "scripts": {
        "studio": "remotion studio",
        "render": "remotion render {CompositionId} out/video.mp4",
        "still": "remotion still {CompositionId} --frame=0 out/still.png"
    },
    "remotion": {
        "entryPoint": "{source-root}/index.ts"
    }
}
```

#### 3.2.4 Create `tsconfig.json`

```json
{
    "compilerOptions": {
        "target": "ES2020",
        "lib": ["dom", "ES2020"],
        "jsx": "react-jsx",
        "module": "commonjs",
        "moduleResolution": "node",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "outDir": "dist"
    },
    "include": ["src"]
}
```

#### 3.2.5 Create `{source-root}/index.ts`

```ts
import { registerRoot } from 'remotion';
import { Root } from './Root';
registerRoot(Root);
```

#### 3.2.6 Create `{source-root}/components/Shared.tsx`

> Copy from `refs/Shared.tsx` — do NOT implement from memory. Exports: `C` (palette), `ProgressBar`, `ChapterBadge`, `CodeBlock`, `Pill`, `AnimRow`. Always create; all scenes import from here.

#### 3.2.7 Create `{source-root}/utils/animations.ts`

> Copy from `refs/animations.ts` — do NOT implement from memory. Exports: `easeOut`, `easeInOut`, `pop`, `staggeredEaseOut`, `counter`.
