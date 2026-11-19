# Voiceover Manifest & Consumer Handoff Contract

Read this reference when authoring `cues.json` or `pronunciation.json`, or when wiring `voiceover` outputs into `remotion`, `html-export`, `edit-video`, or `e2e-demo`.

## Contents

- [Input schema: `cues.json`](#input-schema-cuesjson)
- [Pronunciation map: `pronunciation.json`](#pronunciation-map-pronunciationjson)
- [Output schema: `manifest.json`](#output-schema-manifestjson)
- [Consumer integration recipes](#consumer-integration-recipes)

## Input schema: `cues.json`

Accepts either an object `{ "language": "en", "cues": [...] }` or a bare JSON array `[...]`.

```json
{
  "language": "en",
  "cues": [
    {
      "id": "c01-intro",
      "chapter": "01-overview",
      "text": "Welcome to the CI/CD pipeline walkthrough.",
      "pauseAfter": 0.45
    },
    {
      "id": "c02-deploy",
      "chapter": "01-overview",
      "text": "Every merge triggers kubectl rollout checks.",
      "pauseAfter": 0.35,
      "speed": 1.0,
      "instructions": "Calm senior engineer explaining architecture clearly"
    }
  ]
}
```

| Field | Required | Rules |
| --- | --- | --- |
| `id` | yes | Unique slug matching `^[A-Za-z0-9][A-Za-z0-9._-]*$`, 1–80 chars, no `..` or path separators |
| `text` | yes | Non-empty string, up to 4,000 characters (split longer sections into multiple cues) |
| `pauseAfter` | no | Seconds of breath gap appended after the cue during mastering (`0`..`10`, default `0.35`) |
| `speed` | no | Per-cue speech speed multiplier (`0.5`..`2.0`, defaults to CLI `--speed`) |
| `chapter` | no | Optional grouping label preserved in `manifest.json` for visual chapter timelines |
| `instructions` | no | Optional speaking-style note (used by cloud models such as OpenAI `gpt-4o-mini-tts` and Gemini; hashed into cache key) |

Default run bound: 500 cues per invocation (`--max-cues` raises up to 5,000).

## Pronunciation map: `pronunciation.json`

Optional JSON object mapping exact technical terms to spoken forms. Keys starting with `_` are ignored (useful for comments). Longest terms match first; alphanumeric keys respect word boundaries so `"AI"` never rewrites `"WAIT"`.

```json
{
  "_note": "Spoken overrides applied before synthesis; changes invalidate only affected cue caches.",
  "CI/CD": "C I C D",
  "kubectl": "kube control",
  "LUFS": "luffs",
  "YAML": "yammel",
  "gRPC": "G R P C"
}
```

## Output schema: `manifest.json`

Written atomically to `<out>/manifest.json` after all cues synthesize (and master, unless `--no-master`).

```json
{
  "schemaVersion": 1,
  "generatedAt": "2026-11-19T14:30:00.000Z",
  "provider": "sherpa-onnx",
  "offline": true,
  "model": "kokoro-en-v0_19",
  "voice": "0",
  "language": "en",
  "masterFile": "voiceover.wav",
  "sampleRate": 48000,
  "duration": 9.84,
  "loudness": {
    "targetLufs": -14,
    "truePeakLimitDbtp": -1.5,
    "measuredLufs": -14.0,
    "measuredTruePeakDbtp": -2.1
  },
  "cues": [
    {
      "id": "c01-intro",
      "chapter": "01-overview",
      "text": "Welcome to the CI/CD pipeline walkthrough.",
      "spokenText": "Welcome to the C I C D pipeline walkthrough.",
      "hash": "a1b2c3d4e5f60718",
      "cached": false,
      "rawFile": "raw/c01-intro.a1b2c3d4e5f60718.wav",
      "normalizedFile": "normalized/c01-intro.wav",
      "start": 0,
      "end": 4.92,
      "duration": 4.92,
      "speechDuration": 4.47,
      "pauseAfter": 0.45
    }
  ]
}
```

Every path inside `manifest.json` uses forward slashes (`/`) relative to `<out>` so manifests remain portable across macOS and Windows.

## Consumer integration recipes

- **`html-export` (`--to=mp4`):**
  1. Read `manifest.json` in your animated HTML/JS scene so each visual beat advances at `cue.start` / `cue.end` on the controlled `window.__seek(ms)` clock, setting `window.__duration = Math.ceil(manifest.duration * 1000)`.
  2. Export MP4 with mastered audio:
     ```text
     node .claude/skills/html-export/scripts/export.cjs --to=mp4 tmp/explainer/scene.html --audio=tmp/voiceover/<run>/voiceover.wav --out=tmp/explainer/out
     ```
- **`remotion`:**
  1. Copy `manifest.json` and `voiceover.wav` (or `normalized/*.wav`) into `public/voiceover/<comp>/`.
  2. In `calculateMetadata`, compute `durationInFrames = Math.ceil(manifest.duration * fps)` and drive `<Sequence from={Math.round(cue.start * fps)} durationInFrames={Math.round(cue.duration * fps)}>` directly from `manifest.cues`.
- **`edit-video`:**
  - `edit-video` edits recorded footage (talking head / screen recordings). When replacing a full narration track on a rendered silent cut or preparing an audio-only narration before building visuals, generate `voiceover.wav` + `manifest.json` with `voiceover` first, then mux or drive the visual timeline from `manifest.cues`.
- **`e2e-demo`:**
  - Generate one cue per storyboard chapter in `cues.json`, align storyboard chapter holds to `manifest.cues` durations, and pass `--audio=tmp/voiceover/<run>/voiceover.wav` to `html-export`.
