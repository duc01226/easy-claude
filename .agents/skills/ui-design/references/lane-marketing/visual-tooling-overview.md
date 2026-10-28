# Visual Tooling for Frontend Design

Entry point for using available image generation, vision analysis, and media tooling to create and review visual assets that align with frontend design thinking and aesthetic guidelines.

## Contents

- [When to Use](#when-to-use)
- [Core Principles](#core-principles)
- [Workflow Quick Reference](#workflow-quick-reference)
- [Integration with Other Tools](#integration-with-other-tools)
- [Navigation](#navigation)
- [Quick Commands](#quick-commands)
- [Remember](#remember)

## When to Use

Use visual tooling in frontend design when you need to:

**Asset Generation**:
- Generate hero images, background assets, decorative elements
- Create placeholder images with specific aesthetic qualities
- Produce marketing visuals that match UI design language
- Generate icon sets, illustrations, or graphic elements
- Create texture overlays, gradient meshes, or background patterns
- Prototype visual concepts before implementing in code

**Visual Analysis**:
- Analyze generated assets to verify they meet design standards
- Compare multiple variations objectively with ratings
- Extract exact color palettes with hex codes for implementation
- Test assets with UI overlays for readability and contrast

**Design Extraction**:
- Extract design guidelines from existing images or videos
- Analyze competitor designs to understand their approach
- Reverse-engineer design systems from inspiration screenshots
- Create documented guidelines based on visual analysis
- Establish consistent aesthetic direction from references

## Core Principles

### 1. Design-Driven Generation
**NEVER** generate generic AI imagery. Every asset must align with:
- The chosen aesthetic direction (brutalism, maximalism, retro-futurism, etc.)
- Typography system and visual hierarchy
- Color palette and theme consistency
- Overall design story and purpose

### 2. Contextual Asset Creation
Assets aren't standalone—they're part of a cohesive interface. Consider:
- **Purpose**: Hero image vs. background texture vs. decorative element
- **Integration**: How it interacts with overlaid text, buttons, forms
- **Technical constraints**: File size, aspect ratio, responsive behavior
- **Accessibility**: Color contrast, text readability, decorative vs. informative

### 3. Analysis is Mandatory
Never integrate assets without comprehensive analysis:
- Score quality objectively (1-10 scale, minimum 7/10)
- Extract specific values: hex codes, not "blue"; px sizes, not "large"
- Compare multiple variations before deciding
- Test with UI overlays, not in isolation

### 4. Learn from Excellence
Extract design systems systematically from high-quality references:
- Analyze 3-5 screens to identify patterns
- Document actionably with CSS variables and exact values
- Validate predictions (fonts, colors) manually
- Adapt principles contextually, don't copy blindly

## Workflow Quick Reference

### For Asset Generation
**See**: `asset-generation.md`

1. Define design context (aesthetic, colors, typography, tone)
2. Craft design-driven prompts (not generic)
3. Generate with appropriate Imagen 4 model
4. Analyze and verify quality (score ≥ 7/10)
5. Iterate or integrate based on results

**Models**: imagen-4.0-generate-001 (standard), imagen-4.0-ultra-generate-001 (production), imagen-4.0-fast-generate-001 (iteration)

### For Visual Analysis
**See**: `visual-analysis.md`

1. Define evaluation criteria (context-specific)
2. Run comprehensive analysis with structured prompts
3. Compare multiple variations objectively
4. Extract color palettes with hex codes
5. Test integration with UI elements

**Model**: gemini-2.5-flash (vision understanding)

### For Design Extraction
**See**: `design-extraction.md`

1. Capture high-quality reference screenshots
2. Extract comprehensive design elements systematically
3. Analyze multiple screens for consistent patterns
4. Extract motion guidelines from videos (if applicable)
5. Document actionably with CSS-ready specifications

**Model**: gemini-2.5-flash (vision understanding)

## Integration with Other Tools

### With `ui-design`
Use `$ui-design` (its design knowledge and `--mode=review`) for design-system guidance and the quality bar, then use the available image generation and analysis tools for assets that follow those guidelines.

### With Browser Automation
Capture inspiration websites with `node .claude/skills/html-export/scripts/capture-sites.cjs` (desktop 1440x900 and phone 390x844, consent never accepted, sources and dates recorded) instead of an improvised script. Capture at the actual viewport size, not full-page scrolls.

### With the Project's Component Library
Generate and analyze assets first, then implement them with the project's own components and tokens, in colours and styles that complement the generated imagery.

### With the Project's Frontend Framework
Optimize generated assets for the project's framework: image optimization, responsive images, lazy loading.

### With Media Processing Tools
Post-process generated assets: resize, compress, add filters, create compositions using FFmpeg/ImageMagick.

## Navigation

**Detailed Workflows**:
- `asset-generation.md` - Complete generation workflow with prompt strategies
- `visual-analysis.md` - Analysis and verification workflow
- `design-extraction.md` - Extract guidelines from existing designs

**Additional Resources**:
- `technical-guide.md` - File optimization, examples, checklists, common pitfalls
- `animejs.md` - Animation implementation for frontend

## Quick Commands

- **Generate an asset:** use the image-generation tool the host provides, with a design-driven prompt; save the result under `tmp/` until it is approved.
- **Analyze an asset:** open the image with the assistant's own vision and check it against the evaluation criteria in `visual-analysis-overview.md`.
- **Extract design guidelines:** capture the references with `node .claude/skills/html-export/scripts/capture-sites.cjs`, then apply the prompts in `extraction-prompts.md`.

## Remember

1. **Design First, Generate Second**: Start with design thinking, not generation capabilities
2. **Context is King**: Every asset serves the interface, not itself
3. **Iterate Ruthlessly**: First generation is rarely final—evaluate and refine
4. **Analysis is Mandatory**: Never integrate without comprehensive verification (≥7/10)
5. **Demand Specifics**: Hex codes not "blue", px not "large", ms not "fast"
6. **Learn from Excellence**: Extract design systems from high-quality references systematically
7. **Adapt, Don't Copy**: Understand principles, apply contextually to your unique design

Generate assets that elevate frontend design, maintain aesthetic consistency, and serve user experience—never generic, always contextual.
