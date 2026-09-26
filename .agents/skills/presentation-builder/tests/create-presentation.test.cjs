'use strict';

const assert = require('node:assert/strict');
const vm = require('node:vm');
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

// The deck runtime is emitted through a template literal, which drops single backslashes. Every inline
// script must still parse, or the deck throws on load and none of its controls work.
const inlineScripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
assert.ok(inlineScripts.length > 0, 'generated deck has an inline runtime script');
for (const source of inlineScripts) {
  assert.doesNotThrow(() => new vm.Script(source), 'generated inline script must parse');
}

// Exercise the href check exactly as the browser receives it: a source-level test cannot see the
// template-literal escaping, so pull the emitted function out of the generated HTML and run it.
const emittedHrefCheck = /function isSafeHref\(value\) \{[\s\S]*?\n {8}\}/.exec(html);
assert.ok(emittedHrefCheck, 'generated runtime defines isSafeHref');
const isSafeHref = new vm.Script(`(${emittedHrefCheck[0]})`).runInNewContext({});
for (const allowed of ['https://example.test/a', 'http://example.test', 'HTTPS://example.test', 'mailto:someone@example.test', '#slide-2', '/relative/path', './relative']) {
  assert.equal(isSafeHref(allowed), true, `href ${JSON.stringify(allowed)} stays allowed`);
}
for (const rejected of [
  '//evil.test', 'javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', '\u0001javascript:alert(1)',
  'data:text/html,x', 'vbscript:x', '../up', '/\\evil.test', '/\t/evil.test', '/\n/evil.test', '/\r/evil.test',
  'https://ok.test/\u007f', '\\\\evil.test\\share',
]) {
  assert.equal(isSafeHref(rejected), false, `href ${JSON.stringify(rejected)} is removed`);
}

// The predicate only protects the deck if the emitted sanitizer consults it: edited and restored slide HTML
// goes through sanitizeEditableHtml. Run the EMITTED sanitizer against a minimal template DOM (the test stays
// dependency-free, so no real parser): the fake template builds a known node tree for the input key and
// serializes whatever the sanitizer leaves behind.
{
  // Given the emitted isSafeHref + sanitizeEditableHtml pair, loaded exactly as the browser receives them
  const emittedSanitizer = /function sanitizeEditableHtml\(value, preserveNoteAttributes = false\) \{[\s\S]*?\n {8}\}/.exec(html);
  assert.ok(emittedSanitizer, 'generated runtime defines sanitizeEditableHtml');

  class FakeNode {
    constructor() { this.parentNode = null; this.childNodes = []; }
    get firstChild() { return this.childNodes[0] || null; }
    append(...nodes) { nodes.forEach((node) => this.insertBefore(node, null)); return this; }
    insertBefore(node, ref) {
      if (node.parentNode) node.parentNode.removeChild(node);
      const at = ref ? this.childNodes.indexOf(ref) : this.childNodes.length;
      this.childNodes.splice(at, 0, node);
      node.parentNode = this;
      return node;
    }
    removeChild(node) {
      this.childNodes.splice(this.childNodes.indexOf(node), 1);
      node.parentNode = null;
      return node;
    }
    serializeChildren() { return this.childNodes.map((node) => node.serialize()).join(''); }
    querySelectorAll() {
      const found = [];
      const walk = (node) => node.childNodes.forEach((child) => { if (child.tagName) found.push(child); walk(child); });
      walk(this);
      return found;
    }
  }
  class FakeText extends FakeNode {
    constructor(text) { super(); this.text = text; }
    serialize() { return this.text; }
  }
  class FakeElement extends FakeNode {
    constructor(tagName, attrs = {}) { super(); this.tagName = tagName; this.attrs = new Map(Object.entries(attrs)); }
    get attributes() { return [...this.attrs].map(([name, value]) => ({ name, value })); }
    removeAttribute(name) { this.attrs.delete(name); }
    serialize() {
      const tag = this.tagName.toLowerCase();
      const attrs = [...this.attrs].map(([name, value]) => ` ${name}="${value}"`).join('');
      return `<${tag}${attrs}>${this.serializeChildren()}</${tag}>`;
    }
  }
  const el = (tagName, attrs, text) => new FakeElement(tagName, attrs).append(new FakeText(text));
  const trees = {
    'links-under-test': () => new FakeNode().append(
      el('A', { href: 'javascript:alert(1)' }, 'script link'),
      el('A', { href: 'JaVaScRiPt:alert(1)', title: 'tooltip' }, 'mixed case'),
      el('A', { href: '/\\evil.test' }, 'backslash'),
      el('A', { href: 'https://example.test/ok' }, 'good'),
      el('A', { href: '#slide-2' }, 'fragment'),
      el('SPAN', { href: 'https://example.test/span' }, 'not a link'),
      el('IMG', { src: 'x', onerror: 'alert(3)' }, ''),
    ),
  };
  const fakeDocument = {
    createElement(tag) {
      assert.equal(tag, 'template');
      const template = { content: new FakeNode() };
      Object.defineProperty(template, 'innerHTML', {
        set(value) { template.content = trees[value](); },
        get() { return template.content.serializeChildren(); },
      });
      return template;
    },
  };
  const sanitizeEditableHtml = new vm.Script(`${emittedHrefCheck[0]}\n${emittedSanitizer[0]}\nsanitizeEditableHtml;`)
    .runInNewContext({ document: fakeDocument });

  // When the sanitizer processes anchors with unsafe, safe and misplaced hrefs
  const output = sanitizeEditableHtml('links-under-test');

  // Then every unsafe href is stripped and the link text stays; safe anchors keep their href
  assert.equal(output, [
    '<a>script link</a>',
    '<a>mixed case</a>',
    '<a>backslash</a>',
    '<a href="https://example.test/ok">good</a>',
    '<a href="#slide-2">fragment</a>',
    '<span>not a link</span>',
  ].join(''));
  assert.doesNotMatch(output, /javascript|evil|onerror|<img/i);
}

// And the restore path runs saved edits through that sanitizer before they reach the slide
assert.match(html, /element\.innerHTML = sanitizeEditableHtml\(edit\.html\)/);

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
