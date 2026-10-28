# Extract Design Guidelines from Existing Assets

Reverse-engineer design principles from existing images or videos to establish design guidelines.

## Purpose

- Analyze competitor designs to understand their approach
- Extract design systems from inspiration screenshots
- Learn from high-quality design examples
- Create documented guidelines based on visual analysis
- Establish consistent aesthetic direction from references

## Use Cases

- Analyzing competitor websites or apps
- Learning from inspiration galleries (Dribbble, Awwwards, Mobbin)
- Extracting design systems from brand materials
- Reverse-engineering successful interfaces
- Creating design documentation from visual references

## Quick Workflows

1. **Capture the references.** Live sites: `node .claude/skills/html-export/scripts/capture-sites.cjs --input=<targets.json> --out=tmp/design/<run>/references` writes desktop (1440x900) and phone (390x844) captures plus a manifest with each source and access date; read `.claude/skills/html-export/references/live-site-capture.md` first. Images or videos the user supplies are used as given.
2. **Analyze with the assistant's own vision.** Open each capture (for a video, its key frames) and apply the matching prompt from `extraction-prompts.md`: single image, multi-screen system, motion, or competitive analysis.
3. **Write the result** to the design-guidelines document the user asked for, citing each source with its access date. Patterns only: never copy a reference's assets, code or text.

## Detailed References

- `extraction-prompts.md` - All extraction prompt templates
- `extraction-best-practices.md` - Capture quality, analysis tips
- `extraction-output-templates.md` - Documentation formats

## Integration

After extraction, use guidelines with `asset-generation.md` for generating design-aligned visual assets.
