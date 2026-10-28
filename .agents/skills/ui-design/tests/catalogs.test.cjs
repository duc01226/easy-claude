/**
 * Tests for the option-discovery catalogs the explore procedure shortlists from
 * (references/explore/option-discovery.md D1):
 *   - style-families.csv: required columns, unique ids, every divergence axis has both poles, each
 *     tellRisk is a tell id of the catalog (T1-T5) or none, every styleRows name is a styles.csv row;
 *   - layout-archetypes.csv: required columns, unique ids, at least two archetypes per page type and three
 *     for a landing page, so three options can each take a different layout;
 *   - styles.csv: no style name twice (a duplicate makes a styleRows mapping ambiguous).
 * The checks read only data files that ship inside this skill, so they hold in any project layout.
 *
 * Run: node .claude/skills/ui-design/tests/catalogs.test.cjs
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { parseCsv } = require('../scripts/pick-style.cjs');

const DATA = path.resolve(__dirname, '..', 'data');
// tone;energy;structure;temperature, in that order; both poles of each must appear across families.
const AXES = Object.freeze([['light', 'dark'], ['quiet', 'loud'], ['editorial', 'modular'], ['warm', 'cool']]);
const TELL_IDS = new Set(['T1', 'T2', 'T3', 'T4', 'T5', 'none']);

function readTable(name) {
  const [header, ...rows] = parseCsv(fs.readFileSync(path.join(DATA, name), 'utf8'));
  const columns = header.map((cell) => cell.trim());
  return {
    columns,
    rows: rows.filter((cells) => cells.some((cell) => cell.trim() !== ''))
      .map((cells) => Object.fromEntries(columns.map((column, index) => [column, (cells[index] || '').trim()]))),
  };
}

function assertColumns(table, required, name) {
  const missing = required.filter((column) => !table.columns.includes(column));
  assert.deepEqual(missing, [], `${name} lacks columns`);
}

function assertUniqueIds(rows, name) {
  const seen = new Set();
  for (const row of rows) {
    assert.match(row.id, /^[a-z0-9-]+$/, `${name}: id "${row.id}" must be lowercase-hyphen`);
    assert.ok(!seen.has(row.id), `${name}: duplicate id ${row.id}`);
    seen.add(row.id);
  }
}

test('style-families.csv: every family is complete, unique, mapped to real style rows and a known tell', () => {
  const families = readTable('style-families.csv');
  assertColumns(families, ['id', 'name', 'oneLine', 'feelKeywords', 'divergenceAxes', 'typicalSkeleton', 'motion',
    'bestFor', 'avoidFor', 'mobileSpeedRisk', 'tellRisk', 'showcaseQueries', 'showcaseSources', 'styleRows'], 'style-families.csv');
  assert.ok(families.rows.length >= 12, `a board of 8 needs a wider pool; found ${families.rows.length}`);
  assertUniqueIds(families.rows, 'style-families.csv');
  const styleNames = new Set(readTable('styles.csv').rows.map((row) => row['Style Category']));
  for (const family of families.rows) {
    for (const column of ['name', 'oneLine', 'feelKeywords', 'typicalSkeleton', 'bestFor', 'avoidFor', 'showcaseQueries', 'showcaseSources']) {
      assert.notEqual(family[column], '', `${family.id}: ${column} is empty`);
    }
    assert.ok(TELL_IDS.has(family.tellRisk), `${family.id}: tellRisk "${family.tellRisk}" is not T1-T5 or none`);
    assert.equal(family.divergenceAxes.split(';').length, AXES.length, `${family.id}: divergenceAxes needs ${AXES.length} positions`);
    for (const style of family.styleRows.split('|').filter(Boolean)) {
      assert.ok(styleNames.has(style), `${family.id}: styleRows names "${style}", which is not a styles.csv row`);
    }
  }
});

test('style-families.csv: both poles of every divergence axis are covered, so a board can diverge', () => {
  const positions = readTable('style-families.csv').rows.map((family) => family.divergenceAxes.split(';'));
  AXES.forEach(([one, other], axis) => {
    const seen = new Set(positions.map((position) => position[axis]));
    assert.ok(seen.has(one) && seen.has(other), `axis ${axis + 1} needs both "${one}" and "${other}"; found ${[...seen].join(', ')}`);
  });
});

test('layout-archetypes.csv: archetypes are complete and unique, with at least two per page type', () => {
  const archetypes = readTable('layout-archetypes.csv');
  assertColumns(archetypes, ['id', 'pageType', 'archetype', 'structure', 'whenItWins', 'cost', 'mobileBehavior', 'a11yNotes',
    'examplePatternSources'], 'layout-archetypes.csv');
  assertUniqueIds(archetypes.rows, 'layout-archetypes.csv');
  const perType = new Map();
  for (const row of archetypes.rows) {
    for (const column of archetypes.columns) assert.notEqual(row[column], '', `${row.id}: ${column} is empty`);
    perType.set(row.pageType, (perType.get(row.pageType) || 0) + 1);
  }
  for (const [pageType, count] of perType) assert.ok(count >= 2, `${pageType} offers only ${count} archetype; a pick needs a choice`);
  // A brand home page is the commonest surface: three options must each get a different layout.
  assert.ok(perType.get('marketing-landing') >= 3, `marketing-landing offers ${perType.get('marketing-landing')} archetypes; 3 options need 3`);
});

test('styles.csv names each style once, so a family maps to one row', () => {
  const names = readTable('styles.csv').rows.map((row) => row['Style Category']);
  const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
  assert.deepEqual(duplicates, []);
});
