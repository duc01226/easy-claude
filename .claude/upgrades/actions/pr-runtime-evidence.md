---
id: pr-runtime-evidence
kind: notice
title: Pull requests now carry runtime evidence as text, and media is attached only after a yes
added: 2026-11-17
---

When a branch changes an observable surface (a UI, API, CLI or service output), `/pull-request` now adds a
"Runtime evidence" section to the PR body, copied as text from the `/experience-review` run on the same
tree: surfaces, statuses, judgments, BLOCKING count, acceptance status and feature-map entries. With no
review of that tree, the section says "No runtime evidence" and why. The body never links local `tmp/`
files. Screenshots or video are attached only after the user says yes for that pull request, and only
captures that were read and redacted. `/pr-review` reports a behavior change on an observable surface with
no runtime or test evidence, or with evidence from an older tree, as a finding.

Nothing to run. Tell the user that the next pull request may ask once whether to attach captures.
