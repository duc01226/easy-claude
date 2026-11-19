---
id: voiceover-skill
kind: notice
title: Generate free cross-platform neural voiceovers with voiceover
added: 2026-11-19
covers: ["skills@8d29ee03e6d2"]
---

Use `/voiceover` in Claude Code or `$voiceover` in Codex to synthesize neural narration from scripts or cues on both macOS and Windows. It defaults to free offline Apache-2.0 `sherpa-onnx` models (Kokoro-82M for English and Piper VITS for Vietnamese and multilingual voices) and also supports explicit opt-in cloud studio providers (`openrouter`, `openai`, `gemini`, `elevenlabs`), producing `-14 LUFS` mastered WAV audio and a portable `manifest.json` consumable by `edit-video`, `remotion`, `html-export`, and `e2e-demo`.

`edit-video` now stops when no recorded footage exists and forbids silent fallback to legacy OS TTS (`/usr/bin/say` or Windows SAPI5) or `edge-tts`, routing script-to-explainer narration to `voiceover`. Importing the framework installs no Python packages, ffmpeg, or models automatically; run `node .claude/skills/voiceover/scripts/voiceover.cjs doctor` when ready to set up.
