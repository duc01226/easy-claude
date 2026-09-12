'use strict';

const assert = require('node:assert/strict');
const { EXAMPLE_SPEC, generatePresentation, normalizeSpec } = require('../scripts/create-presentation.cjs');
const { validatePresentation } = require('../scripts/validate-presentation.cjs');

const html = generatePresentation(EXAMPLE_SPEC);
const validation = validatePresentation(html, { file: 'generated-fixture.html' });

assert.equal(validation.ok, true, `generated fixture failed: ${validation.errors.join('; ')}`);
assert.equal(validation.slideCount, 2);
assert.equal(validation.notesCount, 2);
assert.match(html, /data-action="toggle-notes"/);
assert.match(html, /data-action="toggle-edit"/);
assert.match(html, /localStorage/);
assert.match(html, /requestFullscreen/);
assert.match(html, /prefers-reduced-motion/);
assert.match(html, /@media print/);
assert.match(html, /data-action="overview"/);
assert.match(html, /case 'close-overview': closeOverview\(\)/);
assert.match(html, /meta name="presentation-id"/);
assert.match(html, /presentation-asset-policy" content="self-contained"/);
assert.match(html, /data-asset-policy="self-contained">Local assets only/);
assert.match(html, /data-action="close-notes"/);
assert.match(html, /Speaker notes are not included in print/);
assert.match(html, /\[contenteditable\].*\[data-editable\].*\[data-edit-key\]/s);
assert.match(html, /storageKey.*:v2/);
assert.match(html, /EDIT_FORMAT_VERSION = 2/);
assert.match(html, /Array\.isArray\(saved\.edits\)/);

const sanitized = generatePresentation({
  ...EXAMPLE_SPEC,
  id: 'sanitized',
  slides: EXAMPLE_SPEC.slides.map((slide, index) => ({
    ...slide,
    id: `sanitized-${index + 1}`,
    bodyHtml: '<p data-editable="true" onclick="alert(1)">Safe author copy</p><script>alert(2)</script>',
  })),
});
assert.doesNotMatch(sanitized, /<script>alert\(2\)<\/script>/);
assert.doesNotMatch(sanitized, /onclick=/i);

const oneSlide = normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.slice(0, 1) });
assert.equal(oneSlide.slides.length, 1);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: [] }), /at least one slide/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, id: '' }), /id must be a non-empty string/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, id: '' })) }), /slides\[0\]\.id/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, notes: { ...slide.notes, question: '' } })) }), /notes\.question/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, id: 'same-id' })) }), /duplicate slide id/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, blocks: [{ type: 'image', src: 'javascript:alert(1)', alt: 'bad' }] })) }), /javascript/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, blocks: [{ type: 'image', src: 'https://cdn.example.test/image.png', alt: 'network image' }] })) }), /external asset/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, bodyHtml: '<img src="https://cdn.example.test/image.png" alt="network image">' })) }), /external asset/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, slides: EXAMPLE_SPEC.slides.map((slide) => ({ ...slide, bodyHtml: '<img src=https://cdn.example.test/image.png alt="network image">' })) }), /external asset/);
assert.throws(() => normalizeSpec({ ...EXAMPLE_SPEC, theme: { ...EXAMPLE_SPEC.theme, font: 'url(https://cdn.example.test/font.woff2)' } }), /external URL/);

const external = generatePresentation({
  ...EXAMPLE_SPEC,
  allowExternalAssets: true,
  slides: EXAMPLE_SPEC.slides.map((slide) => ({
    ...slide,
    blocks: [{ type: 'image', src: 'https://cdn.example.test/image.png', alt: 'network image' }],
  })),
});
assert.match(external, /presentation-asset-policy" content="external-allowed"/);
assert.match(external, /data-asset-policy="external-allowed">Network assets enabled/);
assert.match(external, /https:\/\/cdn\.example\.test\/image\.png/);

console.log('create-presentation tests passed');
