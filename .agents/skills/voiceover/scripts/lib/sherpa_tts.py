"""Stdlib-only Python helper for free offline neural TTS via sherpa-onnx (macOS, Windows, Linux).

Subcommands:
  probe                                      Check Python + sherpa_onnx availability.
  synthesize --model-dir <d> --text <t> --out <wav> [--sid 0] [--speed 1.0] [--threads 2]
                                             Synthesize one WAV atomically via stdlib wave/array.
  download --url <https-url> --dest <dir>    Download & safely extract an allowlisted k2-fsa archive.
  extract --archive <tar.bz2> --dest <dir>   Safely extract a local archive (used by tests/offline setup).
"""
import argparse
import array
import json
import os
import re
import shutil
import sys
import tarfile
import tempfile
import urllib.request
import wave

for _stream in (sys.stdout, sys.stderr):
    try:
        _stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ALLOWED_URL_PREFIX = "https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/"
ALLOWED_ARCHIVE_SUFFIX_RE = re.compile(r"^[A-Za-z0-9._-]+\.tar\.(?:bz2|gz)$")
MAX_ARCHIVE_BYTES = 1024 * 1024 * 1024  # 1 GiB compressed stream bound
MAX_EXTRACTED_BYTES = 2 * 1024 * 1024 * 1024  # 2 GiB uncompressed safety bound
MAX_ARCHIVE_MEMBERS = 10_000
DOWNLOAD_TIMEOUT_SECS = 60


class _HttpsOnlyRedirectHandler(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        if not str(newurl).startswith("https://"):
            raise ValueError(f"Refusing non-HTTPS redirect: {newurl!r}")
        return super().redirect_request(req, fp, code, msg, headers, newurl)


def write_pcm16_wav(samples, sample_rate, out_path):
    """Write float32 samples in [-1, 1] to a 16-bit mono PCM WAV atomically using stdlib only."""
    pcm = array.array("h")
    for s in samples:
        val = max(-1.0, min(1.0, float(s)))
        pcm.append(int(round(val * 32767.0)))
    if sys.byteorder != "little":
        pcm.byteswap()
    parent = os.path.dirname(os.path.abspath(out_path))
    os.makedirs(parent, exist_ok=True)
    tmp_path = f"{out_path}.{os.getpid()}.tmp.wav"
    try:
        with wave.open(tmp_path, "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(int(sample_rate))
            wf.writeframes(pcm.tobytes())
        os.replace(tmp_path, out_path)
    except Exception:
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except OSError:
            pass
        raise


def detect_model_files(model_dir):
    """Detect Kokoro vs Piper VITS files inside a sherpa-onnx model directory."""
    if not os.path.isdir(model_dir):
        raise ValueError(f"Model directory not found: {model_dir}")
    entries = sorted(os.listdir(model_dir))
    onnx_files = [e for e in entries if e.lower().endswith(".onnx")]
    model_file = "model.onnx" if "model.onnx" in onnx_files else (onnx_files[0] if onnx_files else None)
    tokens_file = "tokens.txt" if "tokens.txt" in entries else None
    if not model_file or not tokens_file:
        raise ValueError(f"Model directory {model_dir} must contain *.onnx and tokens.txt")
    voices_file = "voices.bin" if "voices.bin" in entries else None
    data_dir = os.path.join(model_dir, "espeak-ng-data") if os.path.isdir(os.path.join(model_dir, "espeak-ng-data")) else ""
    lexicons = [os.path.join(model_dir, e) for e in entries if e.lower().startswith("lexicon") and e.lower().endswith(".txt")]
    dict_dir = os.path.join(model_dir, "dict") if os.path.isdir(os.path.join(model_dir, "dict")) else ""
    return {
        "arch": "kokoro" if voices_file else "vits",
        "model": os.path.join(model_dir, model_file),
        "tokens": os.path.join(model_dir, tokens_file),
        "voices": os.path.join(model_dir, voices_file) if voices_file else "",
        "data_dir": data_dir,
        "lexicon": ",".join(lexicons),
        "dict_dir": dict_dir,
    }


def _safe_relative_parts(name):
    normalized = name.replace("\\", "/")
    if not normalized or normalized.startswith("/"):
        raise ValueError(f"Refusing absolute archive member path: {name!r}")
    parts = [p for p in normalized.split("/") if p not in ("", ".")]
    if not parts:
        return []
    if any(p == ".." for p in parts):
        raise ValueError(f"Refusing path-traversal archive member: {name!r}")
    if any(":" in p for p in parts):
        raise ValueError(f"Refusing drive-or-colon archive member: {name!r}")
    return parts


def safe_extract_tar(archive_path, dest_dir, max_bytes=MAX_EXTRACTED_BYTES, max_members=MAX_ARCHIVE_MEMBERS):
    """Extract a .tar.bz2/.tar.gz archive safely, rejecting traversal, symlinks, hardlinks, devices and bombs."""
    dest_abs = os.path.abspath(dest_dir)
    parent = os.path.dirname(dest_abs)
    os.makedirs(parent, exist_ok=True)
    staging = tempfile.mkdtemp(prefix=".voiceover-stage-", dir=parent)
    try:
        with tarfile.open(archive_path, "r:*") as tf:
            members = tf.getmembers()
            if not members:
                raise ValueError("Archive is empty")
            if len(members) > max_members:
                raise ValueError(f"Archive exceeds maximum member count ({max_members})")
            parsed = []
            top_dirs = set()
            for m in members:
                if m.issym() or m.islnk() or m.isdev() or m.isfifo():
                    raise ValueError(f"Refusing unsafe archive member (link/device): {m.name!r}")
                if not (m.isdir() or m.isfile()):
                    raise ValueError(f"Refusing unsupported archive member type: {m.name!r}")
                parts = _safe_relative_parts(m.name)
                if not parts:
                    continue
                top_dirs.add(parts[0])
                parsed.append((m, parts))
            strip_prefix = len(top_dirs) == 1 and all(len(parts) > 1 or m.isdir() for m, parts in parsed)
            extracted_bytes = 0
            for m, parts in parsed:
                rel_parts = parts[1:] if strip_prefix else parts
                if not rel_parts:
                    continue
                target = os.path.abspath(os.path.join(staging, *rel_parts))
                if os.path.commonpath([staging, target]) != staging:
                    raise ValueError(f"Refusing archive member escaping target directory: {m.name!r}")
                if m.isdir():
                    os.makedirs(target, exist_ok=True)
                else:
                    os.makedirs(os.path.dirname(target), exist_ok=True)
                    src = tf.extractfile(m)
                    if src is None:
                        raise ValueError(f"Could not read archive file member: {m.name!r}")
                    with src, open(target, "wb") as dst:
                        while True:
                            chunk = src.read(1024 * 256)
                            if not chunk:
                                break
                            extracted_bytes += len(chunk)
                            if extracted_bytes > max_bytes:
                                raise ValueError(f"Archive exceeded uncompressed limit ({max_bytes} bytes)")
                            dst.write(chunk)
        if os.path.lexists(dest_abs):
            if os.path.islink(dest_abs) or os.path.isfile(dest_abs):
                os.unlink(dest_abs)
            else:
                shutil.rmtree(dest_abs)
        os.replace(staging, dest_abs)
    except Exception:
        shutil.rmtree(staging, ignore_errors=True)
        raise


def cmd_probe():
    info = {"python": f"{sys.version_info.major}.{sys.version_info.minor}.{sys.version_info.micro}", "sherpa_onnx": None}
    try:
        import sherpa_onnx  # type: ignore

        info["sherpa_onnx"] = getattr(sherpa_onnx, "__version__", "installed")
    except Exception as exc:
        info["error"] = str(exc)
        print(json.dumps(info))
        return 3
    print(json.dumps(info))
    return 0


def cmd_synthesize(args):
    try:
        import sherpa_onnx  # type: ignore
    except Exception as exc:
        print(f"sherpa_onnx is not installed: {exc}", file=sys.stderr)
        return 3
    files = detect_model_files(args.model_dir)
    if files["arch"] == "kokoro":
        kokoro_kwargs = {
            "model": files["model"],
            "voices": files["voices"],
            "tokens": files["tokens"],
            "data_dir": files["data_dir"],
        }
        if files["lexicon"]:
            kokoro_kwargs["lexicon"] = files["lexicon"]
        if files["dict_dir"]:
            kokoro_kwargs["dict_dir"] = files["dict_dir"]
        model_cfg = sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(**kokoro_kwargs),
            provider="cpu",
            num_threads=args.threads,
        )
    else:
        vits_kwargs = {
            "model": files["model"],
            "tokens": files["tokens"],
            "data_dir": files["data_dir"],
        }
        if files["lexicon"]:
            vits_kwargs["lexicon"] = files["lexicon"]
        model_cfg = sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(**vits_kwargs),
            provider="cpu",
            num_threads=args.threads,
        )
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=model_cfg))
    audio = tts.generate(args.text, sid=args.sid, speed=args.speed)
    samples = audio.samples
    if len(samples) == 0:
        print("sherpa-onnx produced zero audio samples.", file=sys.stderr)
        return 1
    write_pcm16_wav(samples, audio.sample_rate, args.out)
    duration = round(len(samples) / float(audio.sample_rate), 4)
    print(json.dumps({"out": args.out, "sampleRate": int(audio.sample_rate), "duration": duration, "arch": files["arch"]}))
    return 0


def is_allowed_model_url(url):
    if not isinstance(url, str) or not url.startswith(ALLOWED_URL_PREFIX):
        return False
    suffix = url[len(ALLOWED_URL_PREFIX):]
    if ".." in suffix:
        return False
    return ALLOWED_ARCHIVE_SUFFIX_RE.match(suffix) is not None


def cmd_download(args):
    if not is_allowed_model_url(args.url):
        print(f"Refusing non-allowlisted model URL: {args.url}", file=sys.stderr)
        return 2
    dest_abs = os.path.abspath(args.dest)
    parent = os.path.dirname(dest_abs)
    os.makedirs(parent, exist_ok=True)
    fd, tmp_archive = tempfile.mkstemp(prefix=".voiceover-dl-", suffix=".tar.bz2", dir=parent)
    os.close(fd)
    try:
        opener = urllib.request.build_opener(_HttpsOnlyRedirectHandler)
        req = urllib.request.Request(args.url, headers={"User-Agent": "easy-claude-voiceover/1.0"})
        total = 0
        with opener.open(req, timeout=DOWNLOAD_TIMEOUT_SECS) as resp, open(tmp_archive, "wb") as fh:
            while True:
                chunk = resp.read(1024 * 256)
                if not chunk:
                    break
                total += len(chunk)
                if total > MAX_ARCHIVE_BYTES:
                    raise ValueError(f"Download exceeded {MAX_ARCHIVE_BYTES} bytes limit")
                fh.write(chunk)
        safe_extract_tar(tmp_archive, dest_abs)
        print(json.dumps({"dest": dest_abs, "bytes": total}))
        return 0
    finally:
        try:
            if os.path.exists(tmp_archive):
                os.remove(tmp_archive)
        except OSError:
            pass


def cmd_extract(args):
    safe_extract_tar(args.archive, args.dest)
    print(json.dumps({"dest": os.path.abspath(args.dest)}))
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("probe")

    p_syn = sub.add_parser("synthesize")
    p_syn.add_argument("--model-dir", required=True)
    p_syn.add_argument("--text", required=True)
    p_syn.add_argument("--out", required=True)
    p_syn.add_argument("--sid", type=int, default=0)
    p_syn.add_argument("--speed", type=float, default=1.0)
    p_syn.add_argument("--threads", type=int, default=2)

    p_dl = sub.add_parser("download")
    p_dl.add_argument("--url", required=True)
    p_dl.add_argument("--dest", required=True)

    p_ex = sub.add_parser("extract")
    p_ex.add_argument("--archive", required=True)
    p_ex.add_argument("--dest", required=True)

    args = parser.parse_args()
    if args.command == "probe":
        return cmd_probe()
    if args.command == "synthesize":
        return cmd_synthesize(args)
    if args.command == "download":
        return cmd_download(args)
    if args.command == "extract":
        return cmd_extract(args)
    return 2


if __name__ == "__main__":
    sys.exit(main())
