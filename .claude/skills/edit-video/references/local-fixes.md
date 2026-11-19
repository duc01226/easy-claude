# Local repair contracts

Read this reference when updating the imported tools or their tests. Keep the upstream pipeline, manifests and assets; reapply only fixes still needed after an upstream refresh. [UPSTREAM.md](../UPSTREAM.md) pins the copied revision and lists deviations.

The following technical regression cases extend the existing script/recipe contracts. They are executed by [test_regressions.py](../tests/test_regressions.py), bridged into the framework's native scripts-test family by `edit-video.test.cjs`. No dedicated business Feature Spec governs this imported skill.

| Case | Required outcome, for all supported inputs | Boundary and preservation checks |
|---|---|---|
| EV01 | Caption partitioning terminates and preserves word order and fitting `_keep` phrases. | Empty clause; overlong individual word; fitting kept span; infeasible protected span raises actionable error rather than splitting or hanging. |
| EV02 | Split edits shift picture by the same amount at both sides, keeping audio and total picture clocks intact. | Ordinary/no split and available pre-roll preserved; unavailable incoming pre-roll stops before rendering. Move `video_out` later or choose an incoming cut with enough pre-roll. |
| EV03 | Leveling uses measured median and same-clip fallback; no usable references means neutral gains. | All-short edit, measured edit, and short sibling of measured clip. Final loudnorm and manual audio gates remain required. |
| EV04 | A failed render cannot produce a new export from stale raw media. | Existing raw + child failure stops; explicit `--use-raw` and `--clean` retain their intended behavior. |
| EV05 | Missing face detections permit default/manual composition geometry with a visible warning. | Empty and measured face mappings preserve manual crop overrides; inspect frames before shipping. |
| EV06 | File paths, names and package specs remain literal arguments, never shell code; chunk manifests encode FFconcat's separate path grammar. | Spaces, apostrophes, metacharacters and Unicode; CR/LF paths fail clearly; checked finalize/export child boundaries; Windows `.cmd` resolves Node plus npm's `npx-cli.js`, or fails with setup guidance. |
| EV07 | Caption words remain plain text in generated HTML. | Markup-like text, ampersands and quotes create no extra elements; ordinary words and intentional scene markup remain supported. |
| EV08 | Render-owned video/log/chunk/copy outputs must not alias a configured source (`path`, `padded_from`, `fixed_from`, or single-file `source`). | Canonical, symlink and hardlink aliases rejected before mutation, including sidecars, chunk intermediates and copy2's file target inside an existing destination directory; ordinary scratch/directory-copy outputs may still be replaced. This is not a sandbox for vendor internals or concurrent hostile filesystem changes. |
| EV09 | Only a completed `stop` response with valid review JSON can be saved as a successful review; saved start and non-null end use the whole video's clock. | Empty and nonempty notes valid; refusal, truncation, wrong types, invalid fields and non-finite/out-of-section times fail. Section offsets apply to both endpoints; full-video times and null ends retain their meaning. Actual audio and picture join clocks both inform cut context/annotations; coincident joins deduplicate, legacy audio-only timelines and duration selection remain supported. Notes remain advisory. |
| EV10 | Voice verification retains signed numeric groups, percentage markers and the immediately following normalized word; fuzzy prose matching cannot override that comparison. | `75%` equals `seventy-five percent`, `1.25` equals `one point two five`, `.5%` equals `0.5%`, and `-5%` equals `minus five percent`; hyphenated labels such as `COVID-19` retain ordinary word/number matching. A dropped or changed following word (for example `minutes` after `5`), wrong signs, `.5%` versus `5%`, and transposed decimal digits fail even in long sentences. Separate number groups remain distinct. Rejected takes leave config, words and source unchanged; equivalent takes may update only derived output. The following-word check is deliberately strict, so a valid transcription variant there may require another take. Other prose stays fuzzy. No general unit conversion, multiword-unit interpretation or voice-quality guarantee is claimed. |
| EV11 | Doctor warns below the current HyperFrames Node 22+ requirement without blocking the local basic pipeline. | Node 20 warns, 22/24 pass this check. Pinned older releases may have different engines; inspect their metadata. |
| EV12 | Voice verification requires nonempty lexical evidence and retains Unicode words; missing comparison evidence cannot score as success. | Empty/punctuation-only corrected text fails before media/provider work; different non-Latin lines or empty readback reject without publication; matching Unicode text and ordinary ASCII remain supported. This does not certify provider language support or voice quality. |

From a framework checkout, run the portable bridge:

```text
node --test .claude/scripts/tests/edit-video.test.cjs
```

For the standalone copied skill, macOS/Linux: `python3 <skill>/tests/test_regressions.py`; Windows: `py -3 <skill>/tests/test_regressions.py`. These tests use standard-library doubles and disposable files. They do not run FFmpeg, HyperFrames, ASR, models, paid providers or a browser. Real media quality and native platform compatibility still require the skill's original verification workflow.
