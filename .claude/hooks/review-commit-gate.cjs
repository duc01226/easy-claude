#!/usr/bin/env node
'use strict';

/**
 * Review-before-commit PreToolUse gate.
 *
 * Blocks an agent `git commit` when the CURRENT changeset has no review
 * fix-loop receipt. Satisfying receipts are minted by `changes-review
 * --fix-loop`, `why-review --fix-loop`, and `workflow-review-changes
 * --fix-loop` when they converge (see `lib/review-receipt.cjs`). The user can
 * always proceed by explicitly choosing to skip, which mints a `skip` receipt
 * after the agent asks. This is a bounded speedbump, not a security boundary:
 * it exists so an unreviewed commit cannot happen by forgetfulness.
 *
 * Fail-open by design (unlike `git-commit-block.cjs`): a command this hook
 * cannot classify, or a repository whose fingerprint cannot be computed, is
 * allowed through. Over-blocking routine commits is what drives a user to
 * disable the hook, and this gate's job is to catch the ordinary case, not to
 * withstand an adversary.
 *
 * Composes AFTER `git-commit-block.cjs` (which denies unauthorised and
 * irreversible commits) and `doc-sync-gate.cjs`.
 *
 * @hook PreToolUse
 * @matcher Bash
 */
const { inspectCommand } = require('./lib/command-inspection.cjs');
const { classifyStatement, findRepository, canonical } = require('./git-commit-block.cjs');
const { runPreToolHookSync } = require('./lib/hook-runner.cjs');
const { reportHookInternalError } = require('./lib/debug-log.cjs');
const {
  computeChangeFingerprint,
  matchReviewReceipt,
  matchSkipReceipt
} = require('./lib/review-receipt.cjs');

function statementCwd(input) {
  return input?.tool_input?.cwd || input?.cwd || process.cwd();
}

/**
 * Every repository targeted by a `git commit` in this command, resolving
 * `-C`/wrappers via the shared classifier. Deny-wins: the caller must find a
 * receipt for EACH, so a compound `git -C a commit && git -C b commit` cannot
 * slip an unreviewed commit through on the first statement's receipt.
 */
function resolveCommitRepositories(command, cwd) {
  const inspected = inspectCommand(command);
  if (inspected.status !== 'KNOWN' && inspected.statements.length === 0) {
    return { known: false, reason: 'command could not be inspected' };
  }
  const repositories = new Set();
  for (const statement of inspected.statements) {
    let classification;
    try {
      classification = classifyStatement(statement, cwd);
    } catch (error) {
      reportHookInternalError('review-commit-gate', 'statement classification failed', error);
      continue;
    }
    if (classification.operation !== 'commit') continue;
    // `--amend` is denied unconditionally by git-commit-block.cjs; nothing to add here.
    if (classification.kind === 'deny') continue;
    const repository = canonical(classification.resolved?.repository || findRepository(cwd));
    if (repository) repositories.add(repository);
  }
  return { known: true, repositories: [...repositories] };
}

function blockMessage(repository, fingerprint) {
  const short = fingerprint.slice(0, 12);
  return [
    '[BLOCKED] Commit refused — the current changeset has no review fix-loop receipt.',
    '',
    `Repository: ${repository}`,
    `Changeset fingerprint: ${short}…`,
    '',
    'A commit MUST be preceded by at least one review fix-loop over this exact changeset.',
    'Run ONE of these to convergence, then retry the commit (do not editor-touch files after it):',
    '',
    '  /changes-review --fix-loop      # review, validate findings, fix, full re-review',
    '  /why-review --fix-loop          # rationale review + fix + fresh full re-review',
    '  /workflow-review-changes --fix-loop',
    '',
    'Each fix-loop mints a receipt for the reviewed changeset when it converges. Any edit',
    'afterwards changes the fingerprint and re-arms this gate, so review the FINAL content.',
    '',
    'If the user explicitly decides to commit without review, ASK them first, then mint the',
    'approved skip (this is the user\'s call alone — never choose it for them):',
    '',
    '  node .claude/hooks/lib/review-receipt.cjs skip --reason="user approved skip"',
    '',
    'Then retry the commit. Committing through the `commit` skill is the supported path.'
  ].join('\n');
}

function evaluate(input) {
  if (input?.tool_name !== 'Bash') return undefined;
  const command = input?.tool_input?.command;
  if (typeof command !== 'string' || command.length === 0) return undefined;
  // Cheap prefilter: no `commit` token means no commit statement to gate.
  if (!/commit/.test(command)) return undefined;

  const cwd = statementCwd(input);
  const resolved = resolveCommitRepositories(command, cwd);
  if (!resolved.known) return undefined; // Fail-open: uninspectable command.
  if (resolved.repositories.length === 0) return undefined; // No commit, or an unresolvable repo.

  // Deny-wins across every commit statement: ALL must have a receipt.
  for (const repository of resolved.repositories) {
    let fingerprint;
    try {
      fingerprint = computeChangeFingerprint(repository);
    } catch (error) {
      reportHookInternalError('review-commit-gate', 'fingerprint failed', error);
      return undefined; // Fail-open: a broken git must not brick commits.
    }
    if (fingerprint === null) continue; // No local changes → nothing to review here.

    const receipt = { repository, fingerprint };
    if (matchReviewReceipt(receipt)) continue;
    if (matchSkipReceipt(receipt)) continue;

    return {
      code: 2,
      stderr: `${blockMessage(repository, fingerprint)}\n`,
      decision: 'block'
    };
  }
  return undefined;
}

if (require.main === module) {
  runPreToolHookSync('review-commit-gate', evaluate, {
    // Fail-open: an unreadable payload or an internal fault must not brick commits.
    // The gate blocks only via an explicit { code: 2 } from a completed evaluation.
    inputErrorCode: 0,
    errorExitCode: 0
  });
}

module.exports = { evaluate, resolveCommitRepositories, blockMessage };
