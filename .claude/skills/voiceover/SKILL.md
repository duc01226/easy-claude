---
name: voiceover
version: 1.0.0
description: '[Document Processing] Use when generating neural voiceover narration from a script or cues for videos, explainers, demos, or re-voicing existing cuts on macOS and Windows. Free offline sherpa-onnx default (Kokoro EN + Piper multilingual/Vietnamese) plus optional cloud studio providers; exports mastered WAV and manifest.json.'
argument-hint: '<cues.json | script> [--provider sherpa-onnx|openrouter|openai|gemini|elevenlabs] [--out <dir>]'
disable-model-invocation: false
---

<!-- PROTOCOL-GUIDES:START -->

> **Protocol guides** — Apply each protocol only when its read-when condition holds. If a protocol's text is not in your context, read its file below before you act on it.

- `output-quality-principles` — Readable guidance and verified contents for long skill/doc files; writing, updating or auditing a skill or reference document, or another Markdown artifact over 200 lines → .claude/skills/shared/protocols/output-quality-principles.md

<!-- PROTOCOL-GUIDES:END -->

## Quick Summary

**Goal:** Turn a written script or cue list into natural, broadcast-mastered neural voiceover audio (`48 kHz`, `-14 LUFS`, `-1.5 dBTP`) and an exact timing `manifest.json` on both **macOS and Windows**, free and offline by default.

**Summary:** Check local capabilities (`doctor`) → build `cues.json` + optional `pronunciation.json` → synthesize and inspect a **1-cue audition** before full synthesis → batch synthesize (content-hash cached) + master (`voiceover.wav` + `manifest.json`) → hand off to `edit-video`, `remotion`, `html-export --to=mp4 --audio=...`, or `e2e-demo`.

**Workflow:** `doctor` → `cues.json` + `pronunciation.json` → `audition` (1 cue) → `synthesize` + `master` → verify manifest and loudness → hand off audio + timestamps to visual consumer.

**Key Rules:**

- **Never silently fall back to robotic OS TTS** (`/usr/bin/say` on macOS, SAPI5 `System.Speech` on Windows) or unofficial scrapers (`edge-tts`). Missing setup exits `3` with exact per-OS commands.
- **Free offline neural is the default (`sherpa-onnx`, Apache-2.0):** nothing leaves the machine unless the user explicitly selects a cloud provider (`openrouter`, `openai`, `gemini`, `elevenlabs`).
- **Audition 1 cue before batch synthesis:** verify voice quality, speed, and technical acronym pronunciation on a ~5-second sample before synthesizing 50+ cues or rendering video.
- **Nothing is auto-installed:** `doctor`, `audition`, and `synthesize` never install Python packages, `ffmpeg`, or download models on the user's behalf.

## Contents

- [Quick Summary](#quick-summary)
- [Setup (opt-in, macOS and Windows)](#setup-opt-in-macos-and-windows)
- [Workflow](#workflow)
- [Providers and languages](#providers-and-languages)
- [Exit codes](#exit-codes)
- [Handoff to video skills](#handoff-to-video-skills)
- [Hard rules](#hard-rules)
- [Resources](#resources)
- [Closing Reminders](#closing-reminders)

## Setup (opt-in, macOS and Windows)

Run every command from the project root using Node.js (`>=18`, platform-neutral on macOS, Windows, and Linux):

```text
node .claude/skills/voiceover/scripts/voiceover.cjs doctor
```

**Free offline neural setup (`sherpa-onnx`, Apache-2.0 — zero API key, 100% local):**

```sh
# macOS / Linux
python3 -m venv .claude/skills/voiceover/scripts/.venv
.claude/skills/voiceover/scripts/.venv/bin/python -m pip install --upgrade pip sherpa-onnx
node .claude/skills/voiceover/scripts/voiceover.cjs download-model kokoro-en-v0_19
```

```powershell
# Windows (PowerShell)
py -3 -m venv .claude\skills\voiceover\scripts\.venv
.claude\skills\voiceover\scripts\.venv\Scripts\python.exe -m pip install --upgrade pip sherpa-onnx
node .claude/skills/voiceover/scripts/voiceover.cjs download-model kokoro-en-v0_19
```

For **Vietnamese** offline narration, download `vits-piper-vi_VN-vais1000-medium` instead (or in addition); for **8-language Kokoro** (`en`, `zh`, `ja`, `es`, `fr`, `hi`, `it`, `pt`), use `kokoro-multi-lang-v1_0`. Run `list-presets` to inspect all presets and local cache paths.

**Mastering (`ffmpeg` + `ffprobe`, optional for `audition` / `--no-master`, required for `-14 LUFS` `voiceover.wav`):**

```text
macOS:   brew install ffmpeg
Windows: winget install Gyan.FFmpeg
Linux:   sudo apt-get install ffmpeg
```

Detailed provider setup, `.env` precedence, and OS troubleshooting: read [references/providers-and-models.md](references/providers-and-models.md) when configuring a model, switching languages, or enabling an optional cloud studio provider.

## Workflow

Use a fresh project-root `tmp/voiceover/<run>` output folder (`--out`) for scratch audio and manifests; copy final deliverables only where the user requests.

### 1. Check the machine

```text
node .claude/skills/voiceover/scripts/voiceover.cjs doctor
```

If `doctor` exits `3`, report the missing tool or preset and ask the user whether to run the opt-in setup commands above or select an already-configured cloud provider. Never work around exit `3` with `/usr/bin/say` or PowerShell `System.Speech`.

### 2. Author `cues.json` and optional `pronunciation.json`

Split the script into short, natural spoken cues (1–3 sentences per cue, matching visual beats or chapters) with safe ASCII slug IDs (`c01-intro`, `c02-pipeline`). Put technical acronyms, version strings, and brand names (`kubectl`, `CI/CD`, `LUFS`, `gRPC`) in `pronunciation.json` so every provider pronounces them cleanly. Starter files: `examples/cues.json` and `examples/pronunciation.json`. Schema contract: read [references/manifest-contract.md](references/manifest-contract.md) before generating or consuming manifests.

### 3. Audition 1 cue first (mandatory before large batches)

```text
node .claude/skills/voiceover/scripts/voiceover.cjs audition tmp/voiceover/<run>/cues.json \
  --out tmp/voiceover/<run> \
  --pronunciation tmp/voiceover/<run>/pronunciation.json
```

Read the printed JSON (`duration`, `spokenText`, `audioPath`) and let the user listen to the 1-cue sample before synthesizing the full script or rendering video. Adjust `--voice`, `--speed`, `--preset`, or `pronunciation.json` until the sample sounds right.

### 4. Synthesize and master the full script

```text
node .claude/skills/voiceover/scripts/voiceover.cjs synthesize tmp/voiceover/<run>/cues.json \
  --out tmp/voiceover/<run> \
  --pronunciation tmp/voiceover/<run>/pronunciation.json
```

- Per-cue outputs cache by content hash (`sha256` of provider, model, voice, speed, instructions, and post-pronunciation text). Re-running after editing 1 line re-synthesizes only that cue.
- Mastering trims leading/trailing silence safely (`areverse` trick), appends each cue's `pauseAfter` breath gap (default `0.35 s`), concatenates cleanly, and runs two-pass `loudnorm` (`-14 LUFS`, `-1.5 dBTP`, `alimiter=latency=1`, `48 kHz`).
- Pass `--no-master` to output raw per-cue audio + `manifest.json` when `ffmpeg` is absent or a downstream compositor stitches cues itself. Re-master later with `master tmp/voiceover/<run>`.

### 5. Verify before handoff

Read `manifest.json` (`duration`, `loudness.measuredLufs`, `loudness.measuredTruePeakDbtp`, and every cue's `start`/`end`/`duration`) before handing the track to a visual renderer. Confirm zero missing cues, loudness near `-14 LUFS`, and true peak at or below `-1.5 dBTP`.

## Providers and languages

| Provider | Cost & privacy | Languages | Setup |
| --- | --- | --- | --- |
| `sherpa-onnx` **(default)** | **Free (\$0), 100% offline/private** (Apache-2.0) | EN (`kokoro-en-v0_19`), 8-lang (`kokoro-multi-lang-v1_0`), **Vietnamese** (`vits-piper-vi_VN-vais1000-medium`), fast EN (`vits-piper-en_US-lessac-medium`), or any `--model-dir` | Skill-local `.venv` + `pip install sherpa-onnx` + `download-model <preset>` |
| `openrouter` (opt-in) | Paid API (`OPENROUTER_API_KEY`) | All major + Vietnamese (Gemini Flash TTS, ElevenLabs, OpenAI, hosted Kokoro) | Zero installs (pure Node HTTPS) |
| `openai` (opt-in) | Paid API (`OPENAI_API_KEY`, `gpt-4o-mini-tts`) | All major + Vietnamese; supports cue `instructions` | Zero installs (pure Node HTTPS) |
| `gemini` (opt-in) | Paid API (`GEMINI_API_KEY`, Gemini Flash TTS) | All major + Vietnamese | Zero installs (pure Node HTTPS) |
| `elevenlabs` (opt-in) | Paid API (`ELEVENLABS_API_KEY`) | Multilingual v2 | Zero installs (pure Node HTTPS) |

## Exit codes

| Exit | Meaning | Caller action |
| --- | --- | --- |
| `0` | Command succeeded and output files/manifest were written atomically | Read printed JSON / `manifest.json` and continue |
| `1` | Runtime or tool fault (ffmpeg failure, network error, synthesis error) | Quote stderr; fix and retry (do not treat as a pass) |
| `2` | Usage or input error (bad flags, invalid `cues.json`, refused provider `say`/`sapi`/`edge-tts`) | Fix input or flags |
| `3` | Missing dependency, model preset, or API key | Report missing setup with the printed macOS/Windows commands; never auto-install or fall back to OS TTS |

## Handoff to video skills

Every video skill consumes the same `manifest.json` and `voiceover.wav`:

- **`remotion`** — read cue durations from `manifest.json` in `calculateMetadata` and play per-cue or master audio with `<Audio src={staticFile(...)} />`.
- **`html-export`** — pass `--audio=tmp/voiceover/<run>/voiceover.wav` to `export.cjs --to=mp4` and drive chapter animations from `manifest.json` timestamps.
- **`edit-video`** — use `edit-video` for recorded talking-head/screen footage; use `voiceover` when generating narration from a script or replacing a full voiceover track.
- **`e2e-demo`** — narrate storyboard chapters by passing `voiceover.wav` to the `html-export --to=mp4 --audio=...` step.

Exact consumer recipes: [references/manifest-contract.md](references/manifest-contract.md).

## Hard rules

- **Never silently fall back to OS TTS (`/usr/bin/say`, Windows SAPI5) or `edge-tts`.** The CLI explicitly refuses `say`, `sapi`, `os-tts`, and `edge-tts` with exit `2`.
- **Never send scripts to cloud APIs unless the user explicitly requested a cloud provider.** `sherpa-onnx` stays local and offline by default.
- **Never auto-install packages or download 60–340 MB models behind the user's back.** Only explicit `download-model <preset>` fetches allowlisted `k2-fsa/sherpa-onnx` archives.
- **Audition 1 cue before full synthesis** on any multi-cue narration.
- **Keep API keys out of files, manifests, and logs.** Keys live only in env vars or git-ignored `.env` files.

## Resources

- `scripts/voiceover.cjs` — platform-neutral Node CLI entrypoint (`doctor`, `list-presets`, `download-model`, `audition`, `synthesize`, `master`).
- `scripts/lib/` — binary probes, cue validation/cache, model preset store, `ffmpeg` mastering, `sherpa_tts.py`, and provider strategy registry (`providers/`).
- [references/providers-and-models.md](references/providers-and-models.md) — per-OS setup, voice IDs, `.env` hierarchy, and macOS/Windows troubleshooting.
- [references/manifest-contract.md](references/manifest-contract.md) — `cues.json`, `pronunciation.json`, `manifest.json` schemas and video-skill handoff recipes.
- `examples/cues.json`, `examples/pronunciation.json` — starter fixtures.

<!-- SYNC:output-quality-principles:reminder -->

**IMPORTANT MUST ATTENTION** lead with useful guidance and readable priorities; preserve action-changing conditions/numbers and required structures. When writing, updating or auditing Markdown skill/doc content, verify top, heading-linked contents over 200 lines (stricter owner thresholds remain); refresh after edits and report gaps in read-only audits. Remove report bulk; judge semantic value rather than word counts.

<!-- /SYNC:output-quality-principles:reminder -->

## Closing Reminders

**Goal:** Produce natural, broadcast-mastered neural voiceover audio (`48 kHz`, `-14 LUFS`, `-1.5 dBTP`) and `manifest.json` on both macOS and Windows, free and offline by default.

- Run `doctor` → author `cues.json` + `pronunciation.json` → `audition` 1 cue first → `synthesize` + `master` → verify `manifest.json` loudness and timestamps → hand off to `remotion`, `html-export`, `edit-video`, or `e2e-demo`.
- Never silently fall back to `/usr/bin/say`, Windows SAPI5, or `edge-tts`; never auto-install packages or models; never upload scripts to cloud APIs without explicit opt-in.
- Exit `3` means missing setup — show the per-OS commands and stop rather than degrading voice quality.
