---
id: common-skill-reminder-on-prompts
kind: notice
title: Common skill guidance now arrives on user prompts
added: 2026-11-18
covers:
  - hooks:UserPromptSubmit@fa8bc05be8ae
  - config:qualitySkillReminder@2454feafcd42
---

The assistant receives guidance for common skills on each genuine user prompt, including `fix` after root-cause
investigation. Tool results refresh the skill and shared protocol digests after 60 minutes or about 250,000 tokens of growth, whichever comes first. Projects can change either default through `qualitySkillReminder.reinjectAfterMinutes` and `qualitySkillReminder.reinjectAfterTokens` in the project config. The existing `qualitySkillReminder.enabled`
setting and `CK_QUALITY_SKILL_REMINDER=0` switch control both events.
