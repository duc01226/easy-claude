#!/usr/bin/env node
'use strict';

if ((require.main === module || !require.main) && require('./lib/framework-runtime.cjs').skipHook(module)) return;

/**
 * Judgement-integrity router for UserPromptSubmit.
 *
 * When the user's prompt asks for a verdict — confirm a theory, judge or evaluate
 * something, name a root cause, hunt for gaps/issues, or recommend an approach or solution — inject the anti-confirmation-
 * bias answer-review directive, naming the lean the prompt carries: a gap hunt presumes
 * problems exist, a stated theory presumes it is right, an evaluation presumes the named
 * option is the one to weigh, an advice ask presumes the first workable answer is the best one.
 * The reminder also carries the closing offer (grill / why-review / skip) for a consequential answer. The directive body is the canonical
 * `SYNC:judgement-integrity:reminder` from `.claude/skills/shared/sync-inline-versions.md`,
 * so the hook and the protocol text never drift.
 *
 * The universal `critical-thinking-mindset` protocol carries the judgement-integrity rule for every
 * task; this hook adds the lean-specific directive on the prompt that asks. Runs on every prompt
 * (no dedup ledger): a judgement question can arrive at any point and the directive only helps on
 * the prompt that asks. Detection is a small heuristic and the directive is conditional, so a false
 * positive costs a few lines of context and a false negative falls back to the universal rule.
 *
 * A sub-agent start and the host's compaction report carry no prompt, so there the router classifies
 * the session's latest recorded user prompt (`routedPrompt`): a delegated agent works on the verdict
 * the user asked for, and a compaction mid-turn drops the directive the turn was answering. Those
 * events answer with the JSON context envelope (`routerOutput`); no prompt ledger keeps them silent.
 *
 * Decision support: once per session window, on the first user prompt (and again after a compaction or
 * about DEFAULT_REINJECT_TOKENS of transcript growth), the hook also writes the decision-support rule for the
 * active `portability.decisionSupportMode` (ask | suggest | auto | off; owner `workflow-routing-config.cjs`).
 * The rule is the trigger the prompt classifier cannot be: it tells the assistant to judge its OWN answer, so a
 * request to investigate, design or fix that ends in a consequential choice gets the closing offer too. It goes
 * through `deliverWithCompaction` of the convention ledger, never to a sub-agent (no user channel), and its hash
 * carries the mode, so a mode change re-arms it. A per-prompt directive also names the active mode. Unlike the
 * directive, this check runs on every user prompt: a few small settings reads and one ledger record lookup.
 *
 * Mirrored to Codex and OpenCode by the hook sync generators, which is why the directive
 * names the skill host-neutrally. Advisory plaintext on a prompt; always exit 0.
 *
 * On by default; off with `.claude/.ck.json` judgementIntegrityRoute.enabled:false (a developer
 * override in `.claude/.ck.local.json` wins) or CK_JUDGEMENT_INTEGRITY_ROUTE=0. Failures stay
 * silent; CK_DEBUG=1 prints the diagnostic to stderr.
 *
 * @hook UserPromptSubmit
 * @hook SubagentStart
 * @hook SessionStart (compact)
 */

const { isHookEntryPoint } = require('./lib/hook-runner.cjs');
const { debugError } = require('./lib/debug-log.cjs');
const { readUserPrompt, isRouterEnabled, routedPrompt, routerOutput } = require('./lib/prompt-route-utils.cjs');

const HOOK_NAME = 'judgement-integrity-route';
const MARKER_START = '<!-- CK:JUDGEMENT-INTEGRITY -->';
const MARKER_END = '<!-- /CK:JUDGEMENT-INTEGRITY -->';
const SYNC_TAG = 'judgement-integrity:reminder';
const SETTINGS_SECTION = 'judgementIntegrityRoute';
const ENV_SWITCH = 'CK_JUDGEMENT_INTEGRITY_ROUTE';
const DS_MARKER_START = '<!-- CK:DECISION-SUPPORT -->';
const DS_MARKER_END = '<!-- /CK:DECISION-SUPPORT -->';
const DS_RECORD_GROUP = 'decision-support';
const DEFAULT_REINJECT_TOKENS = 150000;

const LEANS = Object.freeze({
    PROBLEM_PRESUMED: 'problem-presumed',
    CONFIRMATION_SOUGHT: 'confirmation-sought',
    EVALUATION: 'evaluation',
    ADVICE: 'advice'
});

const FAULT_NOUNS =
    '(?:gaps?|issues?|problems?|bugs?|flaws?|holes?|risks?|mistakes?|errors?|weakness(?:es)?|loopholes?|edge[- ]cases?|smells?|defects?|regressions?|vulnerabilit(?:y|ies)|shortcomings?|missing (?:pieces?|parts?|cases?|steps?))';

// Each pattern is `strong` (an explicit verdict ask), weak (a phrase that also appears in ordinary
// fix/build requests: "fix any errors", "I have an issue", "why does it crash", "write a critique section")
// — counted only when the prompt is not an action request (see ACTION_REQUEST) — or asked (a stated belief
// or check that is a verdict ask only when the prompt asks a question: "I think X, right?" asks,
// "I think we should add a retry" and "verify that the build passes" instruct). A weakUnlessAsked pattern is
// dropped by an action request only when the prompt asks no question: "implement the cache the best way" is build
// work, "Run the tests. What's the best way to speed them up?" still asks.
const strong = re => ({ re, weak: false, asked: false, keptWhenAsked: false });
const weak = re => ({ re, weak: true, asked: false, keptWhenAsked: false });
const asked = re => ({ re, weak: false, asked: true, keptWhenAsked: false });
const weakUnlessAsked = re => ({ re, weak: true, asked: false, keptWhenAsked: true });

// Gap hunt: "any gaps?", "does it have issues", "find bugs in", "what's wrong with", "anything missing".
const PROBLEM_PATTERNS = [
    strong(new RegExp(`\\b(?:find|finds|finding|review|reviewing|spot|identify|list|look for|hunt for|detect|audit for|scan for|are there|is there)\\b[^.?!\\n]{0,48}\\b${FAULT_NOUNS}`, 'i')),
    strong(new RegExp(`\\b(?:does|do|did|has|have) (?:this|it|that|these|those|the|my|our|your)\\b[^.?!\\n]{0,48}\\b${FAULT_NOUNS}`, 'i')),
    weak(new RegExp(`\\b(?:any|anything|some|check|checking|has|have|having|see)\\b[^.?!\\n]{0,48}\\b${FAULT_NOUNS}`, 'i')),
    strong(/\bwhat(?:'s| is| are)? (?:wrong|missing|broken|off)\b/i),
    strong(/\b(?:anything|something) (?:wrong|missing|broken|off)\b/i),
    strong(/\b(?:poke holes|tear (?:it|this) apart|find fault)\b/i)
];

// Stated theory or expected answer: "I think X", "my theory", "am I right", "confirm that", "isn't it".
const CONFIRMATION_PATTERNS = [
    asked(/\b(?:i|we) (?:think|believe|suspect|guess|feel|assume|bet|reckon|am pretty sure|am sure)\b/i),
    strong(/\b(?:my|our) (?:theory|hypothesis|guess|intuition|hunch|understanding|assumption|reading|take)\b/i),
    strong(/\bam i (?:right|wrong|correct|missing something)\b/i),
    strong(/\b(?:confirm|verify|validate) (?:my|our)\b/i),
    asked(/\b(?:confirm|verify|validate) (?:that|whether|if)\b/i),
    strong(/\b(?:is it true|isn'?t it|aren'?t (?:they|we)|doesn'?t it|don'?t you (?:think|agree)|right\?|correct\?|agree\?)/i),
    weak(/\b(?:it|this|that) (?:must|has to) be\b/i),
    strong(/\b(?:pretty sure|surely|obviously|clearly) (?:it|this|that|the)\b/i)
];

// Evaluation / verdict: "evaluate", "is this good/correct/safe", "should we", "which is better", "root cause".
const EVALUATION_PATTERNS = [
    weak(/\b(?:evaluate|evaluation|assess|assessment|judge|judgement|judgment|critique|verdict|appraise|sanity[- ]check|double[- ]check)\b/i),
    strong(/\b(?:is|are|was|were) (?:this|it|that|these|those|the|my|our)(?: [\w-]+){0,2} (?:good|bad|correct|right|wrong|safe|ok|okay|valid|sound|better|worse|enough|sufficient|necessary|worth it|a good idea|the right)\b/i),
    strong(/\bshould (?:i|we|it|this)\b/i),
    strong(/\b(?:which (?:one )?is better|better than|pros and cons|trade-?offs?|worth it)\b/i),
    strong(/\b(?:root cause|is (?:this|that|it) (?:the|a) cause)\b/i),
    weak(/\bwhy (?:does|did|is)\b/i),
    strong(/\bdoes (?:this|it|that) (?:make sense|work|hold)\b/i),
    strong(/\b(?:what do you think|thoughts on|your (?:opinion|take|view) on|how (?:good|solid|robust) is)\b/i)
];

// The sentence-start and build-request grammar has one owner (prompt-route-utils.cjs), shared with the workflow
// route's plan offer; this router uses its strict build-request opener and its list-item opener for advice asks.
const { ITEM_START, ACTION_REQUEST } = require('./lib/prompt-route-utils.cjs');

// An approach or design question asks for advice only when a decision marker follows the noun: a modal ("what approach
// should we take"), a fit ("what architecture fits"), a verdict word ("what design is best", "which approach is less
// risky"), a first- or second-person choice ("what approach do I take", "what design do you recommend"), a need ("what
// strategy does this problem need"), or a survey ("what approaches are there").
// Without one it is a lookup of what is already in use: "what approach does the importer take", "what design is the
// notifier based on", "which strategy the scheduler uses". Positive markers keep a new verb from turning a lookup into an ask.
const VERDICT_WORDS = String.raw`(?:best|better|worse|right|ideal|recommended|preferred|good|wise|sensible|reasonable|appropriate|suitable|viable|safe|simple|clean|cheap|fast|easy|robust|best|worst|simplest|cleanest|safest|cheapest|fastest|easiest|wisest|smartest|quickest|leanest|lightest|smallest|clearest|strongest|less\s+\w+|more\s+\w+|most\s+\w+|least\s+\w+|easier|harder|faster|slower|cheaper|safer|simpler|cleaner|smarter)`;
// A verdict word counts only where it closes the clause or comes before a choice word or a preposition ("is best for",
// "is less risky?", "is the best fit"); "which strategy are most of the hooks using?" and "what design is safe mode built
// on?" name what is in use.
const VERDICT_CLOSE = String.raw`(?=\s*(?:[?.!,;:]|$)|\s+(?:ones?|options?|choices?|ways?|approach(?:es)?|designs?|strateg(?:y|ies)|solutions?|pick|bet|fit|here|now|for|to|than|enough|overall|suited|placed|in|with|when|if|given)\b)`;
const DECISION_ASK = new RegExp(String.raw`\b(?:what|which) (?:approach(?:es)?|strateg(?:y|ies)|architectures?|designs?|solutions?)\b(?:\s+[\w-]+){0,2}?\s+(?:should|would|could|ought|might|fits?|suits?|works?\s+(?:best|better|well|for)|makes?\s+(?:[\w-]+\s+){0,2}?(?:sense|easier|simpler|safer|faster|cheaper)|(?:is|are|seems?)\s+(?:(?!the\b)[\w-]+\s+)?(?!the\b)${VERDICT_WORDS}${VERDICT_CLOSE}|(?:is|are|seems?)\s+(?:[\w-]+\s+)?the\s+${VERDICT_WORDS}${VERDICT_CLOSE}|(?:is|are)\s+there\b|has\s+the\s+(?:fewest|least|best)|do\s+(?:you|i|we)\s+(?:recommend|suggest|propose|prefer|advise|take|pick|choose|go\s+with)|do\s+i\s+(?:use|follow)|do\s+you\s+think|(?:does|do)\s+(?:[\w-]+\s+){1,3}?(?:need|require|call\s+for|deserve|warrant))\b`, 'i');

// Advice / solution ask: "what's the best way to", "how would you", "recommend an approach", "what strategy fits".
// Only an ask routes. A stated plan ("I suggest we move the cache") is an instruction, build work that names a
// recommendation ("implement the cache using the best approach") is a build request, and a lookup ("what tool runs
// the tests?", "how could I see the logs?", "what strategy do we use?", "what approach did you use?") asks for a fact.
// "What approach do you recommend?" and "what approach do I take?" still ask.
const ADVICE_PATTERNS = [
    weakUnlessAsked(/\b(?:best|right|recommended|cleanest|simplest|safest|smartest) (?:way|approach|option|practice|strategy|design|solution|pattern|tool|library|structure)\b/i),
    strong(/\b(?:how|what) would you\b/i),
    asked(/\bany (?:suggestions|recommendations|advice)\b/i),
    // An approach or design question asks for advice only when a decision marker follows the noun (DECISION_ASK).
    weakUnlessAsked(DECISION_ASK),
    // An open choice asked as its own sentence ("Which approach to use for retries?"), never inside a clause
    // ("explain how the router decides which strategy to use").
    weakUnlessAsked(new RegExp(`${ITEM_START}(?:what|which) (?:approach(?:es)?|strateg(?:y|ies)|architectures?|designs?|solutions?)\\s+to\\s+(?:use|take|pick|choose|adopt|follow)\\b`, 'i')),
    // Sentence- or item-initial imperative, a "can you" request, "what do you recommend" or "your advice" — never "I suggest we …".
    strong(new RegExp(`${ITEM_START}(?:recommend|suggest|propose|advise)\\b|\\b(?:can|could|would|will) you (?:please )?(?:recommend|suggest|propose|advise)\\b|\\bwhat (?:do|would) you (?:recommend|suggest|propose|advise)\\b`, 'i')),
    // "your advice" asks as a question, or after "I'd like" / "want" / "need": "try your suggestion and run the tests" is a
    // go-ahead, and so is "go with your suggestion" even with a question mark later.
    strong(/\b(?:'d like|would like|want|need|get|hear|seek|give me|share)\s+your (?:recommendation|advice|suggestion)s?\b/i),
    asked(/(?<!\b(?:with|implement|apply|follow|use|take|accept|adopt|keep|per|on|do)\s+)\byour (?:recommendation|advice|suggestion)s?\b/i)
];

// An explicit review or grill invocation already carries its own adversarial protocol.
const EXPLICIT_REVIEW_INVOCATION = /^\s*[/$](?:[\w-]+:)?(?:why-review|grill)\b/i;
// "Implement / add / create ..." with no question is a build request, not a verdict request.
const QUESTION_OR_VERDICT_CUE = /\?|\b(?:check|evaluate|assess|judge|review|confirm|verify|validate|audit|critique|am i|is it|is this|is the|is anything|is there|are there|does it|what do you think|thoughts on|should|which|why|what(?:'s| is)? wrong|any \w+|recommend|advise|suggest|propose|your (?:recommendation|advice|suggestion)|best (?:way|approach|option|practice)|how would you|what would you|what (?:approach|strategy|architecture|design|solution))\b/i;
// A fix/build request (ACTION_REQUEST, shared): its fault nouns describe work to do, not a verdict to give.

/** Return the list of leans the prompt carries; empty when it does not ask for a verdict. */
function detectLeans(prompt) {
    if (typeof prompt !== 'string' || prompt.trim().length === 0) return [];
    if (EXPLICIT_REVIEW_INVOCATION.test(prompt)) return [];
    const text = readUserPrompt(prompt);
    if (text === null) return []; // host envelope, not user input
    if (!QUESTION_OR_VERDICT_CUE.test(text)) return [];
    const isAction = ACTION_REQUEST.test(text);
    const isQuestion = text.includes('?');
    const hits = patterns => patterns.some(p => (!isAction || !p.weak || (p.keptWhenAsked && isQuestion)) && (isQuestion || !p.asked) && p.re.test(text));
    const leans = [];
    if (hits(PROBLEM_PATTERNS)) leans.push(LEANS.PROBLEM_PRESUMED);
    if (hits(CONFIRMATION_PATTERNS)) leans.push(LEANS.CONFIRMATION_SOUGHT);
    if (hits(EVALUATION_PATTERNS)) leans.push(LEANS.EVALUATION);
    if (hits(ADVICE_PATTERNS)) leans.push(LEANS.ADVICE);
    return leans;
}

function isJudgementRequest(prompt) {
    return detectLeans(prompt).length > 0;
}

const LEAN_GUIDANCE = {
    [LEANS.PROBLEM_PRESUMED]:
        'Gap hunt: "no material issues found" is a valid answer; non-empty list not the goal. Keep only findings you would still report had user asked to confirm none exist.',
    [LEANS.CONFIRMATION_SOUGHT]:
        "User's theory/expected answer = hypothesis: hunt hardest for refuting evidence; say plainly if it fails.",
    [LEANS.EVALUATION]:
        'Verdict: weigh option/cause user did NOT name with same evidence bar as named one.',
    [LEANS.ADVICE]:
        'Advice: name the constraints you assumed; weigh at least one real alternative with the same evidence bar before recommending.'
};

function loadCanonicalReminder() {
    try {
        const { readCanonicalProtocol } = require('../scripts/lib/canonical-protocol.cjs');
        const { resolveProjectRoot } = require('./lib/project-root.cjs');
        const rootDir = resolveProjectRoot({ cwd: process.cwd(), scriptPath: __filename, env: process.env }).rootDir;
        return readCanonicalProtocol(rootDir, SYNC_TAG);
    } catch (error) {
        debugError(HOOK_NAME, error); // the directive falls back to its built-in body
        return null;
    }
}

// The checks a closing offer can name, best fit first, at most two per offer.
const DS_CHECKS = '`/grill` (interview: the user decides the open choices) · `/why-review` (you attack your own reasoning, no interview) · `/plan --mode=validate` (a saved plan) · `/wayfinder` (decisions span sessions) · `/llm-council` (irreversible, high stakes)';
const DS_CLOSE = {
    ask: 'Close such an answer with ONE question via the host question tool (plain text when it has none): the 1–2 fitting checks + skip.',
    suggest: 'Close such an answer with ONE line naming the 1–2 fitting checks; ask nothing, run nothing (the user types a check to start it).',
    auto: 'Before replying with such an answer, run `why-review` report-only on the draft (Claude Code: Skill tool; Codex: `$why-review`; OpenCode: read `.claude/skills/why-review/SKILL.md`) and fold in its validated findings; then, if choices only the user can make remain, ask ONE question: `/grill` · skip.'
};
const DS_PLAN = {
    ask: 'The mid-session plan question stays one question.',
    suggest: 'The mid-session plan question becomes one line before the work starts, no question.',
    auto: 'The mid-session plan question stays one question.'
};

/**
 * The once-per-session decision-support rule for a mode (`ask` | `suggest` | `auto` | `off`), or '' for an
 * unknown mode. `requested` (optional) is the configured mode when it differs from the effective one.
 */
function buildDecisionSupportRule(mode, requested) {
    const switchHint = 'change: `portability.decisionSupportMode` ask|suggest|auto|off via /framework-config, or CK_DECISION_SUPPORT_MODE';
    if (mode === 'off') {
        return [
            DS_MARKER_START,
            `**[DECISION-SUPPORT]** Mode \`off\` (${switchHint}). Do not ask about or suggest \`/grill\`, \`/why-review\` or a plan on your own answers, and ask no mid-session plan question, unless the user asks. The inline self-check stays.`,
            DS_MARKER_END
        ].join('\n');
    }
    if (!DS_CLOSE[mode]) return '';
    const capped = requested && requested !== mode ? ` (configured \`${requested}\`, read as \`${mode}\` while skill auto-trigger is off)` : '';
    return [
        DS_MARKER_START,
        `**[DECISION-SUPPORT]** Mode \`${mode}\`${capped} (${switchHint}). Judge YOUR answer, not the prompt's wording: a question, an investigation, a design, a fix or work you just did all count.`,
        "- Consequential = the answer adopts or recommends a choice the user will act on AND one holds: an alternative was rejected · hard to undo · contract, data, security or cost · cross-module · rests on unchecked assumptions about the user's constraints.",
        `- ${DS_CLOSE[mode]} ${DS_PLAN[mode]}`,
        `- Checks, best fit first: ${DS_CHECKS}. First offer this session: one short clause per check (what it does, who does the work, rough cost) and how to change the mode; later offers one line.`,
        '- Exempt: lookups, trivial answers, routine edits, a running workflow, a skill that owns its closing step, sub-agents and headless runs, a check the user already called, a subject already skipped, a turn the plan question covers.',
        DS_MARKER_END
    ].join('\n');
}

function buildDirective(leans, reminder = loadCanonicalReminder(), allowSkillRouting = true, decisionSupportMode) {
    const body =
        reminder ||
        '- **MANDATORY** Name premise, test it AND its opposite with one evidence bar, why-review draft before replying; never invent findings, never manufacture disagreement; end with `Bias check:` line (`SYNC:judgement-integrity`).';
    return [
        MARKER_START,
        `**[JUDGEMENT-INTEGRITY]** Verdict or advice ask (lean: ${leans.join(', ')}). Apply \`SYNC:judgement-integrity\` against confirmation bias:`,
        ...leans.map(lean => `- ${LEAN_GUIDANCE[lean]}`),
        body,
        allowSkillRouting
            ? 'Default = INLINE self-check (steps above; why-review the draft mentally) — no skill call: skill is heavy, everyday answers stay inline. Escalate to `why-review --validate-findings` only for formal review/audit/gap-hunt deliverable or MEDIUM+/consequential issue the inline pass cannot settle: Claude Code → Skill tool `why-review`; Codex → `$why-review` (`.agents/skills/why-review/SKILL.md`); OpenCode → `.claude/skills/why-review/SKILL.md`. Not a verdict or advice ask → ignore.'
            : 'Skill auto-trigger is disabled: keep this verdict self-check INLINE. This prompt classifier does not authorize a heavy review skill. Named user requests and required calls in an already authorized operation still follow the skill activation policy.',
        ...(decisionSupportMode ? [decisionSupportMode === 'off'
            ? 'Active decision-support mode: `off` — make no grill / why-review offer; the inline self-check above still applies.'
            : `Active decision-support mode: \`${decisionSupportMode}\` — close a consequential answer in that form.`] : []),
        MARKER_END
    ].join('\n');
}

/**
 * Return the directive for the event's prompt (`routedPrompt`), or '' to stay silent.
 * deps (tests): env, projectDir, rawSettings — forwarded to the prompt lookup and the opt-out check.
 */
function evaluate(input, deps = {}) {
    try {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return '';
        const leans = detectLeans(routedPrompt(input, deps));
        if (leans.length === 0) return '';
        // Checked only on a match, so most prompts never pay for the settings read.
        if (!isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, deps)) return '';
        const { resolveHookSkillAutoTrigger, resolveHookDecisionSupportMode } = require('./lib/prompt-route-utils.cjs');
        const skillAutoTrigger = resolveHookSkillAutoTrigger(deps).enabled;
        const { effectiveMode } = resolveHookDecisionSupportMode({ ...deps, skillAutoTrigger });
        return `${buildDirective(leans, undefined, skillAutoTrigger, effectiveMode)}\n`;
    } catch (error) {
        debugError(HOOK_NAME, error); // fail open: stay silent, diagnose under CK_DEBUG
        return '';
    }
}

/**
 * The decision-support rule this event may deliver, or null — never at a sub-agent start (no user channel), never
 * for host content, never without a session id (it could not be de-duplicated) or with the router switched off.
 * Returns { text, hash } so the caller records one delivery per mode.
 * deps (tests): env, projectDir, rawSettings, homeDir, skillAutoTrigger.
 */
function decisionSupportRule(input, deps = {}) {
    try {
        if (!input || typeof input !== 'object' || Array.isArray(input)) return null;
        const event = input.hook_event_name;
        const ledger = require('./lib/convention-ledger.cjs');
        const isPrompt = !event || event === 'UserPromptSubmit';
        if (!isPrompt && !(event === 'SessionStart' && ledger.isCompactionStart(input))) return null;
        if (typeof input.session_id !== 'string' || input.session_id.trim() === '') return null;
        if (isPrompt && readUserPrompt(input.prompt) === null) return null; // host envelope, not user input
        if (!isRouterEnabled(SETTINGS_SECTION, ENV_SWITCH, deps)) return null;
        const { resolveHookSkillAutoTrigger, resolveHookDecisionSupportMode } = require('./lib/prompt-route-utils.cjs');
        const skillAutoTrigger = typeof deps.skillAutoTrigger === 'boolean' ? deps.skillAutoTrigger : resolveHookSkillAutoTrigger(deps).enabled;
        const resolved = resolveHookDecisionSupportMode({ ...deps, skillAutoTrigger });
        const text = buildDecisionSupportRule(resolved.effectiveMode, resolved.mode);
        if (!text) return null;
        const hash = require('crypto').createHash('sha256').update(`${HOOK_NAME}:${text}`, 'utf8').digest('hex');
        return { text, hash };
    } catch (error) {
        debugError(HOOK_NAME, error); // fail open: the per-prompt directive still carries the rule's mode
        return null;
    }
}

/** Ledger settings: a byte window only, as the other once-per-window routers use. */
function ledgerSettings(ledger) {
    const { BYTES_PER_TOKEN } = require('./lib/file-conventions.cjs');
    return {
        reinjectAfterBytes: DEFAULT_REINJECT_TOKENS * BYTES_PER_TOKEN,
        reinjectAfterMinutes: null,
        blindReinjectAfterMinutes: null,
        compactionMarkers: [ledger.CODEX_COMPACTION_MARKER]
    };
}

function defaultWrite(text, done) {
    try {
        process.stdout.write(text, err => done(!err));
    } catch {
        done(false);
    }
}

/**
 * Resolve to the text written: the per-prompt directive (when the prompt asks for a verdict) plus, at most once
 * per session window, the decision-support rule — one output in the event's form (plain text on a prompt, one
 * context envelope after a compaction).
 * deps (tests): env, now, projectDir, rawSettings, homeDir, skillAutoTrigger, ledger, storeRoot, write.
 */
function run(input, deps = {}) {
    return new Promise(resolve => {
        const write = deps.write || defaultWrite;
        const writeText = text => (text ? write(routerOutput(input, text), ok => resolve(ok === false ? '' : text)) : resolve(''));
        let directive = '';
        try {
            directive = evaluate(input, deps);
            const rule = decisionSupportRule(input, deps);
            if (!rule) return writeText(directive);
            const env = deps.env || process.env;
            const ledger = deps.ledger || require('./lib/convention-ledger.cjs');
            const combined = `${directive}${rule.text}\n`;
            ledger.deliverWithCompaction({
                root: deps.storeRoot || ledger.storeRoot(env),
                input: ledger.agentStartInput(input),
                group: DS_RECORD_GROUP,
                hash: rule.hash,
                payload: routerOutput(input, combined),
                settings: ledgerSettings(ledger),
                now: typeof deps.now === 'number' ? deps.now : Date.now(),
                write
            }).then(written => (written ? resolve(combined) : writeText(directive)), () => writeText(directive));
        } catch (error) {
            debugError(HOOK_NAME, error); // fail open: an advisory hook never blocks a prompt
            writeText(directive);
        }
    });
}

module.exports = {
    HOOK_NAME,
    MARKER_START,
    MARKER_END,
    SYNC_TAG,
    SETTINGS_SECTION,
    ENV_SWITCH,
    LEANS,
    detectLeans,
    isJudgementRequest,
    DS_MARKER_START,
    DS_MARKER_END,
    DS_RECORD_GROUP,
    buildDecisionSupportRule,
    decisionSupportRule,
    buildDirective,
    evaluate,
    run
};

if (isHookEntryPoint(module)) {
    process.exitCode = 0;
    try {
        const { parseStdinSync } = require('./lib/stdin-parser.cjs');
        const input = parseStdinSync({ defaultValue: null, throwOnError: true, context: HOOK_NAME });
        if (input) run(input).then(() => { process.exitCode = 0; }, () => { process.exitCode = 0; });
    } catch (error) {
        debugError(HOOK_NAME, error); // fail open: an advisory hook never blocks a prompt
    }
}
