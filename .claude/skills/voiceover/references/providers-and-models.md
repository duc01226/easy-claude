# Providers, Presets, and Cross-Platform Setup

Read this reference when setting up free offline neural models (`sherpa-onnx`), selecting voices or languages (English, Vietnamese, multilingual), configuring optional cloud studio providers, or troubleshooting macOS and Windows environments.

## Contents

- [Free offline neural models (sherpa-onnx)](#free-offline-neural-models-sherpa-onnx)
- [Model cache locations and overrides](#model-cache-locations-and-overrides)
- [Optional cloud studio providers (opt-in only)](#optional-cloud-studio-providers-opt-in-only)
- [Environment variable and binary overrides](#environment-variable-and-binary-overrides)
- [macOS and Windows troubleshooting](#macos-and-windows-troubleshooting)

## Free offline neural models (sherpa-onnx)

`sherpa-onnx` is an Apache-2.0 ONNX inference engine with prebuilt Python wheels for macOS (`arm64` and `x86_64`), Windows (`x64`), and Linux. Each official `k2-fsa/sherpa-onnx` model bundle includes its own `espeak-ng-data` directory, so neither macOS Homebrew `espeak-ng` nor the Windows `espeak-ng` MSI installer is required.

| Preset ID | Architecture | Languages | Voices (`--voice <sid>`) | Approx. size | Best for |
| --- | --- | --- | --- | --- | --- |
| `kokoro-en-v0_19` (default) | Kokoro-82M | English | `0`..`10` (11 speakers) | ~310 MB | Technical tutorials, product demos, long-form English narration |
| `kokoro-multi-lang-v1_0` | Kokoro v1.0 | `en`, `zh`, `ja`, `es`, `fr`, `hi`, `it`, `pt` | `0`..`52` (53 speakers) | ~340 MB | Multilingual guides across Kokoro's 8 supported languages |
| `vits-piper-vi_VN-vais1000-medium` | Piper VITS | Vietnamese (`vi`) | `0` | ~65 MB | Offline Vietnamese narration without cloud API keys |
| `vits-piper-en_US-lessac-medium` | Piper VITS | English (`en-US`) | `0` | ~65 MB | Fast lightweight CPU synthesis when disk/RAM is tight |

You can also point `--model-dir <path>` at any extracted `sherpa-onnx` Kokoro or Piper VITS directory containing `*.onnx`, `tokens.txt`, and `espeak-ng-data` (plus `voices.bin` for Kokoro).

### One-time setup commands

macOS / Linux:

```sh
python3 -m venv .claude/skills/voiceover/scripts/.venv
.claude/skills/voiceover/scripts/.venv/bin/python -m pip install --upgrade pip sherpa-onnx
node .claude/skills/voiceover/scripts/voiceover.cjs download-model kokoro-en-v0_19
```

Windows (PowerShell):

```powershell
py -3 -m venv .claude\skills\voiceover\scripts\.venv
.claude\skills\voiceover\scripts\.venv\Scripts\python.exe -m pip install --upgrade pip sherpa-onnx
node .claude/skills/voiceover/scripts/voiceover.cjs download-model kokoro-en-v0_19
```

`download-model` downloads only allowlisted HTTPS archives from `https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/` and extracts them safely through Python's `tarfile` with member path-traversal and link rejection.

## Model cache locations and overrides

Models stay outside the repository so Git never tracks 60–340 MB binaries:

- **Explicit override:** `VOICEOVER_MODEL_DIR`
- **Windows default:** `%LOCALAPPDATA%\easy-claude-voiceover\models`
- **macOS / Linux default:** `$XDG_CACHE_HOME/easy-claude-voiceover/models` or `~/.cache/easy-claude-voiceover/models`

## Optional cloud studio providers (opt-in only)

Cloud providers use Node.js built-in `fetch()` with zero extra installs on macOS and Windows. They run **only** when you explicitly pass `--provider <name>`, because they send script text to an external API and incur provider charges.

| Provider | Env var | Default model | Default voice | Notes |
| --- | --- | --- | --- | --- |
| `openrouter` | `OPENROUTER_API_KEY` | `google/gemini-3.8-flash-tts` | `alloy` | One key routes to Gemini Flash TTS, ElevenLabs, OpenAI, Fish Audio, or hosted Kokoro (`--model` swaps) |
| `openai` | `OPENAI_API_KEY` | `gpt-4o-mini-tts` | `alloy` | Supports per-cue natural-language `instructions` (tone/pacing); strong EN + VI |
| `gemini` | `GEMINI_API_KEY` | `gemini-2.5-flash-preview-tts` | `Kore` | Native audio output (wrapped to 24 kHz WAV automatically); strong EN + VI |
| `elevenlabs` | `ELEVENLABS_API_KEY` | `eleven_multilingual_v2` | `JBFqnCBsd6RMkjVDRZzb` | Pass your chosen ElevenLabs voice ID via `--voice` |

### `.env` precedence

Keys resolve in this order (highest wins):

1. `process.env`
2. `.claude/skills/voiceover/.env` (git-ignored)
3. `.claude/skills/.env`
4. `.claude/.env`

Never commit `.env` files or paste API keys into `cues.json`, `manifest.json`, or logs.

## Environment variable and binary overrides

| Variable | Effect |
| --- | --- |
| `VOICEOVER_MODEL_DIR` | Directory where downloaded offline models live |
| `VOICEOVER_PYTHON` | Absolute path to a Python 3 executable (`.exe`/`.com` only on Windows; never `.bat`/`.cmd`) |
| `VOICEOVER_FFMPEG` | Absolute path to `ffmpeg` executable (`.exe`/`.com` only on Windows) |
| `VOICEOVER_FFPROBE` | Absolute path to `ffprobe` executable (`.exe`/`.com` only on Windows) |

## macOS and Windows troubleshooting

- **Apple Silicon (M1/M2/M3/M4) architecture mismatch:** Ensure `python3 -c "import platform; print(platform.machine())"` prints `arm64` (native) so `pip install sherpa-onnx` installs native `arm64` wheels rather than Rosetta `x86_64`.
- **Windows `py` vs `python`:** The CLI probes `.claude\skills\voiceover\scripts\.venv\Scripts\python.exe`, then `python.exe` on `PATH`, then `py.exe -3`. Install Python 3 from python.org or `winget install Python.Python.3.12` if neither is on `PATH`.
- **Windows UTF-8 console output:** `sherpa_tts.py` reconfigures stdout/stderr to UTF-8 so Vietnamese and Unicode script text never fails under `cp1252`.
- **Why `edge-tts`, `/usr/bin/say`, and Windows SAPI5 are refused:** `edge-tts` relies on an unofficial consumer endpoint subject to `403` outages, IP throttling, and ToS issues; `/usr/bin/say` and SAPI5 produce robotic voices and break macOS/Windows parity.
