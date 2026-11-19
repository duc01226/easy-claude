"""Offline contracts for local repairs; no media packages, tools, models or network.

Case IDs and intent: references/local-fixes.md. Run with Python's unittest runner.
EDIT_VIDEO_TEST_SCRIPTS selects an isolated original-source copy for RED proof.
"""
import ast
import contextlib
import copy
import html.parser
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import tempfile
import types
import unittest
from unittest.mock import Mock, patch
import urllib.request
import runpy
import shlex


SCRIPTS = Path(os.environ.get("EDIT_VIDEO_TEST_SCRIPTS", Path(__file__).resolve().parents[1] / "scripts"))


class StopAtImage(Exception):
    pass


class OfflineCase(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="edit-video-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.addCleanup(patch.stopall)
        patch.object(subprocess, "run", side_effect=AssertionError("unexpected external process")).start()
        patch.object(socket, "create_connection", side_effect=AssertionError("unexpected network")).start()
        patch.object(urllib.request, "urlopen", side_effect=AssertionError("unexpected HTTP")).start()
        self.cfg = {"w": 1920, "h": 1080, "fps": 30, "clips": [], "source": str(self.root / "source")}
        self.data = {}
        self.common = types.ModuleType("common")
        self.common.ws = lambda: (str(self.root), self.cfg)
        self.common.load = lambda d, *parts, default=None: copy.deepcopy(self.data.get("/".join(parts), default))
        self.common.save = lambda obj, d, *parts: self.data.__setitem__("/".join(parts), copy.deepcopy(obj))
        self.common.p = lambda d, *parts: str(Path(d).joinpath(*parts))
        self.common.q = lambda t, fps: round(t * fps) / fps
        # Exercise the actual checked-process owner without importing numpy or model packages.
        tree = ast.parse((SCRIPTS / "common.py").read_text(encoding="utf-8"))
        run = next(n for n in tree.body if isinstance(n, ast.FunctionDef) and n.name == "run")
        scope = {"subprocess": subprocess}
        exec(compile(ast.Module(body=[run], type_ignores=[]), "common.py", "exec"), scope)
        self.common.run = scope["run"]

    def module(self, name):
        path = SCRIPTS / (name + ".py")
        tree = ast.parse(path.read_text(encoding="utf-8"))
        for node in ast.walk(tree):
            if isinstance(node, ast.ImportFrom) and node.module == "common":
                for alias in node.names:
                    if not hasattr(self.common, alias.name):
                        setattr(self.common, alias.name, Mock(side_effect=AssertionError("unexpected media helper")))
        pil = types.ModuleType("PIL")
        pil.Image = types.SimpleNamespace(new=Mock(side_effect=StopAtImage))
        pil.ImageDraw = pil.ImageFilter = types.SimpleNamespace()
        modules = {"common": self.common, "numpy": types.ModuleType("numpy"), "PIL": pil,
                   "openrouter": types.ModuleType("openrouter")}
        spec = importlib.util.spec_from_file_location("offline_" + name.replace("/", "_"), path)
        module = importlib.util.module_from_spec(spec)
        with patch.dict(sys.modules, modules), patch.object(sys, "path", list(sys.path)):
            spec.loader.exec_module(module)
        return module

    def argv(self, *args):
        return patch.object(sys, "argv", ["script.py", str(self.root), *args])

    def assemble(self, durations, override=None, level=False):
        module = self.module("assemble")
        self.data["faces.json"] = {}
        self.data["cuts.json"] = {"segments": [
            {"key": f"s{i}", "clip": "c" + str(i), "path": str(self.root / f"c{i}.mp4"), "in": a, "out": b}
            for i, (a, b) in enumerate(durations)]}
        self.data["overrides.json"] = {"video_out": override or {}}
        measurement = iter(["I: -20 LUFS", "I: -30 LUFS", "I: -25 LUFS"])
        loud = {"input_i": "-20", "input_tp": "-4", "input_lra": "1", "input_thresh": "-30", "target_offset": "0"}
        def child(cmd, **kwargs):
            if "ebur128" in cmd:
                return subprocess.CompletedProcess(cmd, 0, "", next(measurement))
            if "null" in cmd:
                return subprocess.CompletedProcess(cmd, 0, "", json.dumps(loud))
            return subprocess.CompletedProcess(cmd, 0, "", "")
        with patch.object(subprocess, "run", side_effect=child), self.argv(*(["--level"] if level else [])):
            module.main()
        return self.data["cut/timeline_v1.json"]


class CaptionContracts(OfflineCase):
    def test_EV01_kept_phrases_fit_and_preserve_all_words(self):
        m = self.module("captions")
        for text, target, hard, keep in [("ordinary words stay ordered", 12, 18, set()),
                                         ("a kept phrase", 8, 20, {0, 1}),
                                         ("averylongsingleword", 4, 8, set())]:
            words = [{"w": w} for w in text.split()]
            groups = m.balanced(list(range(len(words))), words, target, hard, keep)
            self.assertEqual([i for g in groups for i in g], list(range(len(words))))
            if keep: self.assertEqual(groups, [list(range(len(words)))])
        self.assertEqual(m.balanced([], [], 22, 26), [])

    def test_EV01_infeasible_keep_fails_instead_of_searching_forever(self):
        m = self.module("captions")
        # A deterministic execution budget makes the original unbounded search fail without a hung child.
        steps = 0
        def trace(frame, event, arg):
            nonlocal steps
            if frame.f_code.co_filename == str(SCRIPTS / "captions.py"):
                steps += 1
                if steps > 10000: raise AssertionError("caption partition did not terminate")
            return trace
        old = sys.gettrace()
        try:
            sys.settrace(trace)
            with self.assertRaisesRegex(ValueError, "_keep"):
                m.balanced([0, 1, 2], [{"w": "longphrase"}] * 3, 22, 26, {0, 1})
        finally:
            sys.settrace(old)

    def test_EV07_caption_markup_is_literal_text(self):
        m = self.module("hf/style")
        words = ['<svg/onload=alert(1)>', '<T>', '& "quotes"', "plain"]
        cap = {"words": [{"w": w} for w in words], "groups": [{"words": list(range(4))}]}
        class Reader(html.parser.HTMLParser):
            def __init__(self): super().__init__(); self.tags = []; self.text = []
            def handle_starttag(self, tag, attrs): self.tags.append(tag)
            def handle_data(self, data): self.text.append(data)
        reader = Reader(); reader.feed(m.captions_html(cap))
        self.assertEqual(reader.tags, ["div", "div", "div", "span", "span", "span", "span"])
        self.assertEqual("".join(reader.text).strip(), "".join(words))


class AssemblyContracts(OfflineCase):
    def test_EV02_valid_split_preserves_both_total_clocks_and_audio(self):
        for override in ({}, {"s0": 4}):
            tl = self.assemble([(0, 5), (2, 7)], override)
            self.assertEqual([(s["a_in"], s["a_out"]) for s in tl], [(0, 5), (2, 7)])
            self.assertEqual(tl[-1]["v_out_end"], tl[-1]["out_end"])
            self.assertEqual(tl[1]["v_in"], 1 if override else 2)

    def test_EV02_unavailable_preroll_stops_before_writing_media(self):
        with self.assertRaisesRegex(SystemExit, "pre-roll"):
            self.assemble([(0, 5), (0.2, 4)], {"s0": 4})
        self.assertNotIn("cut/timeline_v1.json", self.data)

    def test_EV03_all_short_segments_use_neutral_gain(self):
        tl = self.assemble([(0, 1), (0, 2)], level=True)
        self.assertEqual([s["gain_db"] for s in tl], [0.0, 0.0])

    def test_EV03_measured_segments_retain_median_leveling(self):
        tl = self.assemble([(0, 4), (0, 5)], level=True)
        self.assertEqual([s["gain_db"] for s in tl], [-5.0, 5.0])

    def test_EV03_short_piece_inherits_its_measured_clip_gain(self):
        m = self.module("assemble")
        self.data["faces.json"] = {}
        self.data["cuts.json"] = {"segments": [
            {"key": f"s{i}", "clip": clip, "path": str(self.root / (clip + ".mp4")), "in": 0, "out": length}
            for i, (clip, length) in enumerate([("c1", 4), ("c2", 4), ("c1", 1)])]}
        loud = {"input_i": "-20", "input_tp": "-4", "input_lra": "1", "input_thresh": "-30", "target_offset": "0"}
        measurements = iter([-20, -30, -99])
        def child(cmd, **kwargs):
            stderr = f"I: {next(measurements)} LUFS" if "ebur128" in cmd else json.dumps(loud)
            return subprocess.CompletedProcess(cmd, 0, "", stderr)
        with patch.object(subprocess, "run", side_effect=child), self.argv("--level"): m.main()
        self.assertEqual([s["gain_db"] for s in self.data["cut/timeline_v1.json"]], [-5.0, 5.0, -5.0])


class ProcessContracts(OfflineCase):
    def chunk_fixture(self, module, base):
        proj = base / "hf/scene"; proj.mkdir(parents=True)
        (proj / "index.html").write_text('<div data-composition-id="scene" data-duration="12"><video src="face.mp4"></video></div>'
                                        '<script>window.__timelines["scene"]=tl;</script>', encoding="utf-8")
        (proj / "face.mp4").write_bytes(b"synthetic media")
        (proj / "asset.txt").write_text("asset", encoding="utf-8")
        (proj / "images").mkdir(); (proj / "images/card.txt").write_text("card", encoding="utf-8")
        chunks = base / "hf/scene_chunks"
        out = base / "final.mp4"
        calls = []
        def child(cmd, **kwargs):
            self.assertIsInstance(cmd, list); self.assertFalse(kwargs.get("shell", False)); calls.append(cmd)
            if cmd[0] == "ffprobe": return subprocess.CompletedProcess(cmd, 0, "6.0", "")
            if "render" in cmd or cmd[0] == "ffmpeg":
                dest = Path(cmd[cmd.index("--output") + 1] if "render" in cmd else cmd[-1])
                dest.parent.mkdir(parents=True, exist_ok=True); dest.write_bytes(b"new media"); os.utime(dest, (1001, 1001))
            return subprocess.CompletedProcess(cmd, 0, "ok", "")
        module.time = types.SimpleNamespace(time=lambda: 1000)
        return proj, chunks, out, calls, child

    def test_EV04_failed_render_tool_preserves_log_and_stops(self):
        m = self.module("render"); log = self.root / "render.log"
        with patch.object(subprocess, "run", return_value=subprocess.CompletedProcess([], 7, "partial output", "failed")):
            with self.assertRaisesRegex(RuntimeError, "failed"):
                m.sh(["npx", "literal"], log=str(log))
        self.assertEqual(log.read_text(encoding="utf-8"), "partial outputfailed")

    def project(self, name="scene"):
        proj = self.root / "hf" / name
        proj.mkdir(parents=True)
        (proj / "index.html").write_text('<div data-composition-id="scene" data-duration="1"></div>', encoding="utf-8")
        return proj

    def test_EV04_failed_render_never_exports_existing_raw(self):
        m = self.module("finalize"); proj = self.project()
        raw = proj / "out" / "scene_final_raw.mp4"; raw.parent.mkdir(); raw.write_bytes(b"old render")
        m.lufs = Mock(side_effect=AssertionError("must not export stale raw"))
        with patch.object(subprocess, "run", return_value=subprocess.CompletedProcess([], 1, "", "lint failed")), self.argv("scene", "deliver"):
            with self.assertRaisesRegex(RuntimeError, "lint failed"): m.main()
        self.assertEqual(raw.read_bytes(), b"old render")
        m.lufs.assert_not_called()

    def test_EV06_finalize_passes_literal_scene_and_output_paths(self):
        m = self.module("finalize"); name = "scene $(`literal`) café"
        raw = self.root / "hf" / name / "out" / f"{name}_final_raw.mp4"
        calls = []
        def child(cmd, **kwargs):
            self.assertIsInstance(cmd, list); self.assertFalse(kwargs.get("shell", False)); calls.append(cmd)
            raw.parent.mkdir(parents=True); raw.write_bytes(b"fresh")
            return subprocess.CompletedProcess(cmd, 0, "rendered", "")
        m.lufs = Mock(side_effect=StopAtImage)
        with patch.object(subprocess, "run", side_effect=child), self.argv(name, "deliver"), self.assertRaises(StopAtImage): m.main()
        self.assertEqual(calls[0][2:4], [str(self.root), name])
        self.assertEqual(calls[0][calls[0].index("--out") + 1], str(raw))

    def test_EV06_plain_export_probes_literal_input_without_shell(self):
        # export_final is a top-level CLI. Run its real entry until its first media-processing boundary.
        cfg = self.root / "config.json"; cfg.write_text('{"fps":30}', encoding="utf-8")
        (self.root / "cut").mkdir()
        calls = []
        def child(cmd, **kwargs):
            self.assertIsInstance(cmd, list); self.assertFalse(kwargs.get("shell", False)); calls.append(cmd)
            if cmd[0] == "ffprobe": return subprocess.CompletedProcess(cmd, 0, "5.0", "")
            raise StopAtImage
        with patch.dict(sys.modules, {"common": self.common, "finalize": types.ModuleType("finalize")}), \
             patch.object(sys, "path", list(sys.path)), patch.object(os, "popen", side_effect=AssertionError("implicit shell")), \
             patch.object(subprocess, "run", side_effect=child), self.argv("v1", str(self.root / "dest"), "Name"), self.assertRaises(StopAtImage):
            runpy.run_path(str(SCRIPTS / "export_final.py"), run_name="__main__")
        self.assertEqual(calls[0][-1], str(self.root / "cut/transitions_v1.mp4"))

    def test_EV04_explicit_use_raw_and_clean_do_not_start_a_render(self):
        for name, extra in [("scene", ["--use-raw"]), ("--clean", [])]:
            m = self.module("finalize")
            raw = self.root / ("hf/scene/out/scene_final_raw.mp4" if name == "scene" else "cut/clean_v1.mp4")
            raw.parent.mkdir(parents=True, exist_ok=True); raw.write_bytes(b"chosen raw")
            m.lufs = Mock(side_effect=StopAtImage)
            with self.argv(name, "deliver", *extra), self.assertRaises(StopAtImage): m.main()
            m.lufs.assert_called_once_with(str(raw))

    def test_EV06_render_arguments_stay_literal(self):
        m = self.module("render")
        name = "space $(`probe`) café"
        proj = self.project(name)
        calls = []
        def child(cmd, **kwargs):
            self.assertIsInstance(cmd, list)
            self.assertFalse(kwargs.get("shell", False))
            calls.append(cmd)
            if "render" in cmd:
                target = Path(cmd[cmd.index("--output") + 1]); target.write_bytes(b"new"); os.utime(target, (1001, 1001))
            return subprocess.CompletedProcess(cmd, 0, "ok", "")
        m.time = types.SimpleNamespace(time=lambda: 1000)
        with patch.object(subprocess, "run", side_effect=child), patch.object(m.shutil, "which", return_value="npx"), self.argv(name, "--skip-inspect"):
            m.main()
        self.assertIn(str(proj), calls[0])
        self.assertEqual(calls[-1][-1], str(proj / "out" / f"{name}_standard.mp4"))

    def test_EV06_windows_npx_shim_uses_node_cli_without_shell(self):
        m = self.module("render")
        npx = self.root / "npm" / "npx.cmd"; cli = npx.parent / "node_modules/npm/bin/npx-cli.js"
        cli.parent.mkdir(parents=True); cli.write_text("// fixture", encoding="utf-8")
        with patch.object(m.shutil, "which", side_effect=lambda key: str(npx) if key.startswith("npx") else "node.exe"):
            argv = m.hyperframes_command("lint", "path & quoted")
        self.assertEqual(argv, ["node.exe", str(cli), "-y", m.HF, "lint", "path & quoted"])
        cli.unlink()
        with patch.object(m.shutil, "which", return_value=str(npx)), self.assertRaisesRegex(RuntimeError, "npx-cli"):
            m.hyperframes_command("lint", "path")
        with patch.object(m.shutil, "which", return_value=None), self.assertRaisesRegex(RuntimeError, "npx not found"):
            m.hyperframes_command("lint", "path")

    def test_EV08_source_aliases_are_rejected_before_mutation(self):
        m = self.module("render"); self.project()
        original = self.root / "original.mp4"; original.write_bytes(b"recording")
        aliases = [original, self.root / "sub" / ".." / original.name]
        (self.root / "sub").mkdir()
        hard = self.root / "hard.mp4"; os.link(original, hard); aliases.append(hard)
        link = self.root / "link.mp4"
        try: link.symlink_to(original); aliases.append(link)
        except OSError as error:
            if os.name != "nt" or error.winerror != 1314: raise
            print("symlink variant unavailable: Windows privilege 1314; hardlink and canonical cases still run")
        for field in ("path", "padded_from", "fixed_from", "source"):
            self.cfg["clips"] = [{"path": str(self.root / "derived.mp4"), **({field: str(original)} if field != "source" else {})}]
            self.cfg["source"] = str(original) if field == "source" else str(self.root / "folder")
            for alias in aliases:
                with self.subTest(field=field, alias=alias), self.argv("scene", "--out", str(alias)):
                    with self.assertRaisesRegex(SystemExit, "source"): m.main()
                self.assertEqual(original.read_bytes(), b"recording")

    def test_EV08_normal_derived_output_can_be_replaced(self):
        m = self.module("render"); proj = self.project()
        out = proj / "out" / "scene_standard.mp4"; out.parent.mkdir(); out.write_bytes(b"old")
        def child(cmd, **kwargs):
            self.assertFalse(kwargs.get("shell", False))
            if "render" in cmd: out.write_bytes(b"new"); os.utime(out, (1001, 1001))
            return subprocess.CompletedProcess(cmd, 0, "ok", "")
        m.time = types.SimpleNamespace(time=lambda: 1000)
        with patch.object(subprocess, "run", side_effect=child), patch.object(m.shutil, "which", return_value="npx"), self.argv("scene", "--skip-inspect"):
            m.main()
        self.assertEqual(out.read_bytes(), b"new")

    def test_EV08_sidecar_alias_is_denied_before_deleting_derived_video(self):
        m = self.module("render")
        original = self.root / "original.mp4"; original.write_bytes(b"recording")
        self.cfg["clips"] = [{"path": str(original)}]
        out = self.root / "new.mp4"; out.write_bytes(b"earlier derived render")
        log = out.with_suffix(".log"); os.link(original, log)
        with self.assertRaisesRegex(SystemExit, "source"):
            m.render_one(str(self.root), 30, "high", str(out), self.cfg)
        self.assertEqual(original.read_bytes(), b"recording")
        self.assertEqual(out.read_bytes(), b"earlier derived render")

    def test_EV08_every_chunk_owned_write_preserves_source_aliases(self):
        targets = ["c00/asset.txt", "c00/asset.txt/asset.txt", "c00/images/card.txt", "c00/face.mp4", "c00/index.html",
                   "c00/out/chunk.mp4", "c00/out/chunk.log", "concat.txt", "video.mp4", "final.mp4"]
        for index, target in enumerate(targets):
            with self.subTest(target=target):
                m = self.module("render")
                base = self.root / str(index)
                proj, chunks, out, calls, child = self.chunk_fixture(m, base)
                original = base / "original.mp4"; original.write_bytes(b"recording")
                self.cfg["clips"] = [{"path": str(original)}]
                destination = out if target == "final.mp4" else chunks / target
                destination.parent.mkdir(parents=True, exist_ok=True); os.link(original, destination)
                with patch.object(subprocess, "run", side_effect=child), patch.object(m.shutil, "which", return_value="npx"), \
                     self.assertRaisesRegex(SystemExit, "source"):
                    m.chunked(str(proj), "scene", 1, "high", str(out), 12, 6, self.cfg)
                self.assertEqual(original.read_bytes(), b"recording")
                self.assertFalse(any(cmd[-1] == str(destination) for cmd in calls))

    def test_EV06_chunk_manifest_preserves_ordinary_apostrophe_and_unicode_paths(self):
        for name in ("ordinary", "owner's café 日本"):
            m = self.module("render")
            proj, chunks, out, calls, child = self.chunk_fixture(m, self.root / name)
            nested = chunks / "c00/asset.txt/asset.txt"
            nested.parent.mkdir(parents=True); nested.write_text("old asset", encoding="utf-8")
            with patch.object(subprocess, "run", side_effect=child), patch.object(m.shutil, "which", return_value="npx"):
                m.chunked(str(proj), "scene", 1, "high", str(out), 12, 6, self.cfg)
            manifest = (chunks / "concat.txt").read_text(encoding="utf-8")
            paths = [shlex.split(line) for line in manifest.splitlines()]
            self.assertEqual(paths, [["file", str(chunks / f"c{k:02d}/out/chunk.mp4").replace(os.sep, "/")] for k in range(2)])
            self.assertEqual(out.read_bytes(), b"new media")
            self.assertEqual(nested.read_text(encoding="utf-8"), "asset")
            concat_call = next(cmd for cmd in calls if "concat" in cmd)
            self.assertEqual(concat_call[concat_call.index("-i") + 1], str(chunks / "concat.txt"))
        self.assertEqual(m.concat_entry("/mnt/share/file 3'.wav"), "file '/mnt/share/file 3'\\''.wav'\n")
        for path in ("line\nbreak.mp4", "line\rbreak.mp4"):
            with self.assertRaisesRegex(ValueError, "line breaks"): m.concat_entry(path)


class ModelAndGeometryContracts(OfflineCase):
    def response(self, result, reason="stop", **message):
        return {"choices": [{"finish_reason": reason, "message": {"content": json.dumps(result), **message}}]}

    def voice_fixture(self, old, heard, language="en"):
        """Drive the real apply/reject CLI; only audio arithmetic, I/O and ASR are doubles."""
        m = self.module("fix_word")
        d = Path(tempfile.mkdtemp(prefix="voice-", dir=self.root))
        scratch = d / "scratch"; scratch.mkdir()
        m.tempfile = types.SimpleNamespace(mkdtemp=lambda **kwargs: str(scratch))
        source = d / "source.mp4"; source.write_bytes(b"original video")
        self.cfg["clips"] = [{"key": "c1", "path": str(source), "dur": 10}]
        self.cfg["language"] = language
        self.cfg.pop("voice_fixes", None); self.data.clear()
        self.data["words.json"] = {"c1": [{"w": w, "s": 2 + i * .2, "e": 2.15 + i * .2} for i, w in enumerate(old.split())]}
        class Audio:
            # No signal processing is simulated; only valid sample lengths cross the media seam.
            def __init__(self, size): self.size = size
            def __len__(self): return self.size
            def copy(self): return Audio(self.size)
            def __getitem__(self, key): return Audio(len(range(*key.indices(self.size)))) if isinstance(key, slice) else 0.0
            def __setitem__(self, key, value):
                if isinstance(key, slice): self_case.assertEqual(len(self[key]), len(value))
            def __mul__(self, other):
                if isinstance(other, Audio): self_case.assertEqual(len(self), len(other))
                return self.copy()
            __rmul__ = __add__ = __radd__ = __sub__ = __rsub__ = __truediv__ = __pow__ = __iadd__ = __mul__
        self_case = self
        clip, speech = Audio(480000), Audio(216000)
        m.ws = lambda: (str(d), self.cfg)
        m.HOP = .01; m.np.float32 = float
        m.np.argmin = lambda *args, **kwargs: 0
        m.np.mean = lambda *args, **kwargs: 0.0
        m.np.resize = lambda value, size: Audio(size)
        m.np.linspace = lambda start, stop, num, **kwargs: Audio(num)
        m.wav = lambda src, dst, **kwargs: dst
        m.read_wav = lambda path: (clip, 48000)
        m.envelope = lambda *args: Audio(1000)
        m.pcm = lambda *args, **kwargs: speech
        m.speech_rms = lambda value: 1.0
        m.write_wav = Mock()
        m.reference = lambda *args: [(str(d / "ref.wav"), "reference", "fixture", 10)]
        m.openrouter.settings = lambda cfg: {"voice": "fixture/voice"}
        m.openrouter.speech = Mock(side_effect=AssertionError("--use must not request voice generation"))
        words = [types.SimpleNamespace(word=w, start=2 + i * .2, end=2.15 + i * .2, probability=.99) for i, w in enumerate(heard.split())]
        def transcribe(*args, **kwargs):
            self.assertEqual(kwargs["language"], language)
            return [types.SimpleNamespace(words=words)], None
        m.asr_model = lambda *args: types.SimpleNamespace(transcribe=transcribe)
        candidate = d / "candidate.wav"; candidate.write_bytes(b"synthetic decoded audio")
        def mux(cmd, **kwargs):
            self.assertEqual(cmd[0], "ffmpeg")
            target = Path(cmd[-1]); self.assertEqual(target.parent, d / "clips_fixed")
            target.write_bytes(b"derived video")
            return subprocess.CompletedProcess(cmd, 0, "", "")
        return m, d, source, candidate, mux

    def test_EV09_completed_review_accepts_empty_and_valid_notes(self):
        m = self.module("video_review")
        for notes in ([], [{"t": "0:01", "end": "0:02", "type": "audio", "what": "click", "why": "audible", "fix": "trim"}]):
            result = {"notes": notes, "overall": "Checked"}
            self.assertEqual(m.parse_review(self.response(result), 3), result)
        fenced = self.response({"notes": [], "overall": "Checked"})
        fenced["choices"][0]["message"]["content"] = '```json\n{"notes":[],"overall":"Checked"}\n```'
        self.assertEqual(m.parse_review(fenced, 3)["notes"], [])

    def test_EV09_incomplete_refused_malformed_or_out_of_range_reviews_fail(self):
        m = self.module("video_review")
        good = {"notes": [], "overall": "Checked"}
        cases = [self.response(good, reason) for reason in ("length", "content_filter", "error", "tool_calls", None)]
        cases += [self.response(good, refusal="cannot review"), {}, {"choices": []}, {"choices": [None]},
                  {"choices": [{"finish_reason": "stop", "message": None}]}, self.response(good, content=None)]
        cases += [self.response(x) for x in ([], None, {"notes": None, "overall": "bad"},
                                            {"notes": [None], "overall": "bad"}, {"notes": [], "overall": 1})]
        for t, end in [("NaN", None), (-1, None), (4, None), (1, 0), (1, "Infinity")]:
            cases.append(self.response({"notes": [{"t": t, "end": end, "type": "audio", "what": "x", "why": "x", "fix": "x"}], "overall": "x"}))
        note = {"t": 0, "end": None, "type": "audio", "what": "x", "why": "x", "fix": "x"}
        for change in ({"type": "unknown"}, {"what": None}, {"t": True}, {"t": {}}, {"t": "bad"}):
            cases.append(self.response({"notes": [{**note, **change}], "overall": "x"}))
        cases.append(self.response({"notes": [note] * 16, "overall": "x"}))
        for response in cases:
            with self.subTest(response=response), self.assertRaises(ValueError): m.parse_review(response, 3)
        for raw in ("I cannot review", '{"notes":', "prefix {} suffix"):
            response = self.response(good); response["choices"][0]["message"]["content"] = raw
            with self.subTest(raw=raw), self.assertRaises(ValueError): m.parse_review(response, 3)
        for duration in (0, -1, float("nan"), float("inf")):
            with self.subTest(duration=duration), self.assertRaises(ValueError): m.parse_review(self.response(good), duration)

    def test_EV09_invalid_review_is_not_saved_as_success(self):
        m = self.module("video_review")
        proxy = self.root / "proxy.mp4"
        m.tempfile = types.SimpleNamespace(mkdtemp=lambda **kwargs: str(self.root))
        m.joins = lambda *args: []
        m.openrouter.settings = lambda cfg: {"review": "fixture/model"}
        m.openrouter.call = Mock(return_value=self.response({"notes": [], "overall": "truncated"}, "length"))
        def child(cmd, **kwargs):
            if cmd[0] == "ffmpeg": proxy.write_bytes(b"synthetic")
            return subprocess.CompletedProcess(cmd, 0, "3", "")
        with patch.object(subprocess, "run", side_effect=child), self.argv("video.mp4"), self.assertRaisesRegex(ValueError, "incomplete"):
            m.main()
        self.assertFalse(any(key.startswith("check/review_") for key in self.data))

    def test_EV10_numeric_units_and_decimals_are_meaningful(self):
        m = self.module("fix_word")
        for a, b in [("75%", "seventy-five percent"), ("75 per cent", "75 percent"),
                     ("1.25", "one point two five"), ("one hundred", "100"), ("ordinary words", "ordinary words")]:
            self.assertEqual(m.norm(a), m.norm(b))
        for a, b in [("75 percent", "75"), ("one point five", "one five"), ("1.25", "125"),
                     ("per request", "request"), ("one cent", "one")]:
            self.assertNotEqual(m.norm(a), m.norm(b))

    def test_EV10_leading_fraction_preserves_decimal_meaning(self):
        m = self.module("fix_word")
        for digits, spoken in [("5", "five"), ("05", "zero five"), ("25", "two five")]:
            for prefix in ("", "rate "):
                with self.subTest(digits=digits, prefix=prefix):
                    fraction = prefix + "." + digits + "%"
                    self.assertEqual(m.norm(fraction), m.norm(prefix + "0." + digits + "%"))
                    self.assertEqual(m.norm(fraction), m.norm(prefix + "zero point " + spoken + " percent"))
                    self.assertNotEqual(m.norm(fraction), m.norm(prefix + digits + "%"))
        self.assertNotEqual(m.norm(".5%"), m.norm("five percent"))

    def test_EV10_signed_values_and_ordered_numeric_groups_are_required(self):
        m = self.module("fix_word")
        for text, spoken in [("-5%", "minus five percent"), ("−.5%", "minus zero point five percent")]:
            self.assertEqual(m.norm(text), m.norm(spoken))
            self.assertNotEqual(m.norm(text), m.norm(text.lstrip("-−")))
        for text, spoken in [("COVID-19", "covid nineteen"), ("GPT-5", "gpt five"), ("seventy-five", "75")]:
            self.assertEqual(m.norm(text), m.norm(spoken))
        template = "I saw {} growth in the total count of requests on the new production server today"
        old, want, heard = [m.norm(template.format(value)) for value in ("1.24%", "1.25%", "1.52%")]
        score, _, _ = m.word_match(want, heard, set(old) - set(want), set(want) - set(old))
        self.assertLess(score, .9)
        self.assertLess(m.word_match(m.norm("1.2 and 5"), m.norm("1.25"), set(), set())[0], .9)
        prose = m.norm("these ordinary words make a fairly long sentence with enough text to tolerate one minor transcription difference at the end")
        changed = prose[:-1] + ["ending"]
        self.assertGreaterEqual(m.word_match(prose, changed, set(), set())[0], .9)
        self.assertLess(m.word_match(prose, prose + ["stale"], {"stale"}, set())[0], .9)
        self.assertLess(m.word_match(prose + ["fresh"], prose, set(), {"fresh"})[0], .9)

    def test_EV12_empty_requests_fail_before_media_or_provider_work(self):
        m = self.module("fix_word")
        m.openrouter.settings = Mock(side_effect=AssertionError("invalid request reached provider setup"))
        for text in ("", "   ", "?!", "''"):
            with self.subTest(text=text), self.argv("c1", "2", "4", text), self.assertRaisesRegex(SystemExit, "no verifiable words"):
                m.main()
        m.openrouter.settings.assert_not_called()
        self.assertEqual(self.data, {})
        self.assertEqual(m.norm("你好世界"), ["你好世界"])
        self.assertNotEqual(m.norm("你好世界"), m.norm("完全不同"))
        self.assertLess(m.word_match([], [], set(), set())[0], .9)

    def test_EV10_unchanged_unit_cannot_disappear_inside_fuzzy_prose(self):
        m = self.module("fix_word")
        template = "I saw {} in the sample we sent to the editor for the final analysis today"
        old, want = [m.norm(template.format(value)) for value in ("4 minutes", "5 minutes")]
        removed, added = set(old) - set(want), set(want) - set(old)
        for value in ("5", "5 seconds"):
            with self.subTest(value=value):
                self.assertLess(m.word_match(want, m.norm(template.format(value)), removed, added)[0], .9)
        self.assertGreaterEqual(m.word_match(want, m.norm(template.format("five minutes")), removed, added)[0], .9)
        self.assertLess(m.word_match(m.norm("5 minutes"), m.norm("five"), set(), set())[0], .9)

    def test_EV10_EV12_rejected_voice_keeps_config_words_and_source(self):
        template = "I saw {} growth in the total count of requests on the new production server today"
        cases = [(template.format("1.24%"), template.format("1.25%"), template.format("1.52%")),
                 ("six percent", "-5%", "five percent"), ("原来的句子", "你好世界", "完全不同"),
                 ("old words", "new words", "")]
        units = "I saw {} in the sample we sent to the editor for the final analysis today"
        cases += [(units.format("4 minutes"), units.format("5 minutes"), units.format(value))
                  for value in ("5", "5 seconds")]
        for old, wanted, heard in cases:
            with self.subTest(wanted=wanted, heard=heard):
                m, d, source, candidate, mux = self.voice_fixture(old, heard, language="zh" if wanted == "你好世界" else "en")
                before_cfg, before_words = copy.deepcopy(self.cfg), copy.deepcopy(self.data["words.json"])
                with patch.object(subprocess, "run", side_effect=mux), self.argv("c1", "2", "8", wanted, "--use", str(candidate)), \
                     self.assertRaisesRegex(SystemExit, "NOT APPLIED"):
                    m.main()
                self.assertEqual(self.cfg, before_cfg)
                self.assertEqual(self.data["words.json"], before_words)
                self.assertNotIn("config.json", self.data)
                self.assertFalse((d / "clips_fixed").exists())
                self.assertEqual(source.read_bytes(), b"original video")

    def test_EV10_EV12_equivalent_voice_applies_only_derived_output(self):
        for old, wanted, heard in [("growth was 1.24%", "growth was 1.25%", "growth was one point two five percent"),
                                   ("原来的句子", "你好世界", "你好世界"),
                                   ("I saw 4 minutes in the sample", "I saw 5 minutes in the sample", "I saw five minutes in the sample")]:
            with self.subTest(wanted=wanted):
                m, d, source, candidate, mux = self.voice_fixture(old, heard, language="zh" if wanted == "你好世界" else "en")
                with patch.object(subprocess, "run", side_effect=mux), self.argv("c1", "2", "8", wanted, "--use", str(candidate)):
                    m.main()
                saved = self.data["config.json"]
                self.assertEqual(saved["voice_fixes"][-1]["to"], wanted)
                self.assertGreaterEqual(saved["voice_fixes"][-1]["match"], .9)
                self.assertEqual(saved["clips"][0]["fixed_from"], str(source))
                self.assertEqual(Path(saved["clips"][0]["path"]).read_bytes(), b"derived video")
                self.assertEqual(source.read_bytes(), b"original video")
                self.assertEqual([word["w"] for word in self.data["words.json"]["c1"]], heard.split())

    def test_EV09_saved_note_intervals_use_the_whole_video_clock(self):
        m = self.module("video_review")
        proxy = self.root / "proxy.mp4"
        m.tempfile = types.SimpleNamespace(mkdtemp=lambda **kwargs: str(self.root))
        m.joins = lambda *args: []
        m.openrouter.settings = lambda cfg: {"review": "fixture/model"}
        def child(cmd, **kwargs):
            if cmd[0] == "ffmpeg": proxy.write_bytes(b"synthetic")
            return subprocess.CompletedProcess(cmd, 0, "30", "")
        for offset in (0, 60, 125.5):
            with self.subTest(offset=offset):
                note = {"t": "0:05", "end": "0:08", "type": "audio", "what": "click", "why": "audible", "fix": "trim"}
                m.openrouter.call = Mock(return_value=self.response({"notes": [note, {**note, "end": None}], "overall": "Checked"}))
                extra = ["--from", str(offset), "--to", str(offset + 30)] if offset else []
                with patch.object(subprocess, "run", side_effect=child), self.argv("video.mp4", *extra): m.main()
                saved = self.data["check/review_fixture-model.json"]
                self.assertEqual(saved["notes"][0]["t_s"], offset + 5)
                self.assertEqual(saved["notes"][0]["t"], m.mmss(offset + 5))
                self.assertEqual(saved["notes"][0]["end"], m.mmss(offset + 8))
                self.assertIsNone(saved["notes"][1]["end"])
                self.assertEqual(saved["section"], [offset, offset + 30 if offset else None])

    def test_EV09_review_uses_actual_audio_and_split_picture_joins(self):
        m = self.module("video_review")
        m.tempfile = types.SimpleNamespace(mkdtemp=lambda **kwargs: str(self.root))
        m.openrouter.settings = lambda cfg: {"review": "fixture/model"}
        folder = self.root / "cut"; folder.mkdir(exist_ok=True)
        timeline_path = folder / "timeline_v1.json"
        for variant, override, expected in [("ordinary", {}, [5.0]), ("split", {"s0": 2}, [2.0, 5.0]),
                                             ("legacy", {}, [5.0])]:
            timeline = self.assemble([(0, 5), (3, 8)], override)
            if variant == "legacy":
                for segment in timeline: segment.pop("v_out_end")
            timeline_path.write_text(json.dumps(timeline), encoding="utf-8")
            self.assertEqual(m.joins(str(self.root), "render_v1.mp4", None), expected)
            self.assertEqual(m.joins(str(self.root), "render.mp4", "v1"), expected)
            for offset in (0, 1):
                with self.subTest(variant=variant, offset=offset):
                    def child(cmd, **kwargs):
                        if cmd[0] == "ffmpeg": (self.root / "proxy.mp4").write_bytes(b"synthetic")
                        return subprocess.CompletedProcess(cmd, 0, str(11 if cmd[-1] != str(self.root / "proxy.mp4") else 11 - offset), "")
                    notes = [{"t": time - offset, "end": None, "type": "cut", "what": "jump at cut",
                              "why": "visible", "fix": "inspect"} for time in expected]
                    m.openrouter.call = Mock(return_value=self.response({"notes": notes, "overall": "Checked"}))
                    extra = ["--from", str(offset), "--to", "11"] if offset else []
                    # No tag or matching filename: exercise the real duration-based timeline selection too.
                    with patch.object(subprocess, "run", side_effect=child), self.argv("render.mp4", *extra): m.main()
                    saved = self.data["check/review_fixture-model.json"]
                    for note, time in zip(saved["notes"], expected):
                        self.assertEqual(note["t_s"], time)
                        self.assertEqual(note["nearest_cut"], m.mmss(time))
                        self.assertNotIn("check", note)
                    prompt = m.openrouter.call.call_args.args[3]["messages"][0]["content"][0]["text"]
                    self.assertIn("audio and/or picture", prompt)
                    for time in expected: self.assertIn(m.mmss(time - offset), prompt)

    def test_EV05_empty_and_detected_faces_preserve_manual_bubble_geometry(self):
        m = self.module("screen_bubble")
        self.cfg["screen_cuts"] = {"a1": "cut/screen_a1.mp4"}
        self.data["cut/timeline_a1.json"] = [{"clip": "c1"}]
        for faces in ({}, {"c1": {"cx": 900, "cy": 400, "h": 250}}):
            self.data["faces.json"] = faces
            self.cfg["bubble_layout"] = {"src_r": 100, "src_cx": 800, "src_cy": 450}
            output = io.StringIO(); m.covered = Mock(return_value=0)
            with self.argv(), contextlib.redirect_stdout(output), self.assertRaises(StopAtImage): m.main()
            self.assertIn("source circle r=100 at (800,450)", output.getvalue())
            self.assertEqual("WARN no faces" in output.getvalue(), not bool(faces))

    def test_EV05_missing_faces_allow_default_geometry_and_manual_panel(self):
        m = self.module("screen_bubble")
        self.cfg["screen_cuts"] = {"a1": "cut/screen_a1.mp4"}
        self.data["cut/timeline_a1.json"] = [{"clip": "c1"}]
        self.data["faces.json"] = {}
        m.covered = Mock(return_value=0)
        output = io.StringIO()
        with self.argv(), contextlib.redirect_stdout(output), self.assertRaises(StopAtImage): m.main()
        self.assertIn("source circle r=491 at (960,491)", output.getvalue())
        self.data["faces.json"] = {"c1": {"cx": 900, "cy": 400, "h": 250}}
        output = io.StringIO()
        with self.argv(), contextlib.redirect_stdout(output), self.assertRaises(StopAtImage): m.main()
        self.assertIn("source circle r=295 at (900,435)", output.getvalue())
        self.cfg["panel_layout"] = {"src_cx": 800, "src_cy": 450, "src_h": 400}
        output = io.StringIO()
        with self.argv("--panel"), contextlib.redirect_stdout(output), self.assertRaises(StopAtImage): m.main()
        self.assertIn("at (800,450)", output.getvalue())

    def test_EV11_doctor_warns_for_obsolete_node_without_installing_tools(self):
        for major, expected in [(20, "WARN"), (22, "OK"), (24, "OK")]:
            m = self.module("doctor"); original_row = m.row
            def row(state, name, detail, fix=""):
                original_row(state, name, detail, fix)
                if name == "node": raise StopAtImage
            m.row = row; m.sh = lambda cmd, **kwargs: (0, f"v{major}.0.0") if "--version" in cmd else (1, "")
            with patch.object(m.shutil, "which", side_effect=lambda key: "node" if key == "node" else None), \
                 patch.object(m.importlib, "import_module", return_value=types.SimpleNamespace(__version__="fixture")), \
                 patch.dict(sys.modules, {"cv2": None, "torch": None, "torchaudio": None, "playwright": None, "common": self.common}), \
                 self.argv(), self.assertRaises(StopAtImage):
                m.main()
            self.assertEqual(next(r[0] for r in m.ROWS if r[1] == "node"), expected)

    def test_EV13_missing_footage_fails_closed_and_guard_routes_to_voiceover(self):
        m = self.module("init_workspace")
        empty = self.root / "empty-folder"
        empty.mkdir()
        with patch.object(sys, "argv", ["init_workspace.py", str(empty), "--out", str(self.root / "ws"), "--no-sync"]):
            with self.assertRaisesRegex(SystemExit, "No video files"):
                m.main()
        skill_root = Path(__file__).resolve().parents[1]
        skill_md = (skill_root / "SKILL.md").read_text(encoding="utf-8")
        self.assertIn("/usr/bin/say", skill_md)
        self.assertIn("SAPI5", skill_md)
        self.assertIn("edge-tts", skill_md)
        self.assertIn("voiceover", skill_md)
        pyproject = (SCRIPTS / "pyproject.toml").read_text(encoding="utf-8")
        for forbidden in ("sherpa-onnx", "kokoro", "piper-tts", "edge-tts"):
            self.assertNotIn(forbidden, pyproject)


if __name__ == "__main__":
    unittest.main()
