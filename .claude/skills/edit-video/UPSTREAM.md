# Upstream source

This skill bundles [coleam00/skills — edit-video](https://github.com/coleam00/skills/tree/bca556037b7f95b3f3ea7e0653e5c490146dbfb8/.claude/skills/edit-video) from commit `bca556037b7f95b3f3ea7e0653e5c490146dbfb8` under the MIT terms in [LICENSE.txt](LICENSE.txt), copyright Cole Medin.

The complete upstream bundle is retained. The examples, templates, sound asset, and 33 of the 43 Python files are unchanged (`align.py` untouched); `scripts/pyproject.toml` and `scripts/uv.lock` upgrade the optional `align` extra (`torch>=2.13`, `torchaudio>=2.11.1`) to remediate `CVE-2026-24747`. Framework adaptations add skill metadata, summary/navigation, cross-host script discovery, scratch-output guidance, a Step-0 no-footage/no-silent-OS-TTS routing guard to `voiceover`, licensing/provenance and local regression tests.

Review repairs preserve the upstream tools and algorithms:

- `captions.py`: bound partition searches and report infeasible `_keep` phrases.
- `assemble.py`: reject split edits without enough incoming pre-roll; preserve neutral gain when no segment can be measured.
- `render.py`, `finalize.py`, `export_final.py`: pass literal process arguments; resolve Windows npm shims without a shell; reject render-owned video/log/chunk/copy outputs aliasing protected sources; quote FFconcat paths; stop finalization after a failed render.
- `screen_bubble.py`: retain manual/default geometry when no face is detected.
- `hf/style.py`: display caption words as text rather than executable markup.
- `video_review.py`: reject incomplete or malformed model reviews instead of recording false zero-note success; offset both endpoints of section-review notes to the whole-video clock; use actual audio and picture join times.
- `fix_word.py`: preserve signed numeric groups, percentages, leading fractions and the following word independently of fuzzy prose matching; retain Unicode words and reject empty verification evidence.
- `doctor.py`: check the current HyperFrames Node 22+ requirement and reuse the safe npx launcher.

Supporting references retain upstream content with contents navigation, a corrected voice-reference duration summary and alignment checkpoint/dependency guidance. Read [local-fixes.md](references/local-fixes.md) when maintaining these repairs or running their offline regression contracts. Actual codecs, models, providers and rendered-media quality require their original runtime gates; the offline tests do not certify them.

Read this file when updating the imported bundle. Replace it from one pinned upstream commit, preserve its license, reapply the framework packaging, regenerate catalogs and host mirrors through their existing owners, and verify the import. The executable source remains under `.claude/skills/edit-video`; generated host copies are not edited directly.
