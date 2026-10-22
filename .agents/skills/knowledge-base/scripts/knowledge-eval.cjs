'use strict';

/**
 * Held-out evaluation of prompt-phrase triggers (spec KNW, BR-KNW-11, TC-KNW-037).
 *
 * `evaluation/held-out.json` was written by an independent author before any trigger phrase existed and
 * is never used for tuning; `evaluation/dev.json` is the trigger author's tuning set. The evaluation packs
 * in `evaluation/packs/` carry the phrases. Each prompt runs through the router's own prompt path —
 * host envelopes and code removed (`readUserPrompt`), framework-maintenance prompts silent, whole-word
 * phrases (`matchPrompt`) — and is scored per subject:
 *   recall          = relevant prompts that received their subject / relevant prompts
 *   false delivery  = other prompts that received the subject / other prompts
 * Prompt triggers are on by default only when EVERY subject meets the bar on the held-out set.
 * The record (`.claude/knowledge-base/evaluation.json`) holds no timestamps, so a rerun on the same
 * inputs reproduces it byte for byte; the test suite compares the two.
 */

const fs = require('node:fs');
const path = require('node:path');

const LIB = path.join(__dirname, '..', '..', '..', 'hooks', 'lib');
const EVAL_DIR = path.join(__dirname, '..', 'evaluation');
const BAR = Object.freeze({ recall: 0.9, falseDelivery: 0.05 });

function readJson(file) {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Evaluation packs as delivery entries (id, plane, triggers). */
function loadPacks(dir = path.join(EVAL_DIR, 'packs')) {
    const packLib = require(path.join(LIB, 'knowledge-pack.cjs'));
    return fs.readdirSync(dir)
        .filter(name => name.endsWith('.md'))
        .sort()
        .map(name => {
            const { pack, errors } = packLib.readPack(path.join(dir, name));
            if (!pack) throw new Error(`Evaluation pack ${name}: ${errors.join('; ')}`);
            return { id: pack.id, plane: 'framework', title: pack.title, labels: [], file: name, triggers: pack.triggers };
        });
}

/** Subject identities a prompt would receive through the router's prompt path. */
function predict(packs, prompt) {
    const utils = require(path.join(LIB, 'prompt-route-utils.cjs'));
    const match = require(path.join(LIB, 'knowledge-match.cjs'));
    const text = utils.readUserPrompt(prompt);
    if (text === null) return [];
    return Array.from(new Set(match.matchPrompt(packs, text).map(item => item.entry.id))).sort();
}

const round = value => Math.round(value * 1000) / 1000;

/** Per-subject recall and false delivery over one prompt set. */
function score(packs, set) {
    const subjects = packs.map(pack => pack.id);
    const predictions = set.prompts.map(item => ({ item, got: predict(packs, item.prompt) }));
    const figures = {};
    for (const subject of subjects) {
        const relevant = predictions.filter(entry => entry.item.expected.includes(subject));
        const others = predictions.filter(entry => !entry.item.expected.includes(subject));
        const hits = relevant.filter(entry => entry.got.includes(subject)).length;
        const falseHits = others.filter(entry => entry.got.includes(subject)).length;
        figures[subject] = {
            relevant: relevant.length,
            recall: relevant.length ? round(hits / relevant.length) : null,
            others: others.length,
            falseDelivery: others.length ? round(falseHits / others.length) : null
        };
    }
    const passed = subjects.length > 0 && subjects.every(subject => figures[subject].recall !== null && figures[subject].recall >= BAR.recall && figures[subject].falseDelivery <= BAR.falseDelivery);
    const misses = predictions
        .filter(entry => entry.item.expected.slice().sort().join(',') !== entry.got.join(','))
        .map(entry => ({ id: entry.item.id, kind: entry.item.kind, expected: entry.item.expected, got: entry.got }));
    return { prompts: set.prompts.length, figures, passed, misses };
}

/**
 * Run both sets. `report` (printed) includes the development misses for tuning; `record` (written)
 * holds only the held-out figures and the default they set — never held-out prompt text.
 */
function evaluate(root, deps = {}) {
    const packs = loadPacks(deps.packsDir);
    const heldOut = readJson(deps.heldOutFile || path.join(EVAL_DIR, 'held-out.json'));
    const dev = readJson(deps.devFile || path.join(EVAL_DIR, 'dev.json'));
    const held = score(packs, heldOut);
    const development = score(packs, dev);
    const record = {
        description: 'Held-out evaluation of knowledge prompt triggers. Regenerate with `node .claude/skills/knowledge-base/scripts/knowledge-base.cjs eval --write`; never edit by hand.',
        heldOut: { file: '.claude/skills/knowledge-base/evaluation/held-out.json', frozenAt: heldOut.frozenAt || null, author: heldOut.author || null, prompts: held.prompts },
        bar: { recall: BAR.recall, falseDelivery: BAR.falseDelivery },
        subjects: held.figures,
        passed: held.passed,
        promptTriggersDefault: held.passed
    };
    return { record, report: { heldOut: { figures: held.figures, passed: held.passed, missCount: held.misses.length }, development } };
}

function recordFile(root) {
    return path.join(root, '.claude', 'knowledge-base', 'evaluation.json');
}

module.exports = { BAR, loadPacks, predict, score, evaluate, recordFile };
