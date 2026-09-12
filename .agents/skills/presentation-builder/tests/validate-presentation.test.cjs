'use strict';

const assert = require('assert/strict');
const { findSlides, validatePresentation } = require('../scripts/validate-presentation.cjs');

function validDeck(slideCount = 7) {
  const slides = Array.from({ length: slideCount }, (_, index) => `
    <section class="slide" data-slide-id="slide-${index + 1}" data-purpose="explain" data-principle="This slide advances the story">
      <header><h2>Slide ${index + 1}</h2></header>
      <div class="slide-body"><p>The claim and supporting context.</p></div>
      <template class="slide-notes"><p><strong>Say:</strong> Explain the claim.</p><p><strong>Why:</strong> Connect it to the audience.</p><p><strong>Evidence:</strong> Source and caveat.</p><p><strong>Transition:</strong> Move to the next claim.</p><p><strong>Timing:</strong> 00:30. <strong>Question:</strong> What changes next?</p></template>
    </section>`).join('\n');

  return `<!doctype html>
<html lang="en"><head><meta name="presentation-id" content="fixture"><style>
  @media print { .controls { display: none; } }
  @media (prefers-reduced-motion: reduce) { * { animation: none !important; } }
  button:focus-visible { outline: 3px solid currentColor; }
</style></head><body>
  <nav class="controls">
    <button aria-expanded="false" data-action="toggle-notes" aria-controls="notes-panel">Notes</button>
    <button aria-pressed="false" data-action="toggle-edit">Edit mode</button>
    <button data-action="previous">Previous</button><button data-action="next">Next</button>
    <button data-action="overview">All slides</button>
    <button data-action="reset">Reset</button><button data-action="export">Export</button>
  </nav>
  <aside id="notes-panel" role="dialog" aria-labelledby="notes-title"><h2 id="notes-title">Speaker notes</h2><button data-action="close-notes">Close</button><div id="notes-content" aria-live="polite"></div></aside>
  <div id="progress" aria-live="polite">Slide 1 of ${slideCount}</div><span id="print-note">Speaker notes are not included in print.</span>
  <img src="local-image.png" alt="A meaningful subject visual">
  <svg role="img" aria-label="A meaningful subject diagram"><title>Diagram</title><path d="M0 0" /></svg>
  <script>
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowRight' || event.key === 'PageDown' || event.key === 'Home' || event.key === 'End') goToSlide(event.key);
      if (event.key === 'ArrowLeft' || event.key === 'PageUp' || event.key === ' ') goToSlide(event.key);
    });
    document.querySelector('[data-action="toggle-edit"]').setAttribute('aria-pressed', 'true');
    document.querySelector('.editable').setAttribute('contenteditable', 'true');
    localStorage.setItem('presentation-builder:deck:v1', 'draft');
    document.documentElement.requestFullscreen().catch(showError);
  </script>
  ${slides}
</body></html>`;
}

function ids(result) {
  return result.checks.filter((check) => !check.pass).map((check) => check.id);
}

const good = validatePresentation(validDeck(), { file: 'fixture.html' });
assert.equal(findSlides(validDeck()).length, 7);
assert.equal(good.ok, true, `valid fixture failed: ${good.errors.join('; ')}`);
assert.equal(good.slideCount, 7);
assert.equal(good.notesCount, 7);
assert.equal(good.warnings.some((warning) => warning.startsWith('overview:')), false);
assert.equal(validatePresentation(validDeck(1)).ok, true);

const missingNote = validDeck(2).replace(/<template class="slide-notes">[\s\S]*?<\/template>/, '');
const noteFailure = validatePresentation(missingNote);
assert.equal(noteFailure.ok, false);
assert.ok(ids(noteFailure).includes('notes-coverage'));

const missingNotesClose = validDeck(2).replace(/<button data-action="close-notes">Close<\/button>/, '');
const notesCloseFailure = validatePresentation(missingNotesClose);
assert.equal(notesCloseFailure.ok, false);
assert.ok(ids(notesCloseFailure).includes('notes-close'));

const missingPresentationId = validDeck(2).replace('<meta name="presentation-id" content="fixture">', '');
const identityFailure = validatePresentation(missingPresentationId);
assert.equal(identityFailure.ok, false);
assert.ok(ids(identityFailure).includes('stable-presentation-id'));

const externalAsset = validDeck(2).replace('src="local-image.png"', 'src="https://cdn.example.test/image.png"');
const externalAssetFailure = validatePresentation(externalAsset);
assert.equal(externalAssetFailure.ok, false);
assert.ok(ids(externalAssetFailure).includes('asset-policy'));

const unquotedExternalAsset = externalAsset.replace('src="https://cdn.example.test/image.png"', 'src=https://cdn.example.test/image.png');
const unquotedExternalAssetFailure = validatePresentation(unquotedExternalAsset);
assert.equal(unquotedExternalAssetFailure.ok, false);
assert.ok(ids(unquotedExternalAssetFailure).includes('asset-policy'));

const allowedExternalAsset = externalAsset.replace('<meta name="presentation-id" content="fixture">', '<meta name="presentation-id" content="fixture"><meta name="presentation-asset-policy" content="external-allowed">');
const allowedExternalAssetResult = validatePresentation(allowedExternalAsset);
assert.equal(allowedExternalAssetResult.checks.find((check) => check.id === 'asset-policy').pass, true);

const missingRuntime = validDeck(2)
  .replace(/<button aria-expanded="false" data-action="toggle-notes" aria-controls="notes-panel">Notes<\/button>/, '')
  .replace(/<button aria-pressed="false" data-action="toggle-edit">Edit mode<\/button>/, '')
  .replace(/localStorage\.setItem\([^;]+;/, '')
  .replace(/prefers-reduced-motion: reduce/, 'motion-disabled');
const runtimeFailure = validatePresentation(missingRuntime);
assert.equal(runtimeFailure.ok, false);
assert.ok(ids(runtimeFailure).includes('notes-toggle'));
assert.ok(ids(runtimeFailure).includes('edit-mode'));
assert.ok(ids(runtimeFailure).includes('draft-persistence'));
assert.ok(ids(runtimeFailure).includes('reduced-motion'));

console.log('validate-presentation tests passed');
