import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  prependCodexCompatibilityNote,
  rewriteClaudeToolTermsForCodex,
} from '../compat-rewrite.mjs';

const require = createRequire(import.meta.url);
const { readCanonicalProtocol } = require('../../lib/canonical-protocol.cjs');
const bundleRoot = fileURLToPath(new URL('../../../../', import.meta.url));

// Intent: a discovered Codex skill executes normally without a Claude-only tool.
test('Codex skill loading activates instructions without a separate Skill tool', () => {
  // Given a selected skill; when its Codex execution preamble is generated.
  const output = prependCodexCompatibilityNote('# Review\nKeep every required gate.\n');
  // Then loading and execution proceed without a foreign-host tool or extra approval.
  assert.match(output, /loading its `SKILL\.md` instructions and executing the required steps with available tools/);
  assert.match(output, /No separate `Skill` tool is required; a loaded skill is already activated/);
  assert.match(output, /Host-native execution is not a protocol deviation and needs no extra approval/);
  assert.ok(output.endsWith('# Review\nKeep every required gate.\n'));
});

// Intent: reading canonical source never changes the current host's capabilities.
test('Codex execution paths remain distinct from canonical authoring paths', () => {
  // Given a selected skill; when its execution paths are explained for Codex.
  const output = prependCodexCompatibilityNote('# Review\n');
  // Then authoring-source inspection cannot change the active host.
  assert.match(output, /prefer the registered `\.agents\/skills\/<name>\/SKILL\.md` for Codex execution/);
  assert.match(output, /`\.claude\/\*\*` remains the canonical authoring source/);
  assert.match(output, /reading it for a registry or source inspection does not switch this session to Claude Code/);
});

// Intent: normal host adaptation cannot waive an actually missing capability or gate.
test('real missing capabilities still require an evidenced escalation', () => {
  // Given a required gate; when normal host adaptation is explained.
  const output = prependCodexCompatibilityNote('# Review\n');
  // Then a real capability failure still blocks and requires evidence.
  assert.match(output, /Continue when Codex can perform the required operation/);
  assert.match(output, /stop and ask only when the actual capability is unavailable, naming the step and evidence/);
  assert.match(output, /If a required step\/tool cannot run in this environment, stop and ask the user before adapting/);
  assert.match(output, /gate steps fixed/);
});

test('Claude tool translation preserves the required operation and gate constraints', () => {
  // Given Claude tool terms alongside an immutable gate; when translated for Codex.
  const output = rewriteClaudeToolTermsForCodex(
    'Execute the `Skill` tool. Gate steps ALWAYS run; NEVER skip a gate. Ask via `AskUserQuestion` only for a missing required capability.',
  );
  // Then only tool vocabulary changes; execution and gate constraints remain.
  assert.equal(output,
    'Execute the skill invocation. Gate steps ALWAYS run; NEVER skip a gate. Ask using ask user question tool only for a missing required capability.');
});

// Read only the shipped canonical protocol, never an adopter's config/docs/git state.
// Windows/macOS/Linux use the same URL-to-path API; no shell or home-dir dependency.
test('universal workflow guidance supports every host while preserving authority', () => {
  // Given the shipped canonical protocol, independent of adopter config or state.
  const protocol = readCanonicalProtocol(bundleRoot, 'workflow-step-advancement');
  assert.ok(protocol, 'The shipped universal workflow protocol must exist');
  // When read by a native host or translated into the Codex mirror.
  for (const guidance of [protocol, rewriteClaudeToolTermsForCodex(protocol)]) {
    // Then host identities, native execution, capability checks and authority survive.
    assert.match(guidance, /Claude Code uses its Skill loader/);
    assert.match(guidance, /Codex loads the registered `SKILL\.md` and executes its protocol with available tools/);
    assert.match(guidance, /OpenCode uses its native skill loader/);
    assert.match(guidance, /a registry\/source read does not change hosts/);
    assert.match(guidance, /loading a selected skill activates its instructions; no separate tool named Skill is required/);
    assert.match(guidance, /never block on a foreign-host tool name alone/);
    assert.match(guidance, /All gates and authority limits still apply/);
  }
});

// Intent: generic ask-user instructions retain explicit tool use in every mirror.
test('user-question instructions use the ask user question tool', () => {
  const output = prependCodexCompatibilityNote('# Review\nAsk the user before proceeding.\n');
  assert.match(output, /Use ask user question tool to ask user\./);
  assert.ok(output.endsWith('Ask the user before proceeding.\n'));
  for (const input of ['via `AskUserQuestion`', 'via AskUserQuestion', '`AskUserQuestion` decision', 'Use `AskUserQuestion`', 'Use AskUserQuestion', 'Use ask user question tool']) {
    const rewritten = rewriteClaudeToolTermsForCodex(input);
    assert.match(rewritten, /ask user question tool/);
    assert.doesNotMatch(rewritten, /AskUserQuestion|ask the user directly/);
    assert.equal(rewriteClaudeToolTermsForCodex(rewritten), rewritten);
  }
});

test('shared question guidance is available to all harnesses', () => {
  const protocol = readCanonicalProtocol(bundleRoot, 'critical-thinking-mindset');
  assert.match(protocol, /Use ask user question tool to ask user\./);
});
