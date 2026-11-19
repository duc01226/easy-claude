---
id: edit-video-skill
kind: notice
title: Edit recorded footage with edit-video
added: 2026-11-19
covers: ["skills@89c3771a7990"]
---

Use `/edit-video` in Claude Code or `$edit-video` in Codex to trim and stitch talking-head or screen recordings, add captions or motion-graphics B-roll, and export MP4 plus SRT. The skill includes its scripts, references, templates and transition sound under `.claude/skills/edit-video`.

Video processing uses Python 3.11 or 3.12 through uv and requires ffmpeg/ffprobe; follow the skill's setup instructions when using it. Importing the framework installs no video dependencies or models. The basic pipeline processes footage locally; cloud steps run only when requested, and voice cloning requires consent.
