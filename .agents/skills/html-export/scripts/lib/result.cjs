'use strict';

// Result helpers shared by the dispatcher and every target: how an error becomes text, whether
// page errors fail the run, and how report.json is written. One copy here so png, pdf, video (and
// any later target) cannot drift apart on these rules.

const fs = require('fs');
const path = require('path');
const { currentEngine } = require('./chromium-engine.cjs');

function errorMessage(error) {
  return error && typeof error.message === 'string' && error.message ? error.message : String(error);
}

function firstLine(error) {
  return errorMessage(error).split('\n')[0];
}

// Page errors fail the run (exit 4) unless the caller accepted them with --allow-errors.
function errorsBlock(pageErrors, allowErrors) {
  return pageErrors.length > 0 && allowErrors !== true;
}

// Every report names the browser engine that rendered it (chromium-engine.cjs), so a degraded
// fallback engine is visible in the evidence, never silent.
function writeReport(outputDir, report) {
  const reportPath = path.join(outputDir, 'report.json');
  const engine = currentEngine();
  const body = engine && !Object.prototype.hasOwnProperty.call(report, 'engine') ? { ...report, engine } : report;
  fs.writeFileSync(reportPath, `${JSON.stringify(body, null, 2)}\n`, 'utf8');
  return reportPath;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { errorMessage, firstLine, errorsBlock, writeReport, sleep };
