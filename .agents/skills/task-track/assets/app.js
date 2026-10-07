'use strict';

// A session credential arrives once and is removed from the URL. It is kept for this tab only, so a reload
// stays attached; it ends with the tab or with the workspace process, whichever comes first.
(() => {
  const fragment = new URLSearchParams(location.hash.slice(1));
  let sessionToken = fragment.get('session');
  // A launch link carries a single-use code instead; it is exchanged for the session once this page runs.
  const launchCode = fragment.get('attach');
  const SESSION_KEY = 'workspace-session';
  const kept = () => { try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; } };
  const keep = value => {
    try { if (value) sessionStorage.setItem(SESSION_KEY, value); else sessionStorage.removeItem(SESSION_KEY); }
    catch { /* Storage is unavailable: the session then lasts until this page is reloaded. */ }
  };
  const directItem = fragment.get('item');
  const directOwner = fragment.get('owner');
  history.replaceState(null, '', location.pathname);
  // Opening a launch address in a tab that already shows this page only changes the fragment; load it afresh so it is read.
  addEventListener('hashchange', () => { if (/(?:^#|&)(?:session|attach)=/.test(location.hash)) location.reload(); });
  const main = document.getElementById('view');
  const feedback = document.getElementById('feedback');
  const notices = document.getElementById('notices');
  const navigation = document.getElementById('navigation');
  const sourcePanel = document.getElementById('source-panel');
  const checkpointDialog = document.getElementById('draft-checkpoint');
  const noFilters = () => ({ search: '', owner: '', status: '', kind: '', remaining: false });
  const state = {
    session: null, snapshot: null, scope: {}, view: 'Overview', layout: 'list', selectedKey: null,
    filters: noFilters(),
    form: null, busy: false, uncertain: null, result: null, message: '',
    compare: null, checkpoint: null, returnFocus: null, limit: 100, recovery: null, stopped: '',
    panel: false, report: null, entryPath: [], contexts: [], concerns: null,
    // The status report last shown in this page, and whether it must be brought up to date before it is shown again.
    reportDoc: null, reportDue: false
  };
  // The tracker owns the words. Kinds, states, group purposes and link relations, and the name shown for each, arrive
  // with every read; this page keeps no list of its own. What stays here is what a view decides: order, actions, sentences.
  const vocabulary = () => state.snapshot?.vocabulary || {};
  // A read that carries no words comes from a workspace started with another framework version. Nothing in it can be
  // named, so it is refused whole: no view is drawn from it.
  const READ_VERSION = 2;
  const UNSUPPORTED = 'This workspace response is unsupported. Relaunch the project tool with the matching framework version.';
  const usable = snapshot => snapshot?.schemaVersion === READ_VERSION && !!snapshot.vocabulary?.labels?.states
    && [snapshot.vocabulary.kinds, snapshot.vocabulary.states].every(words => Array.isArray(words) && words.length > 0);
  const named = (table, word) => vocabulary().labels?.[table]?.[word] || word;
  const kinds = () => vocabulary().kinds || [];
  const kindName = kind => named('kinds', kind);
  const kindWords = kind => [kindName(kind), named('kindsPlural', kind)].map(name => name.toLocaleLowerCase());
  const labels = () => vocabulary().labels?.states || {};
  const isDelivery = item => item.kind === vocabulary().deliveryKind;
  const isGroup = item => (vocabulary().groupKinds || []).includes(item.kind);
  function kindHelp(kind) {
    const name = kindName(kind).toLocaleLowerCase();
    const one = `${/^[aeiou]/.test(name) ? 'An' : 'A'} ${name}`;
    if (kind === vocabulary().deliveryKind) return `${one} counts toward delivery, one block each.`;
    return isGroup({ kind }) ? `${one} collects work and can be chosen as a progress scope.` : `${one} is tracked outside the delivery count.`;
  }
  const transitions = {
    draft: ['planned', 'canceled'], planned: ['ready', 'canceled'], ready: ['in_progress', 'canceled'],
    in_progress: ['blocked', 'verifying', 'canceled'], blocked: [], verifying: ['canceled'],
    done: ['planned', 'ready', 'in_progress', 'canceled'], canceled: []
  };
  // The lifecycle line. Blocked work waits beside In progress; canceled work is off the line.
  const STATIONS = ['draft', 'planned', 'ready', 'in_progress', 'verifying', 'done'];
  // The list reads from the work nearest to acceptance down to drafts, then finished work.
  const LIST_ORDER = ['verifying', 'in_progress', 'ready', 'planned', 'draft', 'done'];
  const proofNames = { current: 'Proved', stale: 'Proof stale', missing: 'No proof', unknown: 'Proof unknown' };
  const forwardAction = { draft: 'Move to planned', planned: 'Review readiness', ready: 'Start work',
    in_progress: 'Request verification', blocked: 'Resume work', verifying: 'Accept work' };
  const cautiousActions = ['Cancel work', 'Retire work', 'Review draft deletion', 'Delete entirely'];
  // Work that has ended is outside every active scope; only that work, and an untouched draft, can be deleted.
  const ended = item => !!item && (!!item.retired || item.state === 'canceled');
  const actionIcons = { Assign: 'person', 'Refine work': 'edit', 'Edit links': 'link', 'Attest record health': 'pulse', 'Manage group': 'board', 'Record observed proof': 'check' };
  // One sentence per leading action: what the next recorded step is, and what it does not do.
  const nextStops = {
    'Move to planned': ['Next stop: planned work', 'A draft stays out of planning until someone moves it to planned.'],
    'Review readiness': ['Next stop: a readiness review', 'Ready records that you reviewed the scope and acceptance criteria, and that required decisions are resolved.'],
    'Start work': ['Next stop: start the work', 'Starting is its own recorded step. Assignment alone never starts work.'],
    'Request verification': ['Next stop: verification', 'Verifying says the work is ready to be observed against its acceptance criteria. It does not accept the work.'],
    'Resume work': ['Next stop: resume the work', 'Record how the blocker was resolved. The record returns to the state it was blocked in.'],
    'Accept work': ['Next stop: an acceptance decision', 'Every criterion has current passing proof. Accepting is still your own explicit decision; it is never inferred from proof or a state change.'],
    'Record observed proof': ['Next stop: observed proof', 'Acceptance needs current passing proof for every criterion. Record only what you actually observed.'],
    Assign: ['Next stop: someone responsible', 'Nobody is responsible for this record yet. Assigning does not start it.'],
    'Review tracking adoption': ['Next stop: tracking adoption', 'This legacy record keeps its content. Adoption adds tracking metadata after you review the exact change.'],
    'Restore work': ['Next stop: restore or leave retired', 'Restoring returns a retired record to tracked work. Its history and references are kept either way.']
  };
  const historyPhrases = { create: 'captured this record', update: 'refined it', adopt: 'adopted tracking', assign: 'changed responsibility',
    link: 'changed links', group: 'changed group members', proof: 'recorded proof', accept: 'accepted the work',
    retire: 'retired it', restore: 'restored it', attest: 'attested record health' };
  // The version of a save request this page writes. The tracker refuses any other and says which it expects.
  const REQUEST_VERSION = 2;
  const PIP_LIMIT = 8;
  const ROW_PIP_LIMIT = 5;
  const BLOCK_LIMIT = 120;
  const DENSE_BLOCKS = 40;
  const LABELLED_BLOCKS = 12;
  const FEW_BLOCKS = 4;
  const GHOST_BLOCKS = 8;
  const QUEUE_LIMIT = 8;
  const HISTORY_LIMIT = 6;
  const REASON_LIMIT = 20;
  const REASONS_SHOWN = 3;
  const PERSON_ROWS = 6;
  const AVATAR_TINTS = 4;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const ICONS = { check: 'M5 12.5l4.5 4.5L19 7.5', refresh: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6', clock: 'M12 7.5V12l3 2M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17z',
    alert: 'M12 4l9 16H3zM12 10v4.5M12 17.5v.4', seal: 'M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6z',
    person: 'M12 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM5 20a7 7 0 0 1 14 0', plus: 'M12 5v14M5 12h14', arrow: 'M5 12h14M13 6l6 6-6 6',
    chevron: 'M6 9l6 6 6-6', chevronRight: 'M9 6l6 6-6 6', close: 'M6 6l12 12M18 6L6 18',
    lock: 'M7 11h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2zM8 11V8a4 4 0 0 1 8 0v3',
    list: 'M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01', board: 'M4 4h4.5v16H4zM9.75 4h4.5v11h-4.5zM15.5 4h4.5v14h-4.5z',
    search: 'M4 11a7 7 0 1 0 14 0 7 7 0 1 0-14 0M20 20l-3.5-3.5', edit: 'M4 20l1-4L16.5 4.5l3 3L8 19z',
    link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    pulse: 'M3 12h4l2.5-6 4 12 2.5-6H21', file: 'M7 3h7l5 5v13H7zM14 3v5h5' };
  const clone = value => JSON.parse(JSON.stringify(value));
  const reviewsReadiness = form => form.values.nextState === 'ready'
    || (form.base?.state === 'done' && form.values.nextState === 'in_progress')
    || (form.values.correction && ['in_progress', 'blocked', 'verifying'].includes(form.values.nextState));
  const itemKey = item => JSON.stringify([item.id, item.ownerPath]);
  const items = () => state.snapshot?.items || [];
  const members = () => state.snapshot?.members || [];
  const selected = () => items().find(item => itemKey(item) === state.selectedKey);
  const memberName = id => id ? (members().find(member => member.id === id)?.displayName || `Unknown member (${id})`) : 'Unassigned';
  const hasRedaction = value => /\[REDACTED(?:-INPUT)?:/i.test(JSON.stringify(value));
  const hasUniqueId = id => items().filter(item => item.id === id).length === 1;
  const text = value => value === undefined || value === null ? 'Unknown' : String(value);
  const instant = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value || '') ? `${value.slice(0, 10)} ${value.slice(11, 16)} UTC` : text(value);
  const day = value => /^\d{4}-\d{2}-\d{2}/.test(value || '') ? value.slice(0, 10) : text(value);
  const clock = value => /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value || '') ? `${value.slice(11, 16)} UTC` : '';
  const initials = name => name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => Array.from(part)[0].toUpperCase()).join('') || '?';
  const stateName = item => labels()[item.state] ? item.state : 'other';
  const onLine = item => STATIONS.includes(item.state) || item.state === 'blocked';
  const acceptanceWord = item => item.retired ? 'Retired' : item.acceptance?.accepted ? 'Accepted' : 'Not accepted';
  const counted = (total, one, many) => `${total} ${total === 1 ? one : many}`;
  const sentence = value => `${value}${/[.!?]$/.test(value) ? '' : '.'}`;
  const idTail = id => id.includes('-') ? id.slice(id.lastIndexOf('-') + 1) : id;
  const groupInfo = id => state.snapshot?.hierarchy?.groups?.find(group => group.id === id);
  // A project may name its group purposes; the tracker's own name stands in for one it has not named.
  const purposeName = role => state.snapshot?.hierarchy?.labels?.[role] || named('groupRoles', role);
  const groupLabel = item => item?.groupRole ? purposeName(item.groupRole) : 'Generic group';
  const groupName = id => { const item = items().find(record => record.id === id && hasUniqueId(id)); return item ? `${groupLabel(item)} ${id}: ${item.title}` : `Unavailable group ${id}`; };
  const scopeLabel = () => state.scope.groupId ? groupName(state.scope.groupId) : 'Whole project';
  const sourcePhrase = () => state.snapshot.source?.kind === 'worktree' ? 'your working copy' : state.snapshot.source?.kind === 'shared' ? `pinned ref ${state.snapshot.source.ref}` : 'the selected source';
  const CONTEXT_LIMIT = 64;
  function currentContext() {
    return { scope: clone(state.scope), path: [...state.entryPath], selectedKey: state.selectedKey,
      filters: clone(state.filters), view: state.view === 'Editor' ? 'Work' : state.view, concerns: state.concerns };
  }
  function rememberContext() {
    if (state.contexts.length === CONTEXT_LIMIT) state.contexts.shift();
    state.contexts.push(currentContext());
  }
  function validPath(path, snapshot = state.snapshot) {
    const groups = snapshot?.hierarchy?.groups || [];
    return path.length <= CONTEXT_LIMIT && new Set(path).size === path.length && path.every((id, index) =>
      groups.some(group => group.id === id && (!index || groups.find(parent => parent.id === path[index - 1])?.directGroupIds?.includes(id))));
  }
  function selectWork(item) {
    if (state.selectedKey !== itemKey(item)) rememberContext();
    state.selectedKey = itemKey(item); state.view = 'Work';
  }
  function enterGroup(id, path = [id]) {
    checkpoint(async () => {
      if (!validPath(path) || path.at(-1) !== id) return announce('Path unavailable. Inspect a current group or choose a declared direct affiliation.');
      const previous = currentContext();
      if (!await reread({ ...state.scope, groupId: id })) return;
      if (!validPath(path)) { state.entryPath = groupInfo(id) ? [id] : []; state.message = 'Path unavailable after reread. Inspect the current group or its reasons; no parent was inferred.'; }
      else state.entryPath = [...path];
      if (state.contexts.length === CONTEXT_LIMIT) state.contexts.shift();
      state.contexts.push(previous); state.selectedKey = null; state.filters = noFilters(); state.concerns = null; state.view = 'Work'; landFeedback(); render(true);
    });
  }
  function backContext() {
    checkpoint(async () => {
      const previous = state.contexts.at(-1);
      if (!previous || !await reread(previous.scope)) return;
      state.contexts.pop(); state.entryPath = validPath(previous.path) ? previous.path : previous.scope.groupId && groupInfo(previous.scope.groupId) ? [previous.scope.groupId] : [];
      if (previous.path.length && !validPath(previous.path)) state.message = 'Path unavailable after reread. No removed or guessed parent is used.';
      state.selectedKey = items().some(item => itemKey(item) === previous.selectedKey) ? previous.selectedKey : null;
      state.filters = previous.filters; state.view = previous.view; state.concerns = null;
      if (previous.concerns) {
        state.busy = true; render();
        try { state.concerns = await api('/api/concerns', { query: { schemaVersion: 1, itemIds: previous.concerns.scope.itemIds, paths: previous.concerns.scope.paths },
          ...(state.scope.ref !== undefined ? { ref: state.scope.ref } : {}) }); }
        catch (error) { state.message = `Linked concerns unavailable after reread: ${error.message}. The restored scope and draft are retained.`; }
        finally { state.busy = false; }
      }
      landFeedback(); render(true);
    });
  }
  function contextNavigation() {
    return element('nav', { class: 'strip strip--plain', 'aria-label': 'Chosen scope path' }, [
      paragraph(`Delivery scope: ${scopeLabel()}`, 'note'),
      paragraph(`Inspected group/path: ${state.entryPath.length ? state.entryPath.map(groupName).join(' / ') : 'Direct project entry'}${selected() ? ` / ${selected().id}` : ''}`, 'note'),
      state.contexts.length ? button('Back to previous context', backContext, { class: 'quiet' }) : null,
      state.scope.groupId && groupInfo(state.scope.groupId) ? element('details', {}, [element('summary', { text: 'Other direct affiliations' }),
        ...(groupInfo(state.scope.groupId).parentGroupIds || []).map(id => button(`Enter through ${id}`, () => enterGroup(state.scope.groupId, [id, state.scope.groupId]), { class: 'quiet' }))]) : null,
      state.scope.groupId && items().find(item => item.id === state.scope.groupId && hasUniqueId(item.id))
        ? button(`Inspect group ${state.scope.groupId}: ${items().find(item => item.id === state.scope.groupId).title}`, () => openItem(items().find(item => item.id === state.scope.groupId)), { class: 'quiet' }) : null]);
  }
  const sourceToneOf = snapshot => snapshot.coverage === 'unavailable' ? 'stop' : snapshot.source?.kind === 'worktree' ? 'live' : 'pinned';
  const filtersActive = () => state.view === 'My work' || JSON.stringify(state.filters) !== JSON.stringify(noFilters());

  function element(tag, attributes = {}, children = []) {
    const node = document.createElement(tag);
    for (const [name, value] of Object.entries(attributes)) {
      if (value === undefined || value === null || value === false) continue;
      if (name === 'class') node.className = value;
      else if (name === 'text') node.textContent = text(value);
      else if (name === 'onClick') node.addEventListener('click', value);
      else if (name === 'onChange') node.addEventListener('change', value);
      else if (name === 'onInput') node.addEventListener('input', value);
      else if (name === 'checked' || name === 'disabled' || name === 'required') node[name] = !!value;
      else node.setAttribute(name, String(value));
    }
    for (const child of Array.isArray(children) ? children : [children]) {
      if (child !== null && child !== undefined) node.append(child instanceof Node ? child : document.createTextNode(text(child)));
    }
    return node;
  }
  const paragraph = (value, className) => element('p', { text: value, class: className });
  const heading = value => element('h2', { text: value, tabindex: '-1' });
  const mono = value => element('span', { class: 'mono', text: value });
  const actions = (...children) => element('div', { class: 'actions' }, children);
  function icon(name) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    for (const [key, value] of [['class', 'icon'], ['viewBox', '0 0 24 24'], ['aria-hidden', 'true'], ['focusable', 'false']]) svg.setAttribute(key, value);
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', ICONS[name]);
    svg.append(path);
    return svg;
  }
  // An icon never becomes part of a button's name: the label keeps its own element beside it.
  function button(name, action, options = {}) {
    const { icon: before, iconAfter, ...attributes } = options;
    const node = element('button', { type: 'button', onClick: action, disabled: state.busy, ...attributes });
    if (before) node.append(icon(before));
    if (name !== '') node.append(before || iconAfter ? element('span', { text: name }) : name);
    if (iconAfter) node.append(icon(iconAfter));
    return node;
  }
  function sheet(id, title, aside, className = 'sheet') {
    return element('section', { class: className, 'aria-labelledby': id }, element('div', { class: 'sheet-head' },
      [element('h3', { id, text: title }), aside ? paragraph(aside, 'note') : null]));
  }
  function pageHead(title, context, ...tools) {
    return element('div', { class: 'page-head' }, [element('div', { class: 'page-title' }, [heading(title), context instanceof Node ? context : context ? paragraph(context, 'page-context') : null]), ...tools]);
  }
  const pageLead = (...children) => element('div', { class: 'page-lead' }, children);
  function details(name, value, id) {
    return element('details', { id }, [element('summary', { text: name }), element('pre', { text: JSON.stringify(value, null, 2) })]);
  }
  // Each cell is one recorded fact: a small label, the value with its mark, then any supporting lines.
  function factCells(cells, className) {
    return element('dl', { class: className }, cells.map(([name, value, ...support]) => element('div', {}, [element('dt', { class: 'label', text: name }),
      element('dd', { class: 'fact-value' }, value), ...support.filter(Boolean).map(line => element('dd', { class: 'fact-sub', text: line }))])));
  }
  const dot = (name, variant) => element('span', { class: `dot dot--${name}${variant ? ` dot--${variant}` : ''}`, 'aria-hidden': 'true' });
  // Initials on a tint taken from the member's place in the configured list, so neighbours differ. The tint carries no meaning and never changes with their work.
  function avatar(id, size) {
    const sized = size ? ` avatar--${size}` : '';
    if (!id) return element('span', { class: `avatar avatar--none${sized}`, 'aria-hidden': 'true', title: 'Unassigned' }, icon('person'));
    const place = members().findIndex(member => member.id === id);
    const tint = place < 0 ? 'unknown' : `tint${place % AVATAR_TINTS}`;
    return element('span', { class: `avatar avatar--${tint}${sized}`, 'aria-hidden': 'true', title: memberName(id), text: initials(memberName(id)) });
  }
  // Four separately recorded facts get four separate marks: state, responsible person, proof and acceptance.
  const kindMark = item => element('span', { class: `kind${isDelivery(item) ? ' kind--delivery' : ''}`, text: kindName(item.kind) });
  const proofStatus = item => proofNames[item.verification?.status] ? item.verification.status : 'unknown';
  const proofWord = item => item.criteria?.length ? proofNames[proofStatus(item)] : 'No criteria';
  function pips(item, limit = PIP_LIMIT) {
    const count = item.criteria?.length || 0;
    return [element('span', { class: 'pips', 'aria-hidden': 'true' }, Array.from({ length: Math.min(count, limit) }, () => element('span', { class: 'pip' }))),
      count > limit ? element('span', { text: `+${count - limit}` }) : null];
  }
  const proofMark = item => element('span', { class: `mark proof proof--${proofStatus(item)}` }, [...pips(item), element('span', { text: proofWord(item) })]);
  const sealMark = item => item.acceptance?.accepted ? element('span', { class: 'seal' }, [icon('check'), 'Accepted'])
    : element('span', { class: 'seal seal--none', text: 'Not accepted' });
  const acceptDot = (accepted, small) => element('span', { class: `accept accept--${accepted ? 'yes' : 'no'}${small ? ' accept--s' : ''}`, 'aria-hidden': 'true',
    title: accepted ? 'Accepted' : 'Not accepted' }, accepted ? icon('check') : []);
  const flag = (value, tone) => element('span', { class: `flag${tone ? ` flag--${tone}` : ''}`, text: value });

  // What the selected source says about the vocabulary it stores. A pinned ref is read-only whatever it stores, so only
  // the checkout is told to migrate.
  const stored = () => state.snapshot?.vocabulary?.project || null;
  // The migrate command and the two sentences that give it, each written once. A command word is set apart so a view can
  // mark it; the plain form is the same sentence for a line of text.
  const MIGRATE = 'migrate --root <checkout>';
  const MIGRATION_STEPS = ['Preview the migration with the task tool: ', [`${MIGRATE} --dry-run`], '. Then run it without ', ['--dry-run'], '.'];
  const MIGRATION_RERUN = [' The task tool command is ', [MIGRATE], '.'];
  const marked = parts => parts.map(part => Array.isArray(part) ? mono(part[0]) : part);
  const migrationSteps = MIGRATION_STEPS.flat().join('');
  const needsMigration = () => stored()?.code === 'MIGRATION_REQUIRED' && state.scope.ref === undefined;
  // Two vocabularies at once, or a migration that stopped part-way: nothing was read as work, so no view has a true thing to show.
  const unreadable = () => !!stored()?.code && stored().storedVersion === null;
  // The reason a source gives for holding no readable work, with the command when running it again is the way on.
  const unreadableReason = project => [`${project.reason}.`, ...(project.code === 'MIGRATION_IN_PROGRESS' ? marked(MIGRATION_RERUN) : [])];
  function writableReason(item) {
    if (needsMigration()) return `${stored().reason}. ${migrationSteps}`;
    if (unreadable() && state.scope.ref === undefined) return `${stored().reason}.`;
    if (!state.session?.writable || !state.session.actor) return 'This session is read-only. Launch a writable workspace with your configured stable member identity to make changes.';
    if (state.scope.ref !== undefined || state.snapshot?.source?.kind !== 'worktree') return 'The selected shared snapshot is read-only. Choose the current checkout to propose changes.';
    if (!state.snapshot?.profile?.available) return 'This project’s native tracking capability is unavailable. Original records are preserved; no replacement format is created.';
    if (state.snapshot.coverage !== 'complete') return 'Work cannot be changed while inspection is incomplete. Resolve the listed diagnostics, then reread the current checkout.';
    if (item && !hasUniqueId(item.id)) return 'This identity has multiple owners. Resolve the duplicate records before making changes.';
    if (state.uncertain) return 'An earlier save has an unknown outcome. Retry that original operation before starting another change.';
    if (state.recovery) return 'A confirmed removal still has pending completion recovery. Retry deletion recovery before starting another change.';
    return '';
  }
  // The actions this session may take on one record, in the order they are offered, and the one that leads.
  // The record sheet and the Overview both read this list, so a record offers the same steps wherever it is shown.
  function offeredActions(item) {
    const reason = writableReason(item);
    const available = operation => !reason && state.snapshot.profile.capabilities?.includes(operation);
    const offered = [];
    const add = (name, operation, extra) => { if (available(operation)) offered.push({ name, operation, extra }); };
    if (item.legacy) add('Review tracking adoption', 'adopt');
    else if (item.retired) { add('Restore work', 'restore'); add('Delete entirely', 'delete'); }
    else {
      add('Assign', 'assign'); add('Refine work', 'update'); add('Edit links', 'link');
      if (isGroup(item)) add('Manage group', 'group');
      const allowed = item.state === 'blocked' ? [item.blocker?.resumeState, 'canceled'].filter(Boolean) : transitions[item.state] || [];
      for (const next of [...new Set(allowed)]) {
        if (next === 'in_progress' && item.state === 'ready' && (!state.snapshot.ready?.includes(item.id) || !members().some(member => member.id === item.assigneeId && member.active))) continue;
        const name = next === 'in_progress' ? item.state === 'blocked' ? 'Resume work' : item.state === 'done' ? 'Reopen in progress' : 'Start work'
          : next === 'ready' ? 'Review readiness' : next === 'verifying' ? 'Request verification'
            : next === 'blocked' ? 'Record blocker' : next === 'canceled' ? 'Cancel work' : item.state === 'done' ? 'Reopen to planned' : 'Move to planned';
        add(name, 'transition', { nextState: next });
      }
      if (item.verification?.criteriaIdentity && item.verification?.sourceIdentity && item.criteria?.length && !hasRedaction(item.criteria)) add('Record observed proof', 'proof');
      if (item.state === 'verifying' && item.verification?.status === 'current') add('Accept work', 'accept');
      if (members().some(member => member.id === state.session.actor && member.active)) add('Attest record health', 'attest');
      // Outside the usual steps: any other recorded state, such as canceled work taken back to draft.
      if (labels()[item.state]) add('Change state', 'transition', { correction: true });
      add('Retire work', 'retire');
      if (item.state === 'draft') add('Review draft deletion', 'delete');
      else if (item.state === 'canceled') add('Delete entirely', 'delete');
    }
    // One next step leads: the forward move for this state, else the fact that is still missing.
    const names = offered.map(action => action.name);
    const lead = [item.legacy ? 'Review tracking adoption' : item.retired ? 'Restore work' : forwardAction[item.state],
      item.assigneeId ? null : 'Assign', item.state === 'verifying' ? 'Record observed proof' : null].find(name => names.includes(name));
    const rank = action => action.name === lead ? 0 : cautiousActions.includes(action.name) ? 2 : 1;
    return { reason, lead, offered: [...offered].sort((a, b) => rank(a) - rank(b)) };
  }
  function actionButton(action, item, lead) {
    const leading = action.name === lead;
    return button(action.name, () => beginForm(action.operation, item, action.extra), { icon: leading ? undefined : actionIcons[action.name], iconAfter: leading ? 'arrow' : undefined,
      class: leading ? 'primary' : cautiousActions.includes(action.name) ? 'caution' : undefined });
  }

  // Requests a page may make before it has a session. They carry no credential.
  async function beforeSession(route, body) {
    const response = await fetch(route, { method: body === undefined ? 'GET' : 'POST', headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', cache: 'no-store' });
    const value = await response.json().catch(() => ({}));
    if (!response.ok) throw Object.assign(new Error(value.reason || 'The workspace refused this request.'), { status: response.status, code: value.code });
    return value;
  }

  // A read answers quickly. A status report has no size limit, so writing one for a large project takes far longer, and a
  // save brings the report up to date before it answers. Giving up on a save early would call a saved change unconfirmed,
  // so work that may write the report gets the long wait. A preview writes nothing and keeps the short one.
  const READ_WAIT_MS = 12000;
  const REPORT_WRITE_WAIT_MS = 120000;
  const mayWriteReport = (route, body) => route.startsWith('/api/report') || route === '/api/operation' && !body?.preview;
  async function api(route, body) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), mayWriteReport(route, body) ? REPORT_WRITE_WAIT_MS : READ_WAIT_MS);
    try {
      const response = await fetch(route, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'X-Workspace-Session': sessionToken, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        body: body === undefined ? undefined : JSON.stringify(body), credentials: 'omit', cache: 'no-store',
        signal: controller.signal
      });
      let value;
      try { value = await response.json(); }
      catch { throw Object.assign(new Error('The response could not be read. Reread the project or retry the original operation.'), { uncertain: true }); }
      if (!response.ok) throw Object.assign(new Error(value.primary?.reason || value.reason || 'The workspace refused this request. Reread the project and check this session.'), {
        status: response.status, code: value.primary?.code || value.code, value,
        uncertain: response.status >= 500 || !value.primary && value.code === 'IO_FAILURE'
      });
      return value;
    } catch (error) {
      if (error.status || error.uncertain) throw error;
      throw Object.assign(new Error('The workspace did not confirm a response. Check the local server, then retry.'), { uncertain: true });
    } finally { clearTimeout(timer); }
  }

  // A message or a saved card belongs to the action that produced it. It stays on the view that action lands on and
  // leaves when the person starts another request or goes to another view. A follow-up that is still pending stays.
  let feedbackShown = null;
  function dismissFeedback() {
    state.message = '';
    if (!(state.result?.secondary || []).some(item => item.status === 'pending')) state.result = null;
  }
  function settleFeedback() {
    const shown = feedbackShown;
    if (shown && shown.view !== state.view && shown.message === state.message && shown.result === state.result) dismissFeedback();
    feedbackShown = state.message || state.result ? { view: state.view, message: state.message, result: state.result } : null;
  }
  // An action that rereads and then moves to another view lands there: what the reread said is shown on that view.
  function landFeedback() { feedbackShown = null; }
  // Every request the person starts goes through here, so what the last action said gives way to this one.
  function begin() { dismissFeedback(); state.busy = true; render(); }
  function announce(message) { state.message = message; settleFeedback(); renderFeedback(); }
  function statusCard(tone, mark, title, body, follow = []) {
    return element('div', { class: `status status--${tone}` }, [element('div', { class: 'status-main' }, [
      mark ? element('span', { class: 'status-mark', 'aria-hidden': 'true' }, mark) : null,
      element('div', { class: 'status-text' }, [title ? paragraph(title, 'status-title') : null, body ? paragraph(body, 'status-body') : null])]), ...follow]);
  }
  function renderFeedback() {
    const next = [];
    // The pending note floats over the page, and the last message keeps its place unseen, so a request never moves the content under the pointer.
    if (state.busy) next.push(paragraph('Reading or saving this request… No other save can start until it finishes.', 'busy'));
    const cards = [];
    if (state.message) cards.push(state.busy ? element('div', { class: 'status status--held', 'aria-hidden': 'true' }, element('div', { class: 'status-main' }, paragraph(state.message, 'status-body')))
      : statusCard('info', null, null, state.message));
    if (state.result?.primary?.status === 'saved') {
      const result = state.result.primary;
      const follow = (state.result.secondary || []).map(secondary => element('div', { class: `status-follow${secondary.status === 'pending' ? ' status-follow--pending' : ''}` }, [
        paragraph(`${secondary.kind || 'Follow-up'}: ${secondary.status}. ${secondary.reason || ''}`),
        secondary.kind === 'report' && secondary.status === 'pending' ? button('Retry report refresh', refreshReport) : null]));
      cards.push(statusCard('saved', icon('check'), `${result.deleted ? result.ended ? 'Deleted ended work' : 'Deleted draft' : 'Saved'} ${result.itemId} in the local checkout${result.replayed ? ' (original receipt replayed)' : ''}.`,
        'Share it through your team’s Git process.', follow));
    }
    if (state.uncertain) cards.push(statusCard('warn', '?', 'Save outcome unknown.', 'The original request is retained in this page; retrying it checks the original operation receipt and does not start a new intent.',
      [actions(button('Retry original save', retryOriginal, { class: 'strong' }), button('Read current without resaving', () => readCurrentForConflict()))]));
    if (state.recovery) cards.push(statusCard('warn', icon('alert'), 'Draft removal is confirmed; its completion recovery is still pending.', 'Retry only the retained deletion request.',
      [actions(button('Retry deletion recovery', retryDeletionRecovery))]));
    if (cards.length) next.push(element('div', { class: 'status-stack' }, cards));
    // This area is read out as a whole, so it is rewritten only when what it says has changed.
    if (next.length === feedback.childNodes.length && next.every((node, index) => node.isEqualNode(feedback.childNodes[index]))) return;
    feedback.replaceChildren(...next);
  }
  // Conditions of the selected source that hold until the reader changes it. They sit outside the live status area so a rerender does not announce them again.
  function renderNotices() {
    notices.replaceChildren();
    const snapshot = state.snapshot;
    const banner = (tone, mark, title, body, ...tools) => element('div', { class: `banner banner--${tone}` }, [
      element('span', { class: 'banner-mark', 'aria-hidden': 'true' }, icon(mark)),
      element('div', { class: 'banner-text' }, [element('p', { class: 'banner-title' }, title), element('p', { class: 'banner-body' }, body)]), ...tools]);
    const reasons = () => button('See the reasons', showInspectionReasons);
    // On Changes the same action is already in the comparison card.
    const current = () => state.view === 'Changes' ? null : button('Inspect current checkout', inspectCurrent);
    const reported = snapshot.diagnostics?.length || 0;
    const reportedLine = `${counted(reported, 'reason is', 'reasons are')} reported.`;
    const pinned = state.scope.ref !== undefined;
    if (pinned && snapshot.coverage === 'unavailable') {
      notices.append(banner('alert', 'alert', [mono(state.scope.ref), ' could not be read'], [`Nothing from the current checkout is shown in its place. ${reportedLine}`, ...(unreadable() ? [' ', ...unreadableReason(stored())] : [])], reasons(), current()));
    } else {
      // A record still stored in the earlier words is named here, so the reader need not open the reasons to find it.
      const strays = (snapshot.diagnostics || []).filter(diagnostic => diagnostic.code === 'EARLIER_VOCABULARY_RECORD');
      const found = diagnostic => [diagnostic.itemId, diagnostic.path].filter(Boolean).join(' at ');
      const strayLine = strays.length ? ` ${strays[0].reason}: ${strays.slice(0, REASONS_SHOWN).map(found).join(', ')}${strays.length > REASONS_SHOWN ? ` and ${strays.length - REASONS_SHOWN} more` : ''}.` : '';
      if (unreadable()) notices.append(banner('alert', 'alert', 'No work can be read from this project',
        unreadableReason(stored())));
      else if (snapshot.coverage !== 'complete') notices.append(banner('alert', 'alert', snapshot.coverage === 'unavailable' ? 'Inspection is unavailable' : 'Inspection is incomplete',
        `${snapshot.coverage === 'unavailable' ? 'No work can be counted or changed in this scope.' : 'Counts cover inspected work only, no percentage is shown, and nothing can be changed until this is resolved.'} ${reportedLine}${strayLine}`, reasons()));
      if (needsMigration()) notices.append(banner('pinned', 'lock', 'Migration required: this project is read-only',
        ['It stores the earlier vocabulary. Work is shown in the current words and every count is unchanged. ', ...marked(MIGRATION_STEPS)]));
      if (pinned) notices.append(banner('pinned', 'lock', ['You are reading ', mono(state.scope.ref)], 'A pinned ref is read-only. Inspect the current checkout to propose changes.', current()));
    }
    notices.hidden = !notices.childElementCount;
  }
  function showInspectionReasons() {
    checkpoint(() => {
      state.view = 'Overview'; render();
      const reasons = document.getElementById('inspection-reasons');
      if (reasons) { reasons.open = true; reasons.querySelector('summary').focus(); }
    });
  }

  function checkpoint(next, allowKeep = true) {
    if (state.busy) return;
    if (!state.form?.dirty && !state.uncertain) return next();
    state.checkpoint = next;
    state.returnFocus = document.activeElement;
    document.getElementById('checkpoint-keep').disabled = !allowKeep;
    document.getElementById('checkpoint-discard').disabled = !!state.uncertain;
    document.getElementById('checkpoint-copy').textContent = state.uncertain
      ? 'A save outcome is unknown. Keep its draft and original request, then retry the receipt. Discarding this request is unavailable until its outcome is confirmed.'
      : 'This change has not been saved. Your draft stays in this open page only. Closing or reloading the page loses it.';
    checkpointDialog.showModal();
  }
  function closeCheckpoint(choice) {
    const next = state.checkpoint;
    state.checkpoint = null;
    checkpointDialog.close();
    state.returnFocus?.focus();
    if (choice === 'discard') state.form = null;
    if (choice !== 'return') next?.();
  }
  document.getElementById('checkpoint-return').addEventListener('click', () => closeCheckpoint('return'));
  document.getElementById('checkpoint-keep').addEventListener('click', () => closeCheckpoint('keep'));
  document.getElementById('checkpoint-discard').addEventListener('click', () => closeCheckpoint('discard'));
  checkpointDialog.addEventListener('cancel', event => { event.preventDefault(); closeCheckpoint('return'); });
  window.addEventListener('beforeunload', event => {
    if (state.form?.dirty || state.uncertain || state.recovery) { event.preventDefault(); event.returnValue = ''; }
  });
  window.addEventListener('beforeprint', () => document.querySelectorAll('details').forEach(node => {
    node.dataset.printOpen = String(node.open); node.open = true;
  }));
  window.addEventListener('afterprint', () => document.querySelectorAll('details').forEach(node => {
    node.open = node.dataset.printOpen === 'true'; delete node.dataset.printOpen;
  }));
  sourcePanel.addEventListener('keydown', event => { if (event.key === 'Escape') togglePanel('scope-ref'); });

  function navigate(view) { checkpoint(() => { state.view = view; if (view === 'Report') state.reportDue = true; render(true); }); }
  function showWork(filters) { checkpoint(() => { state.filters = { ...noFilters(), ...filters }; state.limit = 100; state.view = 'Work'; render(true); }); }
  function openItem(item) {
    checkpoint(() => {
      selectWork(item); render();
      main.querySelector('.record-sheet h3')?.focus();
    });
  }
  function renderNavigation() {
    navigation.parentElement.hidden = !state.session;
    if (!state.session) { navigation.replaceChildren(); return; }
    // A count sits beside the tab name as a badge. The tab keeps its plain name; the count is its description.
    const tab = (name, total, one, many, tone) => {
      const counts = total !== null && total !== undefined;
      const node = button(name, () => navigate(name), { class: 'tab', 'aria-current': state.view === name ? 'page' : undefined, title: counts ? counted(total, one, many) : undefined });
      if (counts) node.append(element('span', { class: `tab-count${tone ? ` tab-count--${tone}` : ''}`, 'aria-hidden': 'true', text: total }));
      return node;
    };
    // A source that could not be read has no count of zero; its tabs carry none.
    const readable = state.snapshot.coverage !== 'unavailable';
    const mine = state.session.actor && readable ? items().filter(item => item.assigneeId === state.session.actor).length : null;
    const differing = compared() ? differences().length : null;
    navigation.replaceChildren(tab('Overview'), tab('Work', readable ? items().length : null, 'record in the selected source', 'records in the selected source'),
      tab('My work', mine, 'record is assigned to you', 'records are assigned to you'), tab('People'),
      tab('Changes', differing, 'record differs from the current checkout', 'records differ from the current checkout', differing ? 'warn' : undefined), tab('Report'));
    if (state.form) navigation.append(button('Unsaved draft', () => { state.view = 'Editor'; render(true); }, { class: 'tab tab--draft', 'aria-current': state.view === 'Editor' ? 'page' : undefined }));
    const canCapture = !writableReason() && state.snapshot.profile?.capabilities?.includes('create');
    navigation.append(button('Capture work', () => beginForm('create'), { class: 'primary nav-action', icon: 'plus', disabled: !canCapture || state.busy }));
  }
  function setRoot(value, hint) {
    const root = document.getElementById('root-context');
    root.replaceChildren(element('bdi', { text: value }));
    if (hint) root.title = hint;
  }
  // The source and scope form opens under the app bar. On Changes the same form is part of the page, so the app-bar controls point at it instead.
  const formInPage = () => state.view === 'Changes' && !unreadable();
  function togglePanel(focusId) {
    if (formInPage()) { document.getElementById(focusId)?.focus(); return; }
    state.panel = !state.panel;
    renderContext();
    (state.panel ? document.getElementById(focusId) : document.querySelector(`[data-opens="${focusId}"]`))?.focus();
  }
  function inspectCurrent() { checkpoint(() => { state.panel = false; reread(state.scope.groupId ? { groupId: state.scope.groupId } : {}); }); }
  function renderContext() {
    const snapshot = state.snapshot;
    const onChanges = formInPage();
    if (onChanges) state.panel = false;
    document.getElementById('project-name').textContent = snapshot.project?.name || 'Team work';
    setRoot(`Checkout: ${state.session.root}`, state.session.root);
    const opener = (focusId, children) => {
      const node = button('', () => togglePanel(focusId), { class: 'selector', 'data-opens': focusId, 'aria-controls': onChanges ? 'scope-form' : 'source-panel', 'aria-expanded': onChanges ? undefined : String(state.panel) });
      node.append(...children, icon('chevron'));
      return node;
    };
    const label = String(snapshot.source?.label || 'Selected source unavailable');
    const cut = label.includes(';') ? label.indexOf(';') : label.length;
    const sourceTone = sourceToneOf(snapshot);
    const coverageTone = { complete: 'good', partial: 'warn' }[snapshot.coverage] || 'stop';
    document.getElementById('source-context').replaceChildren(
      opener('scope-group', [element('span', { class: 'selector-text', title: scopeLabel() }, [element('span', { class: 'selector-label', text: 'Scope' }), ' ', scopeLabel()])]),
      opener('scope-ref', [element('span', { class: `state-dot state-dot--${sourceTone}`, 'aria-hidden': 'true' }), element('span', { class: 'selector-text', title: label }, [label.slice(0, cut),
        element('span', { class: 'selector-label', text: label.slice(cut) }), snapshot.source?.ref ? ' ' : null, snapshot.source?.ref ? mono(snapshot.source.ref) : null])]),
      element('span', { class: `pill pill--${coverageTone}` }, [icon(snapshot.coverage === 'complete' ? 'check' : 'alert'), element('span', { text: `Coverage: ${snapshot.coverage}` })]));
    // The read time sits beside the button, not inside it, so the button's name still contains everything its label shows.
    document.getElementById('session-tools').replaceChildren(element('span', { class: 'reread' }, [
      button('Reread', () => checkpoint(() => reread()), { icon: 'refresh', 'aria-label': 'Reread project', 'aria-describedby': snapshot.asOf ? 'read-at' : undefined }),
      snapshot.asOf ? element('span', { id: 'read-at', class: 'reread-time' }, [element('span', { class: 'visually-hidden', text: `Read at ${day(snapshot.asOf)} ` }), clock(snapshot.asOf)]) : null]));
    const readOnly = !!writableReason();
    const actor = state.session.actor;
    document.getElementById('actor-context').replaceChildren(avatar(actor, 'm'), element('span', { class: 'actor-text' }, [
      element('strong', { class: 'actor-name', text: actor ? members().find(member => member.id === actor)?.displayName || 'Unknown member' : 'No write actor' }), actor ? ' ' : null, actor ? element('span', { class: 'actor-id', text: `(${actor})` }) : null, ' ',
      element('span', { class: `actor-mode${readOnly ? ' actor-mode--warn' : ''}`, text: readOnly ? 'Read-only for this scope' : 'Can save locally' }), ' ',
      element('span', { class: 'actor-remote', text: `Remote freshness: ${snapshot.source?.remoteFreshness || 'unknown'}` })]));
    sourcePanel.hidden = !state.panel;
    sourcePanel.replaceChildren();
    if (state.panel) sourcePanel.append(element('div', { class: 'panel-head' }, [element('h2', { class: 'eyebrow', text: 'Source and scope' }), mono(state.session.root)]), scopeControls(),
      actions(button('Close', () => togglePanel('scope-ref'), { class: 'quiet' })));
  }
  // Redrawing replaces the control that has focus. It is found again by a key that survives the redraw: its id, or its
  // place among the same-named controls of its region. A caret keeps its position.
  const focusRegions = () => [main, navigation, feedback, notices, sourcePanel, document.getElementById('source-context'), document.getElementById('session-tools')];
  const focusName = node => node.getAttribute('aria-label') || node.closest('label')?.textContent || node.textContent || '';
  const sameNamed = (region, tag, name) => [...region.querySelectorAll(tag)].filter(peer => focusName(peer) === name);
  function focusKey(node) {
    const region = node && focusRegions().find(candidate => candidate !== node && candidate.contains(node));
    if (!region) return null;
    const key = node.id ? { id: node.id } : { region, tag: node.tagName, name: focusName(node) };
    if (!node.id) key.index = sameNamed(region, key.tag, key.name).indexOf(node);
    if (node.matches('input, textarea')) key.caret = [node.selectionStart, node.selectionEnd, node.selectionDirection];
    return key;
  }
  // The control a request disabled is held here until the request ends and it can take focus again.
  let heldFocus = null;
  function restoreFocus(key) {
    // A control that was not redrawn still has focus.
    if (focusKey(document.activeElement)) return null;
    const target = key.id ? document.getElementById(key.id) : sameNamed(key.region, key.tag, key.name)[key.index];
    // Returning focus to a control must not scroll the page away from where the person is reading.
    target?.focus({ preventScroll: true });
    if (target && document.activeElement === target) {
      if (key.caret) { try { target.setSelectionRange(...key.caret); } catch { /* This kind of input has no caret to place. */ } }
      return null;
    }
    if (state.busy) return key;
    // The control is gone: the reader is put at the top of the view that replaced it.
    main.querySelector('h2')?.focus();
    return null;
  }
  // The page stops showing a workspace it cannot name: the message, a way to try again, and nothing read before it.
  // A draft and an unconfirmed save stay in this page and return when the workspace opens again.
  function stop(message) {
    Object.assign(state, { stopped: message, session: null, snapshot: null, scope: {}, compare: null, report: null, reportDoc: null, concerns: null,
      panel: false, entryPath: [], contexts: [], selectedKey: null });
  }
  function renderStopped(message) {
    feedback.replaceChildren(); notices.replaceChildren(); notices.hidden = true; sourcePanel.replaceChildren(); sourcePanel.hidden = true;
    document.getElementById('session-tools').replaceChildren();
    main.replaceChildren(heading('Project could not be opened'), paragraph(message, 'notice'), actions(button('Retry opening project', initialize, { disabled: false })));
    document.getElementById('source-context').textContent = 'No project opened';
    document.getElementById('actor-context').textContent = 'No actor established';
  }
  function render(focus = false) {
    if (state.stopped) { renderNavigation(); main.setAttribute('aria-busy', 'false'); renderStopped(state.stopped); return; }
    const focusBefore = focus ? null : focusKey(document.activeElement) || heldFocus;
    settleFeedback(); renderFeedback(); renderNavigation();
    main.setAttribute('aria-busy', String(state.busy));
    if (!state.snapshot) return;
    renderContext(); renderNotices();
    // The report frame stays in the page while its view is shown: a frame taken out of the page loads its document again.
    const keptFrame = state.view === 'Report' && !unreadable() && reportFrame?.parentNode === main ? reportFrame : null;
    for (const child of [...main.childNodes]) if (child !== keptFrame) child.remove();
    if (state.view === 'Editor' && state.form) renderEditor();
    else if (unreadable()) renderUnreadable();
    else if (state.view === 'Overview') renderOverview();
    else if (state.view === 'People') renderPeople();
    else if (state.view === 'Changes') renderChanges();
    else if (state.view === 'Report') renderReport();
    else renderWork();
    if (focus) main.querySelector('h2')?.focus();
    heldFocus = focusBefore ? restoreFocus(focusBefore) : null;
    // Opening the report and rereading the project each make the shown report due; it is brought up to date once per cause.
    if (state.view === 'Report' && state.reportDue && !state.busy && !unreadable()) loadReport();
  }

  function scopeControls() {
    const container = element('form', { id: 'scope-form', class: 'scope-form' });
    const ref = element('input', { id: 'scope-ref', value: state.scope.ref || '', maxlength: 200, autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false' });
    const group = element('select', { id: 'scope-group' }, [element('option', { value: '', text: 'Whole project' }),
      ...items().filter(item => isGroup(item) && hasUniqueId(item.id)).map(item => element('option', { value: item.id, text: groupName(item.id) }))]);
    group.value = state.scope.groupId || '';
    const inspect = () => checkpoint(async () => {
      const previous = currentContext();
      const scope = { ...(ref.value.trim() ? { ref: ref.value.trim() } : {}), ...(group.value ? { groupId: group.value } : {}) };
      const fromPanel = state.panel;
      if (!await reread(scope)) return;
      if (state.contexts.length === CONTEXT_LIMIT) state.contexts.shift();
      state.contexts.push(previous); state.panel = false; state.entryPath = scope.groupId && groupInfo(scope.groupId) ? [scope.groupId] : [];
      state.concerns = null; state.selectedKey = null; render();
      // The panel closed behind the reader: they return to the control that opened it.
      if (fromPanel) document.querySelector('[data-opens="scope-group"]')?.focus();
    });
    // Inspecting is this form's submit action, so Enter in the ref field runs it.
    container.append(labelledField('Shared local Git ref (optional)', ref), labelledField('Delivery scope', group),
      actions(button('Inspect selected scope', undefined, { type: 'submit' }),
        button('Inspect current checkout', inspectCurrent, { class: 'quiet' })),
      paragraph('A selected Git ref is read-only and must already exist locally. This app does not fetch, commit or push.', 'note'));
    container.addEventListener('submit', event => { event.preventDefault(); inspect(); });
    return container;
  }
  // One block per eligible task. The counted statement stays authoritative: nothing is drawn unless the blocks agree with it.
  function deliveryBlocks(metrics) {
    if (metrics.total > BLOCK_LIMIT) return [];
    const byId = new Map(items().map(item => [item.id, item]));
    const eligible = metrics.eligibleIds.map(id => byId.get(id)).filter(Boolean);
    const groups = { verified: [], accepted: [], awaiting: [], open: [] };
    for (const item of eligible) {
      const proved = item.verification?.status === 'current';
      groups[item.acceptance?.accepted ? (proved ? 'verified' : 'accepted') : item.state === 'verifying' && proved ? 'awaiting' : 'open'].push(item);
    }
    if (eligible.length !== metrics.total || groups.verified.length !== metrics.currentlyVerified
      || groups.verified.length + groups.accepted.length !== metrics.accepted) return [];
    const names = { verified: 'accepted with current proof', accepted: 'accepted, proof not current', awaiting: 'proved, waiting for acceptance', open: 'not accepted yet' };
    const marks = { verified: 'check', accepted: 'clock', awaiting: 'seal' };
    const present = Object.keys(names).filter(name => groups[name].length);
    const labelled = metrics.total <= LABELLED_BLOCKS;
    const density = metrics.total > DENSE_BLOCKS ? ' blocks--dense' : metrics.total <= FEW_BLOCKS ? ' blocks--few' : '';
    return [element('div', { class: `blocks${density}`, role: 'img',
      'aria-label': `${metrics.total} tasks, one block each: ${present.map(name => `${groups[name].length} ${names[name]}`).join('; ')}` },
    present.flatMap(name => groups[name].map(item => element('span', { class: 'block-cell', title: `${item.id}: ${item.title}` }, [
      element('span', { class: `block block--${name}` }, marks[name] ? icon(marks[name]) : []), labelled ? element('span', { class: 'block-id', text: idTail(item.id) }) : null])))),
    element('ul', { class: 'legend' }, present.map(name => element('li', {}, [element('span', { class: `block block--${name}`, 'aria-hidden': 'true' }),
      element('span', {}, [element('strong', { text: groups[name].length }), ` ${names[name]}`])])))];
  }
  function deliveryCard(metrics) {
    const card = element('section', { class: 'sheet wide', 'aria-labelledby': 'delivery-heading' }, element('h3', { id: 'delivery-heading', class: 'eyebrow', text: 'Delivery' }));
    if (!metrics) {
      card.append(paragraph('Delivery unknown', 'hero-title'),
        paragraph('Progress is unavailable for this project profile. Inspect the reasons below; no empty-project conclusion can be drawn.', 'hero-copy'));
      return card;
    }
    const complete = metrics.coverage === 'complete' && state.snapshot.coverage === 'complete';
    const percentage = complete && Number.isFinite(metrics.percentage) ? `${metrics.percentage.toFixed(1)}%` : 'Unknown; no complete nonempty denominator';
    const ledger = `${metrics.total} eligible unique tasks; ${metrics.canceled} canceled and ${metrics.retired} retired excluded. ${metrics.accepted} historical scoped acceptance decisions; `
      + `${counted(metrics.currentlyVerified, 'accepted task', 'accepted tasks')} with proof that still applies; ${counted(metrics.remaining, 'eligible task', 'eligible tasks')} not accepted. Accepted percentage: ${percentage}.`;
    const tools = actions(button('Inspect all work', () => navigate('Work'), { class: 'quiet' }));
    let caption = `${ledger} List filters do not change this denominator.`;
    if (complete && metrics.total) {
      card.append(element('div', { class: 'hero' }, [
        element('p', { class: 'hero-count' }, [element('span', { class: 'hero-figure', text: metrics.accepted }), element('span', { class: 'hero-unit', text: `of ${counted(metrics.total, 'task', 'tasks')} accepted` })]),
        element('p', { class: 'hero-rate' }, [element('strong', { text: percentage }), element('span', { text: 'accepted in this exact scope' })])]), ...deliveryBlocks(metrics));
    } else if (complete) {
      card.append(element('div', { class: 'hero-lead' }, [paragraph('No delivery scope yet', 'hero-title'),
        paragraph('Delivery counts tasks, one block each. This scope has none, so there is no percentage to show. That is not the same as zero percent.', 'hero-copy')]),
      element('div', { class: 'blocks blocks--ghost', 'aria-hidden': 'true' }, Array.from({ length: GHOST_BLOCKS }, () => element('span', { class: 'block block--ghost' }))));
      const excluded = metrics.canceled || metrics.retired ? ` ${metrics.canceled} canceled and ${metrics.retired} retired tasks are excluded.` : '';
      caption = `Your first task becomes the first block. Initiatives, stories and subtasks are tracked too, but they sit outside this count.${excluded} Accepted percentage: ${percentage}.`;
    } else {
      card.append(element('div', { class: 'hero-lead' }, [paragraph('Delivery unknown', 'hero-title'),
        paragraph('Inspection is incomplete, so no delivery blocks are drawn. The counts below cover inspected work only.', 'hero-copy')]));
    }
    const canCapture = !writableReason() && state.snapshot.profile.capabilities?.includes('create');
    if (metrics.total || !complete) tools.append(button('Inspect remaining work', () => showWork({ remaining: true }), { class: 'primary', iconAfter: 'arrow' }));
    else if (canCapture) tools.append(button('Capture a task', () => beginForm('create', undefined, { kind: vocabulary().deliveryKind }), { class: 'primary', icon: 'plus' }));
    card.append(element('div', { class: 'sheet-foot' }, [paragraph(caption, 'caption'), tools]));
    return card;
  }
  function healthCard() {
    const health = state.snapshot.health;
    const owner = health?.itemId ? items().find(item => item.id === health.itemId && hasUniqueId(item.id)) : null;
    if (health?.status === 'attested') {
      const attest = owner ? offeredActions(owner).offered.find(action => action.operation === 'attest') : null;
      const name = health.displayName || health.ownerId;
      return element('section', { class: 'health health--attested side', 'aria-labelledby': 'health-heading' }, [
        element('h3', { id: 'health-heading', class: 'eyebrow', text: 'Project health, owner-attested' }),
        paragraph(health.assessment, 'health-headline'), paragraph(health.reason, 'health-reason'),
        element('div', { class: 'health-owner' }, [element('span', { class: 'avatar avatar--m avatar--plain', 'aria-hidden': 'true', text: initials(name) }),
          element('div', { class: 'health-who' }, [element('strong', { text: `${name} (${health.ownerId}), health owner` }), element('span', { text: `Observed ${instant(health.observedAt)} for ${health.itemId}` })])]),
        element('div', { class: 'health-foot' }, [paragraph('A dated assessment for this exact scope owner. Delivery progress and proof never set it.', 'note'),
          attest ? button('Attest again', () => beginForm('attest', owner)) : null])]);
    }
    return element('section', { class: 'health health--unknown side', 'aria-labelledby': 'health-heading' }, [
      element('h3', { id: 'health-heading', class: 'eyebrow', text: 'Project health' }), paragraph('Unknown', 'hero-title'),
      paragraph(`${health?.reason || 'No dated owner attestation supplied'}. Health is a dated assessment by one named owner, so activity and progress can never stand in for it.`, 'health-reason'),
      owner ? element('div', { class: 'health-hint health-foot' }, [paragraph(`The health owner is ${owner.id}. Record a dated assessment on that record.`, 'note'), button('Open health owner', () => openItem(owner))])
        : state.scope.groupId ? null : element('div', { class: 'health-hint' }, [paragraph('The project health owner is the record named by this project config key:', 'note'), element('span', { class: 'health-key', text: 'taskTracking.healthOwnerId' })])]);
  }
  function kindBreakdown(records) {
    const totals = new Map();
    for (const item of records) totals.set(item.kind, (totals.get(item.kind) || 0) + 1);
    return [...kinds().filter(kind => totals.has(kind)), ...[...totals.keys()].filter(kind => !kinds().includes(kind))]
      .map(kind => counted(totals.get(kind), ...kindWords(kind))).join(', ');
  }
  function lifecycleLine() {
    const open = items().filter(item => !item.retired);
    const inState = key => open.filter(item => item.state === key);
    const blocked = inState('blocked').length;
    const line = element('ol', { class: 'line' });
    for (const key of STATIONS) {
      const records = inState(key);
      const station = button('', () => showWork({ status: key }), { class: `station${records.length ? '' : ' station--none'}`, 'aria-label': `${labels()[key]}: ${records.length} records. Show them in Work.` });
      station.append(element('span', { class: 'count', text: records.length }), element('span', { class: 'dot-zone' }, dot(key)), element('span', { class: 'station-name', text: labels()[key] }));
      const cell = element('li', {}, [station, records.length ? element('span', { class: 'station-kinds', text: kindBreakdown(records) }) : null]);
      if (key === 'in_progress' && blocked) cell.append(element('span', { class: 'siding' }, [element('span', { class: 'siding-hook', 'aria-hidden': 'true' }),
        button(`${blocked} blocked`, () => showWork({ status: 'blocked' }))]));
      line.append(cell);
    }
    const off = [[inState('canceled').length, 'canceled'], [items().length - open.length, 'retired'], [open.filter(item => !labels()[item.state]).length, 'in another recorded state']]
      .filter(([total]) => total).map(([total, name]) => `${total} ${name}`);
    const section = sheet('line-heading', 'Where work stands', `${counted(open.filter(onLine).length, 'open record', 'open records')} by recorded state.${off.length ? ` Off the line: ${off.join(', ')}.` : ''}`);
    section.append(line);
    return section;
  }
  const openButton = item => button('Open', () => openItem(item), { 'aria-label': `Open ${item.id}: ${item.title}` });
  // A waiting row offers the one decision it is waiting for when this session may take it, and opens the record otherwise.
  const waitingDecisions = { accept: ['Decide', 'Decide on', 'primary'], assign: ['Assign', 'Assign'] };
  function waitingAction(item, operation) {
    const action = operation ? offeredActions(item).offered.find(candidate => candidate.operation === operation) : null;
    if (!action) return openButton(item);
    const [name, spoken, className] = waitingDecisions[operation];
    return button(name, () => beginForm(action.operation, item, action.extra), { class: className, 'aria-label': `${spoken} ${item.id}: ${item.title}` });
  }
  const responsible = id => [avatar(id), element('span', { class: 'visually-hidden', text: `Responsible: ${memberName(id)}` })];
  function waitingRecords() {
    const waiting = [];
    for (const item of items()) {
      if (item.retired || item.state === 'canceled') continue;
      const proved = item.verification?.status === 'current';
      if (item.state === 'verifying' && proved && !item.acceptance?.accepted) waiting.push([item, 'verifying', 'seal', 'Proved, not accepted', 'Every criterion has current passing proof. Acceptance is a separate decision.', 'accept']);
      else if (item.acceptance?.accepted && !proved) waiting.push([item, 'stale', 'clock', 'Accepted, proof not current', `${item.verification?.reason || 'Current proof is not established'}. The acceptance stands.`]);
      else if (item.state === 'blocked') waiting.push([item, 'blocked', 'alert', 'Blocked', `${item.blocker?.reason || 'No blocker reason is recorded'}.${item.blocker?.at ? ` Blocked since ${day(item.blocker.at)}.` : ''}`]);
      else if (item.state === 'ready' && !state.snapshot.ready?.includes(item.id)) waiting.push([item, 'plain', 'alert', 'Ready, cannot start', item.prerequisiteReasons?.[0] || 'Current prerequisites are unresolved.']);
      else if (item.state === 'ready' && !item.assigneeId) waiting.push([item, 'plain', 'person', 'Ready, unassigned', 'Nobody is responsible yet, so it cannot start.', 'assign']);
    }
    const section = sheet('waiting-heading', 'Waiting on a person', waiting.length ? `${counted(waiting.length, 'record', 'records')} the tool will not move by itself` : null, 'sheet wider');
    if (!waiting.length) { section.append(paragraph('Nothing in this scope is waiting on a decision, a blocker or an owner.', 'note')); return section; }
    section.append(element('ul', { class: 'queue' }, waiting.slice(0, QUEUE_LIMIT).map(([item, tone, mark, name, why, operation]) => element('li', {}, [
      element('span', { class: `tag${tone === 'plain' ? '' : ` tag--${tone}`}` }, [icon(mark), element('span', { text: name })]),
      element('span', { class: 'queue-text' }, [element('span', { class: 'queue-title', text: item.title }), element('span', { class: 'queue-why', text: why })]),
      ...responsible(item.assigneeId), waitingAction(item, operation)]))));
    if (waiting.length > QUEUE_LIMIT) section.append(paragraph(`${waiting.length - QUEUE_LIMIT} more records are waiting. Open Work to see them all.`, 'note'));
    return section;
  }
  function readyRecords() {
    const byId = new Map(items().map(item => [item.id, item]));
    const ready = (state.snapshot.ready || []).map(id => byId.get(id)).filter(Boolean);
    const section = sheet('ready-heading', 'Ready to start', `${counted(ready.length, 'record', 'records')} with every prerequisite met`, 'sheet narrow');
    const who = item => item.assigneeId ? `${memberName(item.assigneeId)} is responsible.` : 'Nobody is responsible yet.';
    if (ready.length) {
      const [next, ...rest] = ready.slice(0, QUEUE_LIMIT);
      section.append(element('div', { class: 'next-record' }, [
        element('div', { class: 'next-record-top' }, [element('span', {}, [element('span', { class: 'next-record-title', text: next.title }), element('span', { class: 'row-context' }, [kindMark(next), element('span', { class: 'id', text: next.id })])]), ...responsible(next.assigneeId)]),
        element('div', { class: 'next-record-foot' }, [element('span', { text: `Every prerequisite is met. ${who(next)}` }), openButton(next)])]));
      if (rest.length) section.append(element('ul', { class: 'queue queue--plain' }, rest.map(item => element('li', {}, [
        element('span', { class: 'queue-text' }, [element('span', { class: 'queue-title', text: item.title }), element('span', { class: 'row-context' }, [kindMark(item), element('span', { class: 'id', text: item.id })])]),
        ...responsible(item.assigneeId), openButton(item)]))));
    } else section.append(paragraph('No record is ready to start in this scope.', 'note'));
    // The snapshot lists every record that is not ready. Only work that has not started yet belongs under this question.
    const notStarted = ['ready', 'planned', 'draft'];
    const held = (state.snapshot.excluded || []).filter(entry => notStarted.includes(byId.get(entry.itemId)?.state) && !byId.get(entry.itemId).retired)
      .sort((a, b) => notStarted.indexOf(byId.get(a.itemId).state) - notStarted.indexOf(byId.get(b.itemId).state));
    if (held.length) {
      const row = entry => element('li', {}, [element('span', { text: byId.get(entry.itemId).title }), element('span', { text: (entry.reasons || []).join('; ') })]);
      const more = held.slice(REASONS_SHOWN, REASON_LIMIT);
      section.append(element('div', { class: 'block-list' }, [element('h4', { class: 'eyebrow', text: 'Why the rest cannot start' }), element('ul', { class: 'reasons' }, held.slice(0, REASONS_SHOWN).map(row)),
        more.length ? element('details', {}, [element('summary', { text: `Show ${counted(more.length, 'more reason', 'more reasons')}` }), element('ul', { class: 'reasons' }, more.map(row)),
          held.length > REASON_LIMIT ? paragraph(`${held.length - REASON_LIMIT} more reasons are listed in the offline report.`, 'note') : null]) : null]));
    }
    return section;
  }
  function recordFacts(item) {
    const history = item.history || [];
    const entered = [...history].reverse().find(entry => entry.afterState === item.state && entry.beforeState !== entry.afterState) || history.find(entry => entry.operation === 'create');
    const accepted = !!item.acceptance?.accepted;
    const decision = accepted ? (item.acceptanceHistory || []).at(-1) : null;
    const attested = item.health?.status === 'attested';
    return [
      ['Recorded state', [dot(stateName(item), 's'), labels()[item.state] || item.state], entered?.at ? `Since ${day(entered.at)}` : null,
        item.state === 'blocked' && item.blocker ? `Resumes to ${labels()[item.blocker.resumeState] || item.blocker.resumeState}` : null],
      ['Responsible', [avatar(item.assigneeId, 's'), `${memberName(item.assigneeId)}${item.assigneeId ? ` (${item.assigneeId})` : ''}`],
        item.collaboratorIds?.length ? `Collaborating: ${item.collaboratorIds.map(memberName).join(', ')}` : null],
      ['Current proof', [element('span', { class: `mark proof proof--${proofStatus(item)}` }, pips(item)), proofWord(item)], `${item.verification?.status || 'unknown'}: ${item.verification?.reason || 'Not established'}`],
      ['Acceptance', [acceptDot(accepted), accepted ? 'Accepted' : 'Not accepted'], accepted ? 'Accepted at a recorded decision' : 'No applicable acceptance recorded',
        decision?.acceptedAt ? `${decision.actor ? memberName(decision.actor) : 'An unrecorded actor'}, ${instant(decision.acceptedAt)}` : null],
      ['Record health', attested ? item.health.assessment : 'Not attested', attested ? `Observed ${instant(item.health.observedAt)}` : item.health?.reason || 'No dated owner attestation supplied']
    ];
  }
  function criteriaList(item) {
    return item.criteria?.length ? element('ul', { class: 'criteria' }, item.criteria.map(criterion => element('li', {}, [element('span', { class: 'id', text: criterion.id }), element('span', { text: criterion.text })])))
      : paragraph('No acceptance criteria are recorded.', 'note');
  }
  // With a single record there is no queue to triage, so Overview shows that record and the facts still missing around it.
  function onlyRecord(item) {
    const created = (item.history || []).find(entry => entry.operation === 'create');
    const section = sheet('record-heading', 'Your one record', created ? `Captured by ${created.actor ? memberName(created.actor) : 'an unrecorded actor'} at ${instant(created.at)}` : null, 'sheet wider');
    const { offered, lead } = offeredActions(item);
    section.append(element('div', { class: 'record-head' }, [kindMark(item), element('span', { class: 'id', text: item.id }), element('span', { class: 'rev', text: `rev ${item.revision}` }), item.retired ? flag('Retired') : null]),
      paragraph(item.title, 'record-title'), paragraph(item.intent || 'Intent not recorded.', 'intent'), factCells(recordFacts(item).slice(0, 4).map(cell => cell.slice(0, 2)), 'fact-tiles'), criteriaList(item),
      actions(...offered.slice(0, 3).map(action => actionButton(action, item, lead)), openButton(item)));
    return section;
  }
  function nextStopsCard(item) {
    const total = state.snapshot.metrics?.total || 0;
    const criteria = item.criteria?.length || 0;
    const scope = [!!total, 'Capture a task', total ? `${counted(total, 'task is', 'tasks are')} in this delivery scope.` : 'Delivery counts tasks, and this scope has none yet.'];
    // Criteria and responsibility are next stops for open work only; a retired or canceled record has none.
    const steps = item.retired || item.state === 'canceled' ? [
      [false, 'Capture new work', `${item.id} is ${item.retired ? 'retired' : 'canceled'}, so no record is open.`], scope
    ] : [
      [true, 'Capture something', `${item.id} is recorded.`],
      [!!criteria, 'Record acceptance criteria', criteria ? `${counted(criteria, 'criterion is', 'criteria are')} recorded. Proof is recorded against them.` : 'None are recorded yet. Proof is recorded against criteria.'],
      scope,
      [!!item.assigneeId, 'Make someone responsible', item.assigneeId ? `${memberName(item.assigneeId)} is responsible for this record.` : 'Nobody is responsible for this record yet. Assigning never starts work.']
    ];
    const current = steps.findIndex(([done]) => !done);
    const section = sheet('stops-heading', 'Next stops for this checkout', null, 'sheet narrow');
    section.append(element('ul', { class: 'stops' }, steps.map(([done, name, fact], index) => element('li', { class: done ? 'done' : index === current ? 'now' : undefined }, [
      element('span', { class: 'stop-mark', 'aria-hidden': 'true' }, done ? icon('check') : []),
      element('span', { class: 'stop-text' }, [element('strong', {}, [element('span', { class: 'visually-hidden', text: done ? 'Done: ' : 'Not yet: ' }), name]), element('span', { text: fact })])]))));
    return section;
  }
  function inspectionStrip() {
    const snapshot = state.snapshot;
    const profile = snapshot.profile || {};
    const reported = snapshot.diagnostics?.length || 0;
    return element('div', { class: 'strip' }, [element('span', { class: 'strip-title', text: 'Inspection' }),
      element('span', { text: snapshot.coverage === 'complete' ? 'Complete, with no inspection limits' : `${snapshot.coverage === 'partial' ? 'Partial' : 'Unavailable'}, ${counted(reported, 'reason', 'reasons')} reported` }),
      element('span', {}, ['Profile ', mono(profile.kind ? `${profile.kind} v${profile.version}` : 'unavailable')]),
      snapshot.mode ? element('span', {}, ['Tracking mode ', mono(snapshot.mode)]) : null,
      snapshot.fingerprint ? element('span', {}, ['Fingerprint ', mono(String(snapshot.fingerprint).slice(0, 8))]) : null,
      details('Inspection reasons and limitations', snapshot.diagnostics, 'inspection-reasons'),
      details('Scope and source identities', { source: snapshot.source, fingerprint: snapshot.fingerprint, scopeRevision: snapshot.metrics?.scopeRevision, profile: snapshot.profile })]);
  }
  // Every view of a source that cannot be read: its own title, so the tabs still say where the reader is, and no work,
  // count or earlier report. The reasons stay open to inspection.
  const VIEW_TITLES = { Overview: 'Project progress', People: 'People', Changes: 'Changes and sharing', Report: 'Status report' };
  function renderUnreadable() {
    main.append(pageLead(heading(VIEW_TITLES[state.view] || state.view), paragraph('No work, count or report is shown while this source cannot be read. Resolve the condition named for it, then reread the project.', 'page-intro')),
      inspectionStrip());
  }
  function renderOverview() {
    const snapshot = state.snapshot;
    main.append(pageHead('Project progress', `${scopeLabel()}, read from ${sourcePhrase()} at ${snapshot.asOf ? instant(snapshot.asOf) : 'an unknown time'}`,
      button('Refresh offline report', refreshReport, { icon: 'file' })));
    main.append(element('div', { class: 'split' }, [deliveryCard(snapshot.metrics), healthCard()]));
    if (snapshot.profile?.available) {
      main.append(lifecycleLine());
      if (items().length === 1) main.append(element('div', { class: 'split split--start' }, [onlyRecord(items()[0]), nextStopsCard(items()[0])]));
      else if (items().length) main.append(element('div', { class: 'split split--start' }, [waitingRecords(), readyRecords()]));
    }
    main.append(inspectionStrip());
  }

  function renderPeople() {
    main.append(pageLead(heading('People'), paragraph('Who is responsible for what in the selected source. One block is one record. These are not performance scores.', 'page-intro')));
    if (!members().length) main.append(paragraph('No members are configured in this selected project. Configure stable member identities before assigning work.', 'notice'));
    const active = items().filter(item => !item.retired && item.state !== 'canceled');
    const byLifecycle = records => [...records].sort((a, b) => LIST_ORDER.indexOf(a.state === 'blocked' ? 'in_progress' : a.state) - LIST_ORDER.indexOf(b.state === 'blocked' ? 'in_progress' : b.state));
    const load = (owned, summary) => {
      const rows = byLifecycle(owned);
      return [element('div', { class: 'person-load' }, [paragraph(summary), element('div', { class: 'person-bar', 'aria-hidden': 'true' }, rows.slice(0, DENSE_BLOCKS).map(item => element('span', { class: `is-${stateName(item)}` })))]),
        element('ul', { class: 'person-rows' }, [...rows.slice(0, PERSON_ROWS).map(item => element('li', {}, [element('span', { class: `state-word is-${stateName(item)}`, text: labels()[item.state] || item.state }), element('span', { text: item.title })])),
          rows.length > PERSON_ROWS ? element('li', { class: 'note', text: `and ${rows.length - PERSON_ROWS} more` }) : null])];
    };
    const seeWork = (name, filters) => button('See this work', () => showWork(filters), { iconAfter: 'arrow', 'aria-label': `See this work: ${name}` });
    const list = element('ul', { class: 'people-grid' });
    for (const member of members()) {
      const owned = active.filter(item => item.assigneeId === member.id);
      list.append(element('li', {}, element('section', { class: `person${member.active ? '' : ' person--off'}` }, [
        element('div', { class: 'person-head' }, [avatar(member.id, 'l'),
          element('div', { class: 'person-name' }, [element('h3', {}, [member.displayName, member.id === state.session.actor ? element('span', { class: 'badge', text: 'You' }) : null]), element('span', { class: 'id', text: member.id })]),
          element('span', { class: `person-status${member.active ? '' : ' person-status--off'}`, text: member.active ? 'Active' : 'Inactive' })]),
        ...(owned.length ? load(owned, `Responsible for ${counted(owned.length, 'record', 'records')}`) : [element('div', { class: 'person-load' }, [paragraph('No open records'),
          member.active ? null : paragraph('Earlier work keeps this name in its history. An inactive member cannot be given new work, and nobody else is substituted.', 'note')])]),
        owned.length ? seeWork(`${member.displayName} (${member.id}) — ${member.active ? 'Active' : 'Inactive'}; ${owned.length} owned records`, { owner: member.id }) : null])));
    }
    const unassigned = active.filter(item => !item.assigneeId);
    if (unassigned.length) {
      list.append(element('li', {}, element('section', { class: 'person person--none' }, [
        element('div', { class: 'person-head' }, [avatar(null, 'l'), element('div', { class: 'person-name' }, [element('h3', { text: 'Unassigned' }), element('span', { class: 'note', text: 'Nobody is responsible yet' })])]),
        ...load(unassigned, counted(unassigned.length, 'record', 'records')),
        seeWork(`Unassigned — ${unassigned.length} records with nobody responsible`, { owner: '__unassigned' })])));
    }
    main.append(list);
    const unknown = [...new Set(items().map(item => item.assigneeId).filter(id => id && !members().some(member => member.id === id)))];
    main.append(element('div', { class: 'strip' }, [element('span', { class: 'strip-title', text: 'Who can take work' }),
      element('span', { text: 'Active configured members, plus the validated local Git author of a writable checkout.' }),
      element('span', { text: 'Canceled and retired records are left out of these counts.' }),
      unknown.length ? details('Unknown recorded owners', unknown) : null]));
  }

  function filteredItems() {
    const f = state.filters;
    const eligible = state.snapshot.scope?.eligibleTaskIds || state.snapshot.metrics?.eligibleIds || [];
    return items().filter(item => {
      if (state.scope.groupId && !eligible.includes(item.id)) return false;
      if (state.view === 'My work' && item.assigneeId !== state.session.actor) return false;
      if (f.owner === '__unassigned' ? item.assigneeId !== null : f.owner && item.assigneeId !== f.owner) return false;
      if (f.status && item.state !== f.status || f.kind && item.kind !== f.kind) return false;
      if (f.remaining && (!eligible.includes(item.id) || item.acceptance?.accepted)) return false;
      return `${item.id} ${item.title} ${item.intent} ${item.ownerPath}`.toLocaleLowerCase().includes(f.search.toLocaleLowerCase());
    }).sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id) || a.ownerPath.localeCompare(b.ownerPath));
  }
  function workEntry(item, variant, select) {
    const ambiguous = hasUniqueId(item.id) ? '' : `Ambiguous identity; owner: ${item.ownerPath}`;
    const entry = button('', select, { class: variant, 'aria-pressed': String(itemKey(item) === state.selectedKey),
      'aria-label': `${item.id}: ${item.title}. ${labels()[item.state] || item.state}; ${memberName(item.assigneeId)}; ${acceptanceWord(item)}; Proof: ${item.verification?.status || 'unknown'}${ambiguous ? `; ${ambiguous}` : ''}` });
    const identity = element('span', { class: 'row-context' }, [kindMark(item), element('span', { class: 'id', text: item.id }),
      variant === 'work-row' && item.state === 'blocked' ? flag('Blocked', 'blocked') : null, onLine(item) ? null : flag(labels()[item.state] || item.state), item.retired ? flag('Retired') : null]);
    const note = ambiguous ? element('span', { class: 'row-note', text: ambiguous }) : null;
    if (variant === 'card') {
      entry.append(item.state === 'blocked' ? element('span', { class: 'card-block' }, [icon('alert'), element('span', { text: `Blocked: ${item.blocker?.reason || 'no reason is recorded'}` })]) : '',
        element('span', { class: 'card-top' }, [identity, avatar(item.assigneeId)]), element('span', { class: 'row-title', text: item.title }),
        element('span', { class: 'card-foot' }, [proofMark(item), item.retired ? null : sealMark(item)]), note || '');
    } else {
      entry.append(element('span', { class: 'row-main' }, [element('span', { class: 'row-title', text: item.title }), identity, note]),
        element('span', { class: `mark proof proof--${proofStatus(item)}`, title: proofWord(item) }, pips(item, ROW_PIP_LIMIT)), item.retired ? '' : acceptDot(!!item.acceptance?.accepted), avatar(item.assigneeId));
    }
    return entry;
  }
  const legendMarks = () => [[element('span', { class: 'mark proof proof--current' }, element('span', { class: 'pip' })), 'Proved'], [element('span', { class: 'mark proof proof--stale' }, element('span', { class: 'pip' })), 'Proof stale'],
    [element('span', { class: 'pip' }), 'Not proved'], [acceptDot(true, true), 'Accepted is a separate decision']];
  const legend = (className, lead) => element('ul', { class: className, 'aria-label': 'How to read the marks' }, [lead ? element('li', { text: lead }) : null,
    ...legendMarks().map(([mark, name]) => element('li', {}, [mark, name]))]);
  // The same filtered records under a heading per recorded state. Blocked work stays with In progress; anything else sits off the line.
  function workList(shown, select) {
    const groups = LIST_ORDER.map(key => ({ key, name: labels()[key], records: shown.filter(item => item.state === key || key === 'in_progress' && item.state === 'blocked') }));
    groups.push({ key: 'off', name: 'Off the line', records: shown.filter(item => !onLine(item)) });
    return element('div', { class: 'rows' }, [...groups.filter(group => group.records.length).flatMap(group => [
      element('h3', { class: 'group-head' }, [group.key === 'off' ? null : dot(group.key, 's'), element('span', { text: group.name }), ' ', element('span', { class: 'group-count', text: group.records.length })]),
      element('ul', {}, group.records.map(item => element('li', {}, workEntry(item, 'work-row', () => select(item)))))]), legend('list-legend')]);
  }
  // The board groups the same filtered records by recorded state. It is read-only: no drag, no saved order.
  function board(shown, select, canCapture) {
    const lanes = STATIONS.map(key => ({ key, name: labels()[key], records: shown.filter(item => item.state === key || key === 'in_progress' && item.state === 'blocked') }));
    const off = shown.filter(item => !onLine(item));
    if (off.length) lanes.push({ key: 'off', name: 'Off the line', records: off });
    const blockedIn = lane => lane.records.filter(item => item.state === 'blocked').length;
    return element('div', { class: 'board-scroll' }, element('div', { class: `board${off.length ? ' board--7' : ''}` }, [
      element('div', { class: 'route', 'aria-hidden': 'true' }, lanes.map(lane => element('div', { class: `route-stop${lane.key === 'off' ? ' route-stop--off' : ''}` }, [
        lane.key === 'off' ? null : dot(lane.key), element('span', { class: 'route-name' }, [element('strong', { text: lane.name }), element('span', { class: 'id', text: lane.records.length }),
          blockedIn(lane) ? element('span', { class: 'route-note', text: `${blockedIn(lane)} blocked` }) : null])]))),
      element('div', { class: 'lanes' }, lanes.map(lane => element('div', { class: 'lane' }, [element('ul', { 'aria-label': `${lane.name}: ${lane.records.length} records` },
        lane.records.length ? lane.records.map(item => element('li', {}, workEntry(item, 'card', () => select(item)))) : element('li', { class: 'lane-empty', text: filtersActive() ? 'Nothing here with these filters' : 'No records' })),
      lane.key === 'draft' && canCapture ? button('Capture a draft', () => beginForm('create'), { class: 'lane-add', icon: 'plus' }) : null])))]));
  }
  function renderWork() {
    const reason = writableReason();
    const canCapture = !reason && state.snapshot.profile.capabilities?.includes('create');
    const hasActor = state.view !== 'My work' || state.session.actor;
    const layout = (name, glyph) => button(name, () => { state.layout = name.toLowerCase(); render(); main.querySelector('.segmented [aria-pressed="true"]')?.focus(); }, { icon: glyph, 'aria-pressed': String(state.layout === name.toLowerCase()) });
    // The count changes as filters change while the reader is in a filter control, so it is a status of its own.
    const summary = element('p', { class: 'page-context', role: 'status' });
    main.append(pageHead(state.view === 'My work' ? 'My work' : 'Work', hasActor ? summary : null,
      hasActor ? element('div', { class: 'segmented', role: 'group', 'aria-label': 'Work layout' }, [layout('Board', 'board'), layout('List', 'list')]) : null));
    if (!hasActor) {
      main.append(paragraph('This read-only session has no member identity. Choose a person in People, or launch a workspace with your stable member identity.', 'notice')); return;
    }
    main.append(paragraph(reason || (!canCapture
      ? 'Capture is unavailable in the selected project profile. Original records remain owned by that profile.' : 'New work starts as a draft. Assignment does not start it.'), 'note'));
    const workbench = element('div', { class: `workbench workbench--${state.layout}` });
    const listPane = element('section', { class: 'work-list', 'aria-label': state.scope.groupId ? 'Eligible delivery tasks' : 'Work list' });
    const detailPane = element('section', { class: 'record-sheet', 'aria-label': 'Selected work' });
    const filters = element('div', { class: 'filters' });
    const repaint = () => {
      listPane.replaceChildren();
      const matching = filteredItems();
      const count = `${matching.length} matching records; progress scope remains ${state.snapshot.metrics?.scope?.itemId || 'the project'}.`;
      if (summary.textContent !== count) summary.textContent = count;
      if (!matching.length) listPane.append(paragraph(state.snapshot.coverage !== 'complete' ? 'No inspected records match. Inspection is incomplete, so some work may be unavailable.' : items().length ? 'No work matches these filters. Clear filters to return to the list.' : 'No work records were found in this complete inspection. Capture an initiative or task to begin.', 'empty'));
      const select = item => checkpoint(() => {
        selectWork(item); render(); main.querySelector('.record-sheet h3')?.focus();
      });
      const shown = matching.slice(0, state.limit);
      if (state.layout === 'board' && matching.length) listPane.append(board(shown, select, canCapture), legend('board-legend', 'Reading a card'));
      else if (matching.length) listPane.append(workList(shown, select));
      if (matching.length > state.limit) listPane.append(button('Show 100 more records', () => {
        // The button is replaced with the records it asked for: the reader continues at the first of them.
        const entries = () => [...listPane.querySelectorAll('[aria-pressed]')];
        const seen = new Set(entries().map(entry => entry.getAttribute('aria-label')));
        state.limit += 100; repaint();
        entries().find(entry => !seen.has(entry.getAttribute('aria-label')))?.focus();
      }));
      // With nothing selected there is a sheet to fill only while the list beside it has records to choose from.
      detailPane.hidden = !selected() && (!matching.length || state.layout === 'board');
      workbench.classList.toggle('workbench--solo', detailPane.hidden);
    };
    const filterField = (name, title, choices) => {
      const id = `filter-${name}`;
      const control = choices ? element('select', { id }, choices.map(([value, label]) => element('option', { value, text: label }))) : element('input', { id, type: 'search', maxlength: 500 });
      control.value = state.filters[name];
      control.addEventListener(choices ? 'change' : 'input', () => { state.filters[name] = control.value; state.limit = 100; repaint(); });
      filters.append(element('label', { class: `pick${choices ? '' : ' pick--search'}`, for: id }, [choices ? null : icon('search'), element('span', { class: 'pick-label', text: title }), control]));
    };
    filterField('search', 'Find work');
    filterField('owner', 'Owner', [['', 'Anyone'], ['__unassigned', 'Unassigned'], ...members().map(member => [member.id, `${member.displayName} (${member.id})`])]);
    filterField('status', 'Recorded state', [['', 'Any state'], ...Object.entries(labels())]);
    filterField('kind', 'Work kind', [['', 'Any kind'], ...kinds().map(kind => [kind, kindName(kind)])]);
    const remaining = element('input', { type: 'checkbox', checked: state.filters.remaining, onChange: event => { state.filters.remaining = event.target.checked; repaint(); } });
    filters.append(element('label', { class: 'check' }, [remaining, 'Remaining eligible tasks only']),
      button('Clear filters', () => { state.filters = noFilters(); state.limit = 100; render(); }, { class: 'quiet' }));
    workbench.append(listPane, detailPane); main.append(...[contextNavigation(), filters, workbench, concernView(), hierarchyLists()].filter(Boolean));
    renderDetail(detailPane, selected()); repaint();
  }

  function positionLine(item) {
    const at = STATIONS.indexOf(item.state === 'blocked' ? 'in_progress' : item.state);
    if (at < 0) return paragraph(item.state === 'canceled' ? 'Canceled. This record is off the lifecycle line; its identity and history are kept.' : `Recorded state: ${labels()[item.state] || item.state}.`, 'notice');
    return element('ol', { class: `position position--at-${at}`, 'aria-label': `Lifecycle position: ${labels()[item.state]}` }, STATIONS.map((key, index) => {
      const here = index === at;
      return element('li', { class: `stop${here ? ` is-${item.state}` : ''}`, 'aria-current': here ? 'step' : undefined }, [
        element('span', { class: 'dot-zone' }, here ? dot(item.state, 'here') : dot(index < at ? 'passed' : 'ahead')),
        element('span', { text: here ? labels()[item.state] : labels()[key] })]);
    }));
  }
  function historyLine(entry) {
    const moved = entry.beforeState !== entry.afterState ? `moved it from ${labels()[entry.beforeState] || entry.beforeState} to ${labels()[entry.afterState] || entry.afterState}` : '';
    const filled = ['planned', 'in_progress', 'verifying', 'done', 'blocked'].includes(entry.afterState);
    const mark = entry.operation === 'proof' ? ' event-mark--proof' : entry.operation === 'accept' ? ' event-mark--accept' : filled ? ' event-mark--filled' : '';
    return element('li', { class: `is-${labels()[entry.afterState] ? entry.afterState : 'other'}` }, [element('span', { class: `event-mark${mark}`, 'aria-hidden': 'true' }),
      element('div', { class: 'event-text' }, [element('span', {}, [element('strong', { text: entry.actor ? memberName(entry.actor) : 'An unrecorded actor' }),
        ` ${entry.operation === 'transition' && moved ? moved : historyPhrases[entry.operation] || entry.operation}${entry.operation !== 'transition' && moved ? `, and ${moved}` : ''}`]),
      element('span', { class: 'id', text: instant(entry.at) }), entry.reason ? element('span', { class: 'note', text: entry.reason }) : null])]);
  }
  const titled = (name, aside, ...children) => element('div', { class: 'block-list' }, [element('div', { class: 'block-head' }, [element('h4', { class: 'eyebrow', text: name }), aside ? element('span', { class: 'note', text: aside }) : null]), ...children]);
  function recordChoices(name, records, action = openItem) {
    return element('details', {}, [element('summary', { text: `${name} (${records.length})` }),
      element('ul', { class: 'link-list', 'aria-label': name }, records.map(item => element('li', {},
        button(`${item.id}: ${item.title}`, () => action(item), { class: 'quiet' }))))]);
  }
  function hierarchyLists() {
    const scope = state.snapshot.scope || {};
    const unique = id => items().find(item => item.id === id && hasUniqueId(id));
    const pick = ids => (ids || []).map(unique).filter(Boolean);
    const children = pick(scope.directGroupIds);
    const group = state.scope.groupId;
    const container = element('div', { class: 'strip strip--plain' });
    container.append(element('details', {}, [element('summary', { text: `Direct child groups (${children.length})` }),
      element('ul', { class: 'link-list', 'aria-label': 'Direct child groups' }, children.map(item => element('li', {},
        button(`Inspect group ${item.id}: ${item.title}`, () => enterGroup(item.id, [...state.entryPath, item.id]), { class: 'quiet' }))))]));
    if (group) {
      container.append(recordChoices('Excluded tasks', pick(scope.excludedTaskIds)),
        recordChoices('Supporting work', pick(scope.memberIds).filter(item => !isDelivery(item) && !isGroup(item))),
        recordChoices('Outside delivery scope', items().filter(item => item.id !== group && !scope.memberIds?.includes(item.id))));
      container.append(paragraph('Outside records can be inspected and managed here. That does not add them to this delivery scope.', 'note'));
    } else container.append(recordChoices('Ungrouped tasks', pick(state.snapshot.hierarchy?.ungroupedTaskIds)));
    return container;
  }
  async function inspectConcerns(query) {
    checkpoint(async () => {
      const previous = currentContext();
      begin();
      try {
        const result = await api('/api/concerns', { query: { schemaVersion: 1, ...query }, ...(state.scope.ref !== undefined ? { ref: state.scope.ref } : {}) });
        if (state.contexts.length === CONTEXT_LIMIT) state.contexts.shift();
        state.contexts.push(previous); state.concerns = result; state.view = 'Work';
      } catch (error) { state.message = `Linked concerns unavailable: ${error.message}. The selected source and draft remain displayed.`; }
      finally { state.busy = false; render(); main.querySelector('[aria-label="Exact linked concerns"]')?.focus(); }
    });
  }
  function concernView() {
    const result = state.concerns;
    if (!result) return null;
    const panel = element('section', { class: 'sheet', 'aria-label': 'Exact linked concerns', tabindex: '-1' }, [
      element('h3', { text: 'Linked concerns' }), paragraph(`Exact selection: ${(result.scope?.itemIds || []).concat(result.scope?.paths || []).join(', ')}. Coverage: ${result.coverage}. As of ${instant(result.asOf)}.`, 'note'),
      paragraph('Only declarations for this exact selection are shown. Selecting a shared path is a separate action; inspecting related work does not change delivery membership.', 'note')]);
    panel.append(element('ul', { class: 'link-list' }, (result.relationships || []).map(link => element('li', {}, [
      element('span', { text: `${link.direction}: ${link.owner.itemId} (${link.owner.ownerPath}) declares ${link.relation}; ${link.resolution}. ${link.rationale}` }),
      link.target.path ? button(`Inspect path ${link.target.path}`, () => inspectConcerns({ paths: [link.target.path] }), { class: 'quiet' }) : mono(link.target.itemId),
      ...[link.owner.itemId, link.target.itemId].filter((id, index, ids) => id && ids.indexOf(id) === index).map(id => {
        const record = items().find(item => item.id === id && hasUniqueId(id));
        return record ? button(`Inspect item ${id}`, () => openItem(record), { class: 'quiet' }) : paragraph(`Item ${id} unavailable or ambiguous`, 'note');
      })]))));
    if (result.diagnostics?.length) panel.append(details('Concern inspection limits', result.diagnostics));
    panel.append(paragraph(result.inspection?.pathAvailability || 'Path availability is not certified.', 'note'));
    return panel;
  }
  function renderDetail(pane, item) {
    pane.replaceChildren();
    pane.classList.toggle('record-sheet--empty', !item);
    if (!item) { pane.append(element('h3', { text: 'Choose work to inspect', tabindex: '-1' }), paragraph('Select a record to see its outcome, responsibility, proof and available actions.')); return; }
    const { reason, offered, lead } = offeredActions(item);
    pane.append(element('div', { class: 'record-head' }, [kindMark(item), element('span', { class: 'id', text: item.id }), element('span', { class: 'rev', text: `rev ${item.revision}` }), item.retired ? flag('Retired') : null]),
      element('h3', { text: item.title, tabindex: '-1', 'aria-label': `${item.id}: ${item.title}` }), paragraph(item.intent || 'Intent not recorded.', 'intent'));
    if (isGroup(item)) pane.append(paragraph(`Group purpose: ${groupLabel(item)}${item.groupRole ? ` (${item.groupRole})` : ''}`, 'note'),
      actions(button(`Inspect group ${item.id}: ${item.title}`, () => enterGroup(item.id), { class: 'quiet' })));
    const affiliations = (state.snapshot.scope?.affiliations || []).find(entry => entry.itemId === item.id)?.groupIds || [];
    if (affiliations.length) pane.append(element('details', {}, [element('summary', { text: 'Other direct affiliations' }),
      ...affiliations.map(id => button(`Enter through ${id}`, () => enterGroup(isGroup(item) ? item.id : id,
        isGroup(item) ? [id, item.id] : [id]), { class: 'quiet' }))]));
    const lane = element('div', { class: 'sheet-main' }, positionLine(item));
    if (hasRedaction(item)) lane.append(paragraph('Some displayed content is redacted. Redacted source fields cannot be edited here; inspect their canonical owner through your project’s tools.', 'notice'));
    if (item.blocker) lane.append(paragraph(`Blocked: ${item.blocker.reason}; resume state: ${labels()[item.blocker.resumeState] || item.blocker.resumeState}`, 'notice notice--stop'));
    if (item.retired) lane.append(paragraph(`Retired: ${item.retired.reason}. History and references are retained.`, 'notice'));
    if (item.prerequisiteReasons?.length) lane.append(element('div', { class: 'notice' }, [element('strong', { text: 'Current prerequisite reasons' }), element('ul', {}, item.prerequisiteReasons.map(line => element('li', { text: line })))]));
    if (item.legacy) lane.append(paragraph('This is a legacy record. Review adoption before managing its tracking metadata. Existing content remains owned by this record.', 'notice'));
    if (reason) lane.append(paragraph(reason, 'notice'));
    if (offered.length) {
      const leading = offered.filter(action => action.name === lead || lead === 'Accept work' && action.name === 'Record observed proof');
      if (leading.length) lane.append(element('div', { class: 'next-stop' }, [element('div', { class: 'next-stop-text' }, [element('h4', { text: nextStops[lead][0] }), paragraph(nextStops[lead][1])]),
        actions(...leading.map(action => actionButton(action, item, lead)))]));
      const others = offered.filter(action => !leading.includes(action));
      if (others.length) lane.append(element('div', { class: 'actions actions--record' }, others.map(action => actionButton(action, item, lead))));
      lane.append(paragraph('Cancel or retire work to preserve identity, incoming references and history. Deletion is restricted to an unreferenced, unassigned draft with no work activity, proof, acceptance, health or lifecycle history. Its preview refuses established work and never cascades.', 'note'));
    }
    lane.append(titled('Acceptance criteria', item.criteria?.length ? 'Proof is recorded against these exact criteria' : null, criteriaList(item)));
    if (item.history?.length) lane.append(titled('Record history', null, element('ol', { class: 'timeline' }, [...item.history].reverse().slice(0, HISTORY_LIMIT).map(historyLine)),
      item.history.length > HISTORY_LIMIT ? paragraph(`${item.history.length - HISTORY_LIMIT} earlier changes are in the full history below.`, 'note') : null));
    const byId = id => items().find(other => other.id === id);
    const incoming = items().filter(other => other.id !== item.id && (other.links?.some(link => link.itemId === item.id) || other.memberItemIds?.includes(item.id))).map(other => ({ id: other.id, owner: other.ownerPath }));
    const linked = [...(item.links || []).map(link => [named('linkRoles', link.relation), link.itemId ?? null, link.path ?? null]),
      ...(item.memberItemIds || []).map(id => ['Group member', id, null]), ...incoming.map(other => ['Referenced by', other.id, null])];
    const rail = element('div', { class: 'rail' }, factCells(recordFacts(item), 'fact-list'));
    if (linked.length) rail.append(titled('Links', null, element('ul', { class: 'link-list' }, linked.map(([relation, id, path]) => element('li', {}, [element('span', { class: 'link-relation', text: relation }),
      id === null ? button(`Inspect path ${path}`, () => inspectConcerns({ paths: [path] }), { class: 'quiet' })
        : hasUniqueId(id) && byId(id) ? button(`Inspect item ${id}`, () => openItem(byId(id)), { class: 'quiet', title: byId(id).title })
        : element('span', { class: 'link-title', text: 'Not uniquely available in the selected source' }), id === null ? null : element('span', { class: 'id', text: id })])))));
    rail.append(element('div', { class: 'source-owner' }, [element('h4', { class: 'eyebrow', text: 'Source owner' }), element('span', { class: 'path', text: item.ownerPath }),
      element('span', { class: 'id', text: `content ${String(item.contentHash).slice(0, 8)}, priority ${item.priority} (lower comes first)` })]));
    // Concerns are read by identity, and an identity that two owners share selects nothing.
    if (hasUniqueId(item.id)) rail.append(actions(button(`Inspect concerns for ${item.id}`, () => inspectConcerns({ itemIds: [item.id] }), { class: 'quiet' })));
    pane.append(element('div', { class: 'sheet-body' }, [lane, rail]), element('div', { class: 'strip strip--plain' }, [
      details('Links and group membership', { links: item.links, members: item.memberItemIds }), details('Incoming references', incoming),
      details('Proof and acceptance history', { proof: item.proofs, acceptance: item.acceptanceHistory, applicability: item.verification }),
      details('Activity and change history', { activity: item.activity, history: item.history }),
      details('This record’s dated owner health', item.health)]));
  }

  // Display projections shared by the change preview and the source comparison. They format facts; they decide nothing.
  const projections = [
    ['Work', record => `${record.id}: ${record.title}`], ['Outcome', record => record.intent],
    ['Owner', record => `${memberName(record.assigneeId)}${record.assigneeId ? ` (${record.assigneeId})` : ''}`],
    ['State', record => labels()[record.state] || record.state], ['Priority', record => record.priority],
    ['Acceptance', record => record.acceptance?.accepted ? 'Accepted' : 'Not accepted'],
    ['Verification', record => `${record.verification?.status || 'unknown'}: ${record.verification?.reason || 'Not established'}`],
    ['Retired', record => record.retired ? record.retired.reason : 'No'],
    ['Criteria', record => (record.criteria || []).map(criterion => `${criterion.id}: ${criterion.text}`).join('\n') || 'None'],
    ['Links', record => (record.links || []).map(link => `${link.relation}: ${link.itemId ?? link.path}`).join('\n') || 'None'],
    ['Group purpose', record => record.groupRole ? `${groupLabel(record)} (${record.groupRole})` : 'Generic group'],
    ['Group members', record => (record.memberItemIds || []).join(', ') || 'None'],
    ['Collaborators', record => (record.collaboratorIds || []).map(memberName).join(', ') || 'None'],
    ['Record health', record => record.health?.status === 'attested' ? `${record.health.assessment} (${record.health.observedAt})` : 'Not attested']
  ];
  const projected = record => projections.map(([name, read]) => [name, text(read(record))]);
  const differingFields = (before, after) => projected(before).filter(([, value], index) => value !== projected(after)[index][1]).map(([name]) => name);
  function comparisonTable(before, after, beforeName, afterName) {
    const sides = [[beforeName, before], [afterName, after]].filter(([, record]) => record);
    const differing = before && after ? differingFields(before, after) : [];
    const rows = projected(sides[0][1]).map(([name], index) => ({ name, values: sides.map(([, record]) => projected(record)[index][1]), changed: differing.includes(name) }))
      .filter(row => sides.length === 1 || row.changed || row.name === 'Work');
    const unchanged = sides.length === 2 ? projections.map(([name]) => name).filter(name => name !== 'Work' && !differing.includes(name)) : [];
    const between = (index, changed) => index ? element('td', { class: 'arrow', 'aria-hidden': 'true' }, changed ? icon('arrow') : []) : null;
    return element('div', { class: 'diff' }, [element('div', { class: 'table-scroll' }, element('table', {}, [
      element('thead', {}, element('tr', {}, [element('th', { scope: 'col', text: 'Field' }), ...sides.flatMap(([name], index) => [between(index, false), element('th', { scope: 'col', text: name })])])),
      element('tbody', {}, rows.map(row => element('tr', { class: row.changed ? 'changed' : undefined }, [element('th', { scope: 'row', text: row.changed ? `${row.name} (changes)` : row.name }),
        ...row.values.flatMap((value, index) => [between(index, row.changed), element('td', {}, row.changed && index ? element('span', { class: 'new-value', text: value }) : value)])])))])),
    unchanged.length ? paragraph(`Unchanged: ${unchanged.join(', ').toLocaleLowerCase()}.`, 'table-note') : null]);
  }

  // Records whose owner content differs between the selected source and the current checkout, once that checkout has been read for comparison.
  // A checkout that could not be read has no records to set beside the selected source: it has a reason, and no difference.
  const compared = () => state.compare && state.compare.coverage !== 'unavailable' ? state.compare : null;
  function comparisonRefusal() {
    const read = state.compare;
    if (!read || compared()) return null;
    const project = read.vocabulary?.project;
    if (project?.code && project.storedVersion === null) return unreadableReason(project);
    // Findings about single records are listed before the one that made the whole read unavailable: a selected group the
    // checkout does not hold. That one is the reason; any other unavailable read gives its only or first finding.
    const cause = (read.diagnostics || []).find(finding => finding.code === 'UNAVAILABLE_SCOPE') || read.diagnostics?.[0];
    return [sentence(cause?.reason || 'The current checkout is unavailable')];
  }
  function differences() {
    if (!compared()) return [];
    const currentByKey = new Map((state.compare.items || []).map(item => [itemKey(item), item]));
    const selectedByKey = new Map(items().map(item => [itemKey(item), item]));
    const order = entry => entry.local && entry.baseline ? 0 : entry.local ? 1 : 2;
    return [...new Set([...currentByKey.keys(), ...selectedByKey.keys()])].filter(key => currentByKey.get(key)?.contentHash !== selectedByKey.get(key)?.contentHash)
      .map(key => ({ key, local: currentByKey.get(key), baseline: selectedByKey.get(key) })).sort((a, b) => order(a) - order(b));
  }
  function renderChanges() {
    const snapshot = state.snapshot;
    const shared = snapshot.source?.kind === 'shared';
    const differing = differences();
    const refusal = comparisonRefusal();
    main.append(pageLead(heading('Changes and sharing'), paragraph('Local work is a proposal until shared through your team’s Git process. This app reads existing local refs and does not stage, commit, push, or infer remote freshness.', 'page-intro')));
    const label = String(snapshot.source?.label || 'Selected source unavailable');
    main.append(element('section', { class: 'sheet', 'aria-label': 'What is being compared' }, [element('div', { class: 'compare' }, [
      element('div', { class: 'compare-end' }, [element('span', { class: `end-dot end-dot--${sourceToneOf(snapshot)}`, 'aria-hidden': 'true' }), element('div', {}, [
        element('span', { class: 'label', text: shared ? 'Selected source, read-only' : 'Selected source' }), element('span', { class: `compare-name${shared ? ' mono' : ''}`, text: shared ? snapshot.source.ref : label.split(';')[0] }),
        element('span', { class: 'note', text: `${label}. Remote freshness ${snapshot.source?.remoteFreshness || 'unknown'}` })])]),
      element('div', { class: 'compare-link' }, element('span', { class: `pill${refusal ? ' pill--stop' : state.compare ? differing.length ? ' pill--warn' : ' pill--good' : ''}`,
        text: refusal ? 'Not compared' : state.compare ? counted(differing.length, 'record differs', 'records differ') : 'Not compared yet' })),
      element('div', { class: 'compare-end compare-end--checkout' }, [element('div', {}, [element('span', { class: 'label', text: 'Current checkout' }), element('span', { class: 'compare-name', text: 'Working copy' }),
        element('span', { class: 'note', text: state.compare ? `Read at ${state.compare.asOf ? instant(state.compare.asOf) : 'an unknown time'}, coverage ${state.compare.coverage}` : 'Read when you compare' })]),
      element('span', { class: 'end-dot end-dot--live', 'aria-hidden': 'true' })])]),
    element('div', { class: 'compare-form' }, [scopeControls(), actions(button('Compare with current checkout', compareCurrent, { class: 'primary' }))])]));
    const side = element('div', { class: 'stack side' });
    let section;
    if (refusal) {
      section = sheet('difference-heading', 'What differs', null, 'sheet fill');
      section.append(element('p', { class: 'notice notice--stop' }, ['Nothing is compared: the current checkout could not be read. ', ...refusal, ' Resolve it, then compare again.']),
        details('Current inspection limitations', state.compare.diagnostics));
    } else if (state.compare) {
      const both = differing.filter(entry => entry.local && entry.baseline).length;
      const added = differing.filter(entry => entry.local && !entry.baseline).length;
      const identical = new Set([...(state.compare.items || []), ...items()].map(itemKey)).size - differing.length;
      section = sheet('difference-heading', 'What differs', `${both} changed, ${added} only in the current checkout, ${differing.length - both - added} only in the selected source, ${identical} identical`, 'sheet fill');
      if (!differing.length) section.append(paragraph(state.compare.coverage === 'complete' && snapshot.coverage === 'complete' ? 'No owner content differences were found in these inspected snapshots.' : 'No inspected owner differences were found. Incomplete coverage prevents a complete comparison.', 'notice'));
      else section.append(element('ul', { class: 'diff-list' }, differing.slice(0, 100).map(({ key, local, baseline }) => {
        const record = local || baseline;
        const where = local && baseline ? `Differs in: ${differingFields(baseline, local).join(', ').toLocaleLowerCase() || 'recorded metadata only'}.` : local ? 'Only in the current checkout.' : 'Only in the selected source.';
        const shown = items().find(item => itemKey(item) === key);
        return element('li', { class: 'diff-row' }, [
          element('span', { class: `diff-tag${local && baseline ? ' diff-tag--changed' : local ? ' diff-tag--new' : ''}`, text: local && baseline ? 'Changed' : local ? 'New here' : 'Not here' }),
          element('div', { class: 'diff-text' }, [element('strong', { text: record.title }), element('span', { class: 'note', text: where })]),
          shown ? button('Open', () => openItem(shown), { class: 'quiet', 'aria-label': `Open ${record.id}: ${record.title}` }) : null,
          element('details', {}, [element('summary', { text: `${record.id}: owner difference` }), local && baseline ? comparisonTable(baseline, local, 'Selected source', 'Current checkout') : null,
            element('p', { class: 'id', text: record.ownerPath }),
            element('pre', { text: JSON.stringify({ owner: record.ownerPath, selected: baseline || 'Not inspected in selected source', current: local || 'Not inspected in current checkout' }, null, 2) })])]);
      })));
      if (differing.length > 100) section.append(paragraph(`${differing.length - 100} additional differences are omitted from this bounded view. Inspect owners with your project tools.`, 'note'));
      section.append(details('Current inspection limitations', state.compare.diagnostics));
      if (differing.length) side.append(element('section', { class: 'sheet', 'aria-labelledby': 'files-heading' }, [element('h3', { id: 'files-heading', text: 'Record files that differ' }),
        element('ul', { class: 'file-list' }, differing.slice(0, 100).map(({ local, baseline }) => element('li', {}, [
          element('span', { class: `file-mark${local && baseline ? '' : local ? ' file-mark--new' : ' file-mark--gone'}`, title: local && baseline ? 'Changed' : local ? 'Only in the current checkout' : 'Only in the selected source', text: local && baseline ? 'M' : local ? 'A' : 'D' }),
          element('span', { text: (local || baseline).ownerPath })]))),
        paragraph('Share them with your usual Git flow. Nothing on this page does it for you.', 'note')]));
    } else {
      section = element('section', { class: 'sheet sheet--empty fill', 'aria-labelledby': 'difference-heading' }, [element('h3', { id: 'difference-heading', text: 'What differs' }),
        paragraph('Nothing is compared yet. Compare with the current checkout to list the records that differ from the selected source.')]);
    }
    const report = state.report;
    side.append(element('section', { class: 'sheet', 'aria-labelledby': 'report-heading' }, [element('div', { class: 'sheet-head' }, [element('h3', { id: 'report-heading', text: 'Offline report' }),
      report ? element('span', { class: 'report-state' }, [icon('check'), `${report.status[0].toUpperCase()}${report.status.slice(1)}`]) : null]),
    paragraph(report ? 'One self-contained file that opens without this app. Read it on the Report tab, or open the file with the project report tool.' : 'One self-contained file that opens without this app. Refresh it to match the selected source, or read it on the Report tab.', 'note'),
    report?.path ? element('span', { class: 'link-path', text: report.path }) : null, actions(button('Refresh offline report', refreshReport), button('Open status report', () => navigate('Report'), { class: 'quiet' }))]));
    main.append(element('div', { class: 'split split--start' }, [section, side]), element('div', { class: 'strip strip--plain' }, details('Selected inspection limitations', snapshot.diagnostics)));
    if (state.form?.conflict) main.append(conflictPane());
  }

  // The status report is the same generated file the report tool writes. It is shown in a frame that has no origin of its
  // own: the report cannot read this page or its session, and it reaches no network.
  const reportScope = () => `${scopeLabel()}, ${sourcePhrase()}`;
  // Refusals a reader can act on are said in their words; any other keeps the reason the workspace gave.
  const REPORT_ADVICE = { HUMAN_COLLISION: 'The file in the report’s place was not written by this tool, so it is left as it is. Move it away, then refresh the report.',
    CONFLICT: 'Work changed while the report was being written. Refresh the report to read it again.' };
  // One frame is kept for the life of the page. Its document is assigned only when the report shown changes, so a redraw
  // around it neither reads a large report in again nor loses the reader's place in it.
  let reportFrame = null;
  function frameFor(shown) {
    if (!reportFrame) reportFrame = element('iframe', { class: 'report-frame', sandbox: 'allow-scripts allow-modals' });
    const title = `Status report: ${shown.label}`;
    if (reportFrame.title !== title) reportFrame.title = title;
    if (reportFrame.shownKey !== shown.key) { reportFrame.srcdoc = shown.html; reportFrame.shownKey = shown.key; }
    return reportFrame;
  }
  function renderReport() {
    const doc = state.reportDoc;
    const shown = doc?.html ? doc : null;
    const lead = [pageHead('Status report', reportScope(), button('Refresh report', () => checkpoint(() => reread()), { icon: 'refresh' }))];
    if (doc?.problem) lead.push(element('div', { class: 'banner banner--alert', role: 'alert' }, [
      element('span', { class: 'banner-mark', 'aria-hidden': 'true' }, icon('alert')),
      element('div', { class: 'banner-text' }, [paragraph(shown ? 'The report could not be brought up to date' : 'There is no report to show', 'banner-title'),
        paragraph(`${doc.advice || sentence(doc.problem)}${shown ? ` The report below is the last one read: ${shown.label}, written ${instant(shown.generatedAt)}.` : ''}`, 'banner-body')]),
      button('Try again', () => { dismissFeedback(); loadReport(); })]));
    if (shown) {
      // The frame keeps the last report read while another is on its way, so the strip says which report that is:
      // current only once nothing is being read and it is the report for the scope now selected.
      const updating = state.busy || state.reportDue;
      const fresh = !doc.problem && !updating && shown.label === reportScope();
      lead.push(element('div', { class: 'strip' }, [element('span', { class: 'strip-title', text: 'Report' }),
        element('span', { class: `report-state${fresh ? '' : ' report-state--held'}` }, [icon(fresh ? 'check' : 'clock'), fresh ? 'Up to date' : updating ? 'Updating…' : 'Not updated']),
        fresh ? null : element('span', { text: `Showing the last report read: ${shown.label}` }),
        element('span', { text: `Written ${instant(shown.generatedAt)}` }),
        element('span', {}, ['Also saved as ', mono(shown.path), ', which opens without this app'])]));
      const frame = frameFor(shown);
      if (frame.parentNode === main) frame.before(...lead); else main.append(...lead, frame);
    } else {
      reportFrame?.remove();
      if (!doc?.problem) lead.push(element('div', { class: 'report-frame report-frame--empty' }, paragraph(state.busy || state.reportDue ? 'Bringing the report up to date…' : 'No report has been read yet. Refresh the report to read it.')));
      main.append(...lead);
    }
  }
  async function loadReport() {
    if (state.busy) return;
    const label = reportScope();
    // Opening the view put the reader on its heading; the redraws around the request keep them there.
    const onHeading = document.activeElement === main.querySelector('h2');
    state.reportDue = false; state.busy = true; render(onHeading);
    try {
      const { report, html } = await api('/api/report-view', state.scope);
      if (typeof html === 'string' && html) {
        // The same scope read from the same work at the same time is the same report.
        state.reportDoc = { html, label, path: report.path, generatedAt: report.generatedAt, problem: '', advice: '',
          key: JSON.stringify([label, report.path, report.fingerprint, report.generatedAt]) };
        state.report = { status: String(report.status), path: report.path };
      } else state.reportDoc = { ...state.reportDoc, problem: report?.reason || 'No report is available for this scope', advice: '' };
    } catch (error) { state.reportDoc = { ...state.reportDoc, problem: error.message, advice: REPORT_ADVICE[error.code] || '' }; }
    finally { state.busy = false; render(onHeading); }
  }

  function beginForm(operation, item, extra = {}) {
    if (writableReason(item)) return announce(writableReason(item));
    checkpoint(() => {
      const base = item ? clone(item) : null;
      state.form = { operation, base, values: {
        kind: item?.kind || extra.kind || kinds()[0], title: item?.title || '', intent: item?.intent || '', priority: item?.priority || 999,
        criteria: clone(item?.criteria || []), assigneeId: item?.assigneeId ?? '', collaboratorIds: clone(item?.collaboratorIds || []),
        links: clone(item?.links || []), memberItemIds: clone(item?.memberItemIds || []), groupRole: '', updateMembers: false, optOut: !!item?.optOut,
        nextState: extra.nextState || '', correction: !!extra.correction, reason: '', resolution: '', reviewed: false, decisionsResolved: false,
        observed: false, decision: false, result: '', criterionIds: [], summary: '', adoptionReviewed: false,
        assessment: '', observedAt: '', healthConfirmed: false, deletionConfirmed: false
      }, dirty: false, preview: null, request: null, conflict: null, error: '' };
      state.view = 'Editor'; render(true);
    }, false);
  }
  function changeSteps(previewed) {
    const step = (name, status) => element('li', { class: status === 'done' ? 'done' : undefined, 'aria-current': status === 'current' ? 'step' : undefined },
      [element('span', { class: 'step-mark', 'aria-hidden': 'true' }, status === 'done' ? icon('check') : []), name]);
    return element('ol', { id: 'change-steps', class: 'steps', 'aria-label': 'Steps for this change' }, [step('Describe the change', previewed ? 'done' : 'current'),
      step('Review the exact change', previewed ? 'current' : 'ahead'), step('Save to your checkout', 'ahead')]);
  }
  const PREVIEW_READY = 'Preview ready. Review the exact change; nothing is saved yet.';
  const refuse = (form, message) => { form.error = message; form.errorSaid = false; };
  function changed() {
    const form = state.form;
    form.dirty = true; form.preview = null; form.request = null; form.error = '';
    // What was said about the earlier attempt no longer describes this draft.
    main.querySelector('.editor-error')?.remove();
    if (state.message === PREVIEW_READY) announce('');
    document.getElementById('preview-pane')?.replaceChildren();
    document.getElementById('change-steps')?.replaceWith(changeSteps(false));
    document.getElementById('preview-change')?.classList.add('primary');
    document.getElementById('draft-note')?.removeAttribute('hidden');
  }
  // The label sits beside its control, never around it: a label that wraps a select takes the option text into its own
  // text, so the control can no longer be found by the label alone.
  function labelledField(label, control, ...notes) { return element('div', { class: 'field' }, [element('label', { for: control.id, text: label }), control, ...notes]); }
  function field(container, name, label, options = {}) {
    const form = state.form;
    const id = `edit-${name}`;
    const redacted = options.sourceValue !== undefined && (hasRedaction(options.sourceValue) || hasRedaction(form.values[name]));
    const disabled = state.busy || !!state.uncertain || redacted || options.disabled;
    const control = options.choices
      ? element('select', { id, disabled, required: options.required }, options.choices.map(([value, title, unavailable]) => element('option', { value, text: title, disabled: unavailable })))
      : element(options.multiline ? 'textarea' : 'input', { id, type: options.type || 'text', disabled, required: options.required,
        maxlength: options.max || 2000, min: options.min, max: options.maxNumber, autocomplete: 'off' });
    control.value = form.values[name] ?? '';
    control.addEventListener(options.choices ? 'change' : 'input', () => { form.values[name] = control.value; changed(); });
    container.append(labelledField(label, control, options.help ? paragraph(options.help, 'note') : null,
      redacted ? paragraph('Redacted original field: editing is unavailable here. It will be omitted from the change.', 'note') : null));
    return control;
  }
  function check(container, name, label, required = false) {
    const control = element('input', { type: 'checkbox', checked: state.form.values[name], required, disabled: state.busy || !!state.uncertain,
      onChange: event => { state.form.values[name] = event.target.checked; changed(); } });
    container.append(element('label', { class: 'check' }, [control, label]));
  }
  // After a row is removed the reader is put on the row that took its place, else the one before it, else the Add button.
  function focusRow(rows, index, addId) {
    const left = main.querySelectorAll(rows);
    (left[Math.min(index, left.length - 1)]?.querySelector('button') || document.getElementById(addId))?.focus();
  }
  function criteriaEditor(container) {
    const form = state.form;
    const unsafe = hasRedaction(form.base?.criteria || []) || hasRedaction(form.values.criteria);
    const group = element('fieldset', { disabled: state.busy || !!state.uncertain || unsafe }, [element('legend', { text: 'Acceptance criteria (optional for capture)' })]);
    if (unsafe) group.append(paragraph('Redacted criteria cannot be replaced here. Their original values will be preserved.', 'note'));
    for (const [index, criterion] of form.values.criteria.entries()) {
      const row = element('div', { class: 'criterion-row' });
      for (const [name, label, max] of [['id', 'Stable criterion ID', 120], ['text', 'Observable outcome', 8000]]) {
        const id = `criterion-${index}-${name}`;
        const control = element(name === 'text' ? 'textarea' : 'input', { id, required: true, maxlength: max, value: criterion[name] });
        control.value = criterion[name];
        control.addEventListener('input', () => { criterion[name] = control.value; changed(); });
        row.append(element('label', { class: 'field', for: id }, [element('span', { class: 'label', text: label }), control]));
      }
      const remove = button('', () => { form.values.criteria.splice(index, 1); changed(); render(); focusRow('.criterion-row', index, 'add-criterion'); }, { 'aria-label': `Remove criterion ${criterion.id || index + 1}` });
      remove.append(icon('close'));
      row.append(remove); group.append(row);
    }
    group.append(element('div', { class: 'add-row' }, [button('Add criterion', () => { form.values.criteria.push({ id: '', text: '' }); changed(); render(); document.getElementById(`criterion-${form.values.criteria.length - 1}-id`)?.focus(); }, { id: 'add-criterion', icon: 'plus' }),
      paragraph('Use literal stable IDs, for example AC-1. Keep an ID when refining the same outcome; do not renumber existing criteria.', 'note')]));
    container.append(group);
  }
  function linksEditor(container) {
    const form = state.form;
    const unsafe = hasRedaction(form.base.links) || hasRedaction(form.values.links);
    const group = element('fieldset', { disabled: state.busy || !!state.uncertain || unsafe }, [element('legend', { text: 'Exact links' })]);
    if (unsafe) group.append(paragraph('Some original links are redacted. Replacing links is unavailable here; inspect the canonical owner.', 'notice'));
    for (const [index, link] of form.values.links.entries()) {
      const row = element('div', { class: 'link-row' });
      const relation = element('select', { id: `relation-${index}` }, (vocabulary().linkRoles || []).map(value => element('option', { value, text: value })));
      relation.value = link.relation;
      relation.addEventListener('change', () => {
        link.relation = relation.value; delete link.itemId; delete link.path;
        if (['spec', 'plan', 'source'].includes(link.relation)) link.path = ''; else link.itemId = '';
        changed(); render();
      });
      row.append(labelledField('Relationship', relation));
      const acceptsPath = ['spec', 'plan', 'source'].includes(link.relation);
      const pathLink = acceptsPath && !Object.hasOwn(link, 'itemId');
      if (acceptsPath) {
        const owner = element('select', { id: `link-owner-${index}` }, [
          element('option', { value: 'path', text: 'Public project file' }),
          element('option', { value: 'itemId', text: 'Tracked work identity' })
        ]);
        owner.value = pathLink ? 'path' : 'itemId';
        owner.addEventListener('change', () => {
          delete link.path; delete link.itemId; link[owner.value] = ''; changed(); render();
        });
        row.append(labelledField('Target owner', owner));
      }
      const target = pathLink ? element('input', { id: `link-${index}`, required: true, maxlength: 500 })
        : element('select', { id: `link-${index}`, required: true }, [element('option', { value: '', text: 'Choose exact work' }), ...items().filter(item => item.id !== form.base.id && hasUniqueId(item.id)).map(item => element('option', { value: item.id, text: `${item.id}: ${item.title}` }))]);
      target.value = pathLink ? link.path || '' : link.itemId || '';
      target.addEventListener(pathLink ? 'input' : 'change', () => { link[pathLink ? 'path' : 'itemId'] = target.value; changed(); });
      row.append(labelledField(pathLink ? 'Public project-relative path' : 'Work identity', target), button('Remove link', () => { form.values.links.splice(index, 1); changed(); render(); focusRow('.link-row', index, 'add-link'); }));
      group.append(row);
    }
    group.append(element('div', { class: 'add-row' }, [button('Add link', () => { form.values.links.push({ relation: 'dependency', itemId: '' }); changed(); render(); document.getElementById(`relation-${form.values.links.length - 1}`)?.focus(); }, { id: 'add-link', icon: 'plus' }),
      paragraph('Links are explicit. Public paths must be inside this project and outside sensitive files. The preview checks unresolved owners and cycles.', 'note')]));
    container.append(group);
  }
  function renderEditor() {
    const form = state.form;
    const operation = form.operation;
    const titles = { create: 'Capture work', update: 'Refine work', adopt: 'Review tracking adoption', assign: 'Assign work', link: 'Edit exact links', group: 'Manage work group',
      transition: form.values.correction ? 'Change state' : `Change work to ${labels()[form.values.nextState]}`, proof: 'Record observed proof', accept: 'Accept work', retire: 'Retire work', restore: 'Restore work', attest: 'Attest record health', delete: ended(form.base) ? 'Delete work entirely' : 'Review draft deletion' };
    main.append(element('div', { class: 'page-head' }, [pageLead(
      element('p', { class: 'trail' }, ['Work', icon('chevronRight'), ...(form.base ? [mono(form.base.id), icon('chevronRight')] : []), titles[operation]]), heading(titles[operation]),
      paragraph(form.base ? `${form.base.id}: ${form.base.title} | Original revision ${form.base.revision} | ${form.base.ownerPath}` : 'Capture a small draft; refine its criteria and responsibility when ready.', 'note')),
    changeSteps(!!form.preview)]));
    const editor = element('form', { class: 'editor' });
    editor.addEventListener('submit', event => { event.preventDefault(); previewOperation(); });
    const inputs = element('fieldset', { disabled: state.busy || !!state.uncertain }, [element('legend', { text: 'Proposed local change' })]);
    const reason = writableReason(form.base);
    if (reason) inputs.append(paragraph(reason, 'notice'));
    if (operation === 'create' || operation === 'update') {
      if (operation === 'create') {
        const kind = field(inputs, 'kind', 'Work kind', { choices: kinds().map(kind => [kind, kindName(kind)]), required: true });
        const help = element('p', { id: 'kind-help', class: 'note', text: kindHelp(form.values.kind) });
        kind.setAttribute('aria-describedby', 'kind-help');
        kind.addEventListener('change', () => { help.textContent = kindHelp(kind.value); });
        inputs.append(help);
      }
      field(inputs, 'title', 'Title', { required: true, max: 500, sourceValue: form.base?.title });
      field(inputs, 'intent', 'Intended outcome', { multiline: true, required: true, max: 8000, sourceValue: form.base?.intent, disabled: form.base?.state === 'done' });
      if (operation === 'update') {
        field(inputs, 'priority', 'Priority (1–999, lower comes first)', { type: 'number', min: 1, maxNumber: 999 });
        check(inputs, 'optOut', 'Opt this item out of automatic upkeep');
      }
      if (form.base?.state === 'done') inputs.append(paragraph('Reopen this work before changing delivered intent or criteria.', 'notice'));
      else criteriaEditor(inputs);
    } else if (operation === 'assign') {
      const currentInactive = form.base.assigneeId && !members().some(member => member.id === form.base.assigneeId && member.active);
      field(inputs, 'assigneeId', 'Responsible member', { choices: [['', 'Explicitly unassign'], ...(currentInactive ? [[form.base.assigneeId, `Current inactive/unknown owner (${form.base.assigneeId}); choose an active member`]] : []),
        ...members().filter(member => member.active).map(member => [member.id, `${member.displayName} (${member.id})`])], help: 'Saving assignment leaves recorded state unchanged. Start work is a separate action.' });
      const collaborators = element('fieldset', {}, [element('legend', { text: 'Collaborators (optional)' })]);
      for (const member of members().filter(member => member.active)) {
        const control = element('input', { type: 'checkbox', checked: form.values.collaboratorIds.includes(member.id), onChange: event => {
          form.values.collaboratorIds = event.target.checked ? [...new Set([...form.values.collaboratorIds, member.id])] : form.values.collaboratorIds.filter(id => id !== member.id); changed();
        } });
        collaborators.append(element('label', { class: 'check' }, [control, `${member.displayName} (${member.id})`]));
      }
      inputs.append(collaborators);
    } else if (operation === 'link') linksEditor(inputs);
    else if (operation === 'group') {
      field(inputs, 'groupRole', 'Group purpose', { choices: [['', `Keep current purpose: ${groupLabel(form.base)}`],
        ...(vocabulary().groupRoles || []).map(role => [role, `${purposeName(role)} (${role})`]), ['clear', 'Clear purpose (generic group)']],
        help: 'Purpose describes this group. It does not change its kind, members, permissions or delivery credit.' });
      check(inputs, 'updateMembers', 'Update members');
      const membership = element('fieldset', { disabled: !form.values.updateMembers }, [element('legend', { text: 'Direct members' })]);
      inputs.querySelector('input[type="checkbox"]').addEventListener('change', () => { membership.disabled = !form.values.updateMembers; });
      membership.append(paragraph('Selected identities define this group. The preview checks unresolved owners, duplicate membership and cycles. Leave Update members unchecked to preserve all members.', 'note'));
      for (const item of items().filter(item => item.id !== form.base.id && hasUniqueId(item.id))) {
        const control = element('input', { type: 'checkbox', checked: form.values.memberItemIds.includes(item.id), onChange: event => {
          form.values.memberItemIds = event.target.checked ? [...new Set([...form.values.memberItemIds, item.id])] : form.values.memberItemIds.filter(id => id !== item.id); changed();
        } });
        membership.append(element('label', { class: 'check' }, [control, `${item.id}: ${item.title}`]));
      }
      inputs.append(membership);
    } else if (operation === 'adopt') {
      inputs.append(paragraph('Preview adoption to compare the original and proposed record. Adoption adds tracking metadata without changing the record’s authored content or identity.'));
    } else if (operation === 'transition') {
      if (form.values.correction) {
        inputs.append(paragraph(`This work is recorded as ${labels()[form.base.state] || form.base.state}. Choose the state it should be in instead. Done is not offered: work becomes done only when it is accepted.`));
        // Started work always has a responsible member, so those states wait until someone active is assigned.
        const unowned = !members().some(member => member.id === form.base.assigneeId && member.active);
        const needsOwner = key => unowned && ['in_progress', 'blocked', 'verifying'].includes(key);
        field(inputs, 'nextState', 'New state', { required: true, choices: [['', 'Choose a state'],
          ...Object.keys(labels()).filter(key => key !== form.base.state && key !== 'done').map(key => [key, needsOwner(key) ? `${labels()[key]} (needs a responsible member)` : labels()[key], needsOwner(key)])] })
          .addEventListener('change', () => { render(); document.getElementById('edit-nextState')?.focus(); });
        if (['in_progress', 'blocked', 'verifying'].includes(form.values.nextState)) inputs.append(paragraph('Started work needs a responsible member and a reviewed readiness decision.', 'note'));
      }
      if (reviewsReadiness(form)) {
        check(inputs, 'reviewed', 'I reviewed the current scope and acceptance criteria', true);
        check(inputs, 'decisionsResolved', 'I confirmed required decisions are resolved', true);
      }
      if (form.values.correction || form.base.state === 'done' || ['blocked', 'canceled'].includes(form.values.nextState)) field(inputs, 'reason', 'Reason for this change', { multiline: true, required: true });
      if (!form.values.correction && form.base.state === 'blocked' && form.values.nextState !== 'canceled') field(inputs, 'resolution', 'How the blocker was resolved', { multiline: true, required: true });
      inputs.append(paragraph('This action records only the selected state. It does not accept work or infer passing proof.', 'note'));
    } else if (operation === 'proof') {
      inputs.append(paragraph('Record an observation you actually made against the current criteria and declared source. This is manual proof; it does not assert that a test or review ran.'));
      for (const criterion of form.base.criteria) {
        const control = element('input', { type: 'checkbox', checked: form.values.criterionIds.includes(criterion.id), onChange: event => {
          form.values.criterionIds = event.target.checked ? [...new Set([...form.values.criterionIds, criterion.id])] : form.values.criterionIds.filter(id => id !== criterion.id); changed();
        } });
        inputs.append(element('label', { class: 'check' }, [control, `${criterion.id}: ${criterion.text}`]));
      }
      field(inputs, 'result', 'Observed result', { required: true, choices: [['', 'Choose what you observed'], ['passed', 'Passed'], ['failed', 'Failed'], ['skipped', 'Skipped']] });
      field(inputs, 'summary', 'What you observed', { required: true, multiline: true, help: 'Describe the actual observation and its limits. Do not paste a predicted result.' });
      check(inputs, 'observed', 'I made this observation against the current displayed criteria and source', true);
      inputs.append(details('Current proof scope', { criteriaIdentity: form.base.verification.criteriaIdentity, sourceIdentity: form.base.verification.sourceIdentity, sourceCoverage: form.base.verification.sourceCoverage }));
    } else if (operation === 'attest') {
      inputs.append(paragraph(`Record a dated assessment as ${memberName(state.session.actor)} (${state.session.actor}) for ${form.base.id}. This does not change delivery status. A child record’s health does not become project health; the selected project or group has its own explicit health owner.`, 'note'));
      field(inputs, 'assessment', 'Your health assessment', { required: true, max: 160 });
      field(inputs, 'observedAt', 'Actual observation date (UTC)', { required: true, max: 24, help: 'Enter the observation you made, in YYYY-MM-DDTHH:mm:ss.sssZ form. A future date is not accepted. No date is filled automatically.' });
      field(inputs, 'reason', 'Reason and limits of this assessment', { required: true, multiline: true });
      check(inputs, 'healthConfirmed', 'I am this configured owner and made the dated assessment recorded above', true);
    } else if (operation === 'delete' && ended(form.base)) {
      inputs.append(paragraph(`Delete ${form.base.id} at ${form.base.ownerPath} entirely? It is ${form.base.retired ? 'retired' : 'canceled'}, so it is already outside every active scope and no delivery count changes. Deleting removes its record file together with its history, proof and acceptance decisions from this checkout. Leave it ${form.base.retired ? 'retired' : 'canceled'} when its identity or history should remain. The preview checks that no other record still links to it; nothing else is changed.`, 'notice'));
      field(inputs, 'reason', 'Reason for deleting this work', { required: true, multiline: true });
    } else if (operation === 'delete') {
      inputs.append(paragraph(`Delete draft ${form.base.id} at ${form.base.ownerPath}? This removes its canonical file. Cancel or retire work when its identity or history should remain. The preview checks that no record references this draft and that it has no established work history.`, 'notice'));
      field(inputs, 'reason', 'Reason for deleting this draft', { required: true, multiline: true });
    } else {
      field(inputs, 'reason', operation === 'accept' ? 'Acceptance decision and reason' : 'Reason', { required: true, multiline: true });
      if (operation === 'accept') {
        check(inputs, 'decision', 'I am making an explicit acceptance decision on this verifying work with current proof', true);
        const proof = form.base.verification || {};
        inputs.append(element('div', { class: 'proof-panel' }, [element('span', { class: 'label', text: 'Proof this decision rests on' }),
          element('span', { class: `fact-value mark proof proof--${proofStatus(form.base)}` }, [...pips(form.base), `${proofWord(form.base)}, ${counted(form.base.criteria?.length || 0, 'criterion', 'criteria')}`]),
          element('span', { class: 'fact-sub', text: proof.reason || 'Not established' }),
          element('span', { class: 'id', text: `criteria ${String(proof.criteriaIdentity).slice(0, 8)}, source ${String(proof.sourceIdentity).slice(0, 8)}` })]),
        details('Current applicable proof', form.base.verification));
      }
    }
    editor.append(inputs);
    // A refusal is an alert when it is made. A later redraw shows the same words without saying them a second time.
    if (form.error) { editor.append(element('p', { class: 'notice editor-error', role: form.errorSaid ? undefined : 'alert', text: form.error })); form.errorSaid = true; }
    // Once a preview exists, saving it is the one leading action; editing a field hands the lead back to Preview.
    editor.append(element('div', { class: 'editor-foot' }, [element('span', { id: 'draft-note', class: 'draft-note', hidden: !form.dirty, text: 'Unsaved draft, kept in this page only' }), button('Back to work', () => navigate('Work')),
      element('button', { id: 'preview-change', type: 'submit', class: form.preview ? undefined : 'primary', disabled: state.busy || !!reason || !!state.uncertain }, [element('span', { text: 'Preview change' }), icon('arrow')])]));
    const previewPane = element('section', { id: 'preview-pane', class: 'review', 'aria-label': 'Change preview' });
    main.append(element('div', { class: 'editor-layout' }, [editor, previewPane]));
    renderPreview(previewPane);
    if (form.conflict) main.append(conflictPane());
  }

  function buildRequest() {
    const form = state.form, values = form.values, base = form.base;
    let patch;
    if (form.operation === 'create') patch = { title: values.title, intent: values.intent, ...(values.criteria.length ? { criteria: clone(values.criteria) } : {}) };
    else if (form.operation === 'update') {
      patch = {};
      for (const name of ['title', 'intent']) if (!hasRedaction(base[name]) && !hasRedaction(values[name]) && values[name] !== base[name]) patch[name] = values[name];
      if (Number(values.priority) !== base.priority) patch.priority = Number(values.priority);
      if (!hasRedaction(base.criteria) && !hasRedaction(values.criteria) && JSON.stringify(values.criteria) !== JSON.stringify(base.criteria)) patch.criteria = clone(values.criteria);
      if (values.optOut !== base.optOut) patch.optOut = values.optOut;
      if (!Object.keys(patch).length) throw new Error('Choose an explicit field change before previewing.');
    } else if (form.operation === 'assign') {
      if (values.assigneeId && !members().some(member => member.id === values.assigneeId && member.active)) throw new Error('Choose an active configured member or explicitly unassign.');
      patch = { assigneeId: values.assigneeId || null };
      if (JSON.stringify(values.collaboratorIds) !== JSON.stringify(base.collaboratorIds)) patch.collaboratorIds = clone(values.collaboratorIds);
    } else if (form.operation === 'link') {
      if (hasRedaction(base.links) || hasRedaction(values.links)) throw new Error('Redacted links cannot be replaced from this view. Inspect the canonical owner.');
      patch = { links: clone(values.links) };
    } else if (form.operation === 'group') {
      patch = {};
      if (values.groupRole) patch.groupRole = values.groupRole === 'clear' ? null : values.groupRole;
      if (values.updateMembers) patch.memberItemIds = clone(values.memberItemIds);
      if (!Object.keys(patch).length) throw new Error('Choose a purpose change or select Update members before previewing.');
    }
    else if (form.operation === 'adopt') patch = {};
    else if (form.operation === 'transition') {
      if (values.correction && (!values.nextState || !values.reason.trim())) throw new Error('Choose the new state and give the reason for this change.');
      patch = { state: values.nextState, ...(values.correction ? { correction: true } : {}) };
      if (values.reason.trim()) patch.reason = values.reason;
      if (values.resolution.trim()) patch.resolution = values.resolution;
      if (reviewsReadiness(form)) {
        if (!values.reviewed || !values.decisionsResolved) throw new Error('Both readiness decisions must be confirmed by you.');
        patch.readiness = { reviewed: true, decisionsResolved: true };
      }
    } else if (form.operation === 'proof') {
      if (!values.observed || !values.criterionIds.length || !values.result || !values.summary.trim()) throw new Error('Choose the observed criteria and result, describe the observation, and confirm that you made it.');
      patch = { proof: { id: crypto.randomUUID(), kind: 'manual', result: values.result, observedAt: new Date().toISOString(), criteriaIds: clone(values.criterionIds),
        criteriaIdentity: base.verification.criteriaIdentity, sourceIdentity: base.verification.sourceIdentity, summary: values.summary } };
    } else if (form.operation === 'attest') {
      if (!values.healthConfirmed || !values.assessment.trim() || !values.reason.trim()
        || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(values.observedAt)
        || !Number.isFinite(Date.parse(values.observedAt)) || new Date(values.observedAt).toISOString() !== values.observedAt
        || Date.parse(values.observedAt) > Date.now()) throw new Error('Supply your actual UTC observation date, assessment and reason, then confirm the owner decision. Future dates are unavailable.');
      patch = { health: { assessment: values.assessment, ownerId: state.session.actor, observedAt: values.observedAt, reason: values.reason } };
    } else {
      if (!values.reason.trim()) throw new Error('Record the reason for this decision.');
      if (form.operation === 'accept' && !values.decision) throw new Error('Confirm your explicit acceptance decision before previewing.');
      patch = { reason: values.reason };
    }
    const request = { schemaVersion: REQUEST_VERSION, operation: form.operation, operationId: crypto.randomUUID(), target: { kind: base?.kind || values.kind },
      actor: { memberId: state.session.actor }, patch };
    if (base) { request.target.itemId = base.id; request.expected = { revision: base.revision, contentHash: base.contentHash }; }
    return request;
  }
  async function previewOperation() {
    if (state.busy || state.uncertain || writableReason(state.form?.base)) return;
    const form = state.form;
    dismissFeedback();
    try { form.request = buildRequest(); }
    catch (error) { refuse(form, error.message); render(); return; }
    state.busy = true; form.error = ''; form.preview = null; form.dirty = true; render();
    try {
      const result = await api('/api/operation', { ...form.request, preview: true });
      if (result.primary?.status !== 'preview' || !result.previewToken) throw new Error(result.primary?.reason || 'This change was not previewed. Reread the record before continuing.');
      form.preview = result; form.values.adoptionReviewed = false; form.values.deletionConfirmed = false;
      state.message = PREVIEW_READY;
    } catch (error) {
      refuse(form, error.message);
      if (error.status === 409) form.conflict = { reason: error.message, original: clone(form.base), current: null };
    } finally {
      state.busy = false; render();
      // The control that asked for the preview gives way to what it produced.
      if (form.preview && state.form === form) document.getElementById('preview-heading')?.focus();
    }
  }
  function renderPreview(pane) {
    const form = state.form;
    if (!form.preview) return;
    const { current, proposed } = form.preview;
    const expected = form.request.expected;
    pane.append(element('div', { class: 'sheet-head' }, [element('h3', { id: 'preview-heading', text: 'Review this exact change', tabindex: '-1' }), element('span', { class: 'unsaved', text: 'Nothing is saved yet' })]));
    if (!current) pane.append(paragraph('New work; no existing record is replaced.'));
    if (current || proposed) pane.append(comparisonTable(current, proposed, 'Current record', 'Proposed record'));
    pane.append(element('p', { class: 'meta' }, [element('span', {}, ['Operation ', mono(form.request.operationId)]),
      element('span', {}, ['Acting as ', element('strong', { text: memberName(state.session.actor) }), ` (${state.session.actor})`]),
      expected ? element('span', {}, [`Expects revision ${expected.revision}, content `, mono(String(expected.contentHash).slice(0, 8))]) : null]),
    element('div', { class: 'strip strip--plain' }, [details('Complete current and proposed records', { current: current || null, proposed: proposed || null }),
      details('Exact proposed fields and source identity', { change: form.request.patch, expected: form.request.expected })]));
    if (form.operation === 'delete') {
      const lost = form.preview.primary?.removes;
      // The preview states what leaves the checkout with ended work; the page repeats it and adds nothing.
      pane.append(paragraph(lost ? `This record will be removed entirely: ${form.base.ownerPath}. With it go ${counted(lost.historyEntries, 'history entry', 'history entries')}, ${counted(lost.proofs, 'proof', 'proofs')}, ${counted(lost.acceptanceDecisions, 'acceptance decision', 'acceptance decisions')}, ${counted(lost.links, 'link', 'links')} of its own and ${counted(lost.members, 'group member reference', 'group member references')}. No related record will be changed or deleted.`
        : `The reviewed draft will be removed: ${form.base.ownerPath}. No related record will be deleted. Retirement remains the alternative for retaining its identity.`, 'notice'));
      const confirm = element('input', { type: 'checkbox', checked: form.values.deletionConfirmed, disabled: state.busy,
        onChange: event => { form.values.deletionConfirmed = event.target.checked; document.getElementById('save-preview').disabled = !event.target.checked || state.busy; } });
      pane.append(element('label', { class: 'check' }, [confirm, lost ? `I reviewed ${form.base.id} and explicitly confirm deleting it entirely, together with its history`
        : `I reviewed the exact draft ${form.base.id} and explicitly confirm removing its canonical file`]));
    }
    if (form.operation === 'adopt') {
      const confirm = element('input', { type: 'checkbox', checked: form.values.adoptionReviewed, disabled: state.busy,
        onChange: event => { form.values.adoptionReviewed = event.target.checked; document.getElementById('save-preview').disabled = !event.target.checked || state.busy; } });
      pane.append(element('label', { class: 'check' }, [confirm, 'I reviewed the original and proposed record and approve this tracking adoption']));
    }
    const removing = form.operation === 'delete';
    pane.append(element('div', { class: 'review-foot' }, [button(removing ? form.preview.primary?.removes ? 'Delete work entirely' : 'Delete reviewed draft' : 'Save reviewed change', savePreview, { id: 'save-preview', class: removing ? 'caution save' : 'primary save', icon: removing ? undefined : 'check', disabled: state.busy || !!writableReason(form.base)
      || form.operation === 'adopt' && !form.values.adoptionReviewed || removing && !form.values.deletionConfirmed }),
    paragraph('Saves into your local checkout only. Sharing goes through your team’s Git process; this app never stages, commits or pushes.', 'note')]));
  }
  const VOCABULARY_REFUSALS = ['MIGRATION_REQUIRED', 'MIGRATION_IN_PROGRESS', 'MIXED_VOCABULARY'];
  async function savePreview() {
    const form = state.form;
    if (state.busy || !form?.preview || writableReason(form.base) || form.operation === 'adopt' && !form.values.adoptionReviewed || form.operation === 'delete' && !form.values.deletionConfirmed) return;
    const request = { ...clone(form.request), previewToken: form.preview.previewToken };
    await sendSave(request, form);
  }
  async function sendSave(request, form) {
    dismissFeedback(); state.busy = true; form.error = ''; render();
    try {
      const result = await api('/api/operation', request);
      if (result.primary?.status !== 'saved') throw Object.assign(new Error(result.primary?.reason || 'This operation did not confirm a save.'), { uncertain: !result.primary });
      state.result = result; state.uncertain = null; state.form = null; state.view = 'Work';
      if ((result.secondary || []).some(item => item.kind === 'deletion-recovery' && item.status === 'pending')) state.recovery = { request: clone(request) };
      state.message = '';
      try {
        state.snapshot = await inspect(state.scope);
        const target = items().find(item => item.id === result.primary.itemId && item.ownerPath === result.primary.ownerPath);
        state.selectedKey = target ? itemKey(target) : null;
      } catch { state.message = 'The item was saved, but the current view could not be reread. Reread the project to update the list; do not repeat the item change.'; }
    } catch (error) {
      refuse(form, error.message);
      if (error.uncertain) state.uncertain = { request: clone(request), form };
      else {
        state.uncertain = null;
        if (error.status === 409) form.conflict = { reason: error.message, original: clone(form.base), current: null };
        // The refusal says the project stores another vocabulary than this page read. The page reads it again so its
        // read-only state is shown; the draft and the refusal beside it stay.
        if (VOCABULARY_REFUSALS.includes(error.code)) { try { show(await inspect(state.scope)); } catch { /* The refusal already says why nothing was saved. */ } }
      }
    } finally {
      state.busy = false; render();
      // The editor is gone after a save: the reader lands on the saved record, or on the view when it is no longer listed.
      if (!state.form) (state.selectedKey && main.querySelector('.record-sheet h3') || main.querySelector('h2'))?.focus();
    }
  }
  async function retryOriginal() {
    if (state.busy || !state.uncertain) return;
    const pending = state.uncertain;
    state.form = pending.form; state.view = 'Editor';
    await sendSave(pending.request, pending.form);
  }
  async function retryDeletionRecovery() {
    if (state.busy || !state.recovery) return;
    begin();
    try {
      const result = await api('/api/operation', state.recovery.request);
      if (result.primary?.status !== 'saved' || !result.primary.deleted) throw new Error('Deletion completion was not confirmed. Retain the original request and inspect the project’s recovery record.');
      state.result = result;
      if (!(result.secondary || []).some(item => item.kind === 'deletion-recovery' && item.status === 'pending')) state.recovery = null;
      state.message = 'Original deletion recovery retried; no new deletion intent was created.';
    } catch (error) { state.message = `Deletion recovery remains pending: ${error.message} The confirmed removal is retained.`; }
    finally { state.busy = false; render(); }
  }

  function conflictPane() {
    const form = state.form;
    const conflict = form.conflict;
    const pane = element('section', { class: 'sheet conflict', 'aria-label': 'Conflict recovery' });
    pane.append(element('h3', { text: 'Keep the draft; review the current owner' }), paragraph(conflict.reason || 'The save outcome is unknown. Read the current record separately.'),
      paragraph('Your entered fields and original expected revision are retained. Reading current work does not automatically merge or resubmit this draft.', 'note'),
      factCells([['Your draft', conflict.original ? `Opened at revision ${conflict.original.revision}` : 'New work'],
        [conflict.current ? `Current, revision ${conflict.current.revision}` : 'Current record', conflict.current ? `${labels()[conflict.current.state] || conflict.current.state}; ${memberName(conflict.current.assigneeId)}` : 'Not read yet']], 'fact-tiles'),
      actions(button('Read current owner', readCurrentForConflict)));
    if (conflict.current) {
      pane.append(element('div', { class: 'strip strip--plain' }, [details('Original record opened', conflict.original), details('Current record read separately', conflict.current), details('Retained draft fields', form.values)]));
      if (!state.uncertain) {
        const review = element('input', { type: 'checkbox', disabled: state.busy });
        const rebase = button('Use reviewed current revision', () => {
          if (!review.checked) return;
          form.base = clone(conflict.current); form.preview = null; form.request = null; form.conflict = null; form.dirty = true;
          refuse(form, 'Current revision selected. Review your retained fields and preview a new intent before saving.'); render();
        }, { disabled: true, class: 'primary' });
        review.addEventListener('change', () => { rebase.disabled = !review.checked || state.busy; });
        pane.append(element('label', { class: 'check' }, [review, 'I reviewed the current record against my retained draft']), actions(rebase));
      } else pane.append(paragraph('A current read alone cannot confirm the original save receipt. Retry the original save to establish its outcome.', 'notice'));
    }
    return pane;
  }
  async function readCurrentForConflict() {
    if (state.busy || !state.form) return;
    const form = state.form;
    if (!form.conflict) form.conflict = { original: clone(form.base), current: null, reason: 'Save outcome unknown; retained draft and original request remain separate.' };
    begin();
    try {
      const snapshot = await inspect({});
      const matching = (snapshot.items || []).filter(item => item.id === form.base?.id && item.ownerPath === form.base?.ownerPath);
      if (snapshot.coverage !== 'complete' || matching.length !== 1) throw new Error('The current owner cannot be resolved with complete coverage. Resolve diagnostics through project tools, then reread.');
      form.conflict.current = clone(matching[0]);
    } catch (error) { refuse(form, error.message); announce(error.message); }
    finally { state.busy = false; render(); }
  }

  // Every read of work after the first comes through here. A read without the words stops the page: see `stopped`.
  async function inspect(scope) {
    const snapshot = await api('/api/inspect', scope);
    if (!usable(snapshot)) { stop(UNSUPPORTED); throw new Error(UNSUPPORTED); }
    return snapshot;
  }
  // What was compared or reported belongs to the read it was made from; a new read of the selected source drops it.
  function show(snapshot) { state.snapshot = snapshot; state.compare = null; state.report = null; state.concerns = null; state.reportDue = true; }
  async function reread(scope = state.scope) {
    if (state.busy) return;
    begin();
    try {
      const snapshot = await inspect(scope);
      state.scope = clone(scope); show(snapshot);
      // A path is lost only when the same group is read again and one of its edges is gone. A newly chosen scope starts its own entry.
      const sameGroup = state.entryPath.at(-1) === scope.groupId;
      const lostPath = state.entryPath.length > 0 && sameGroup && !validPath(state.entryPath, snapshot);
      if (state.entryPath.length && (lostPath || !sameGroup)) state.entryPath = scope.groupId && groupInfo(scope.groupId) ? [scope.groupId] : [];
      state.message = lostPath ? 'Path unavailable after reread. No removed or guessed parent is used.' : snapshot.coverage === 'unavailable' ? 'The selected source is unavailable. Inspect its reasons or explicitly choose the current checkout.' : 'Project reread. Retained drafts keep their original revision until you explicitly review a conflict.';
      return true;
    } catch (error) { state.message = `${error.message} The previously inspected source remains displayed.`; }
    finally { state.busy = false; render(); }
  }
  async function compareCurrent() {
    if (state.busy) return;
    begin();
    try { state.compare = await inspect(state.scope.groupId ? { groupId: state.scope.groupId } : {}); }
    catch (error) { state.message = error.message; }
    finally { state.busy = false; render(); }
  }
  async function refreshReport() {
    if (state.busy) return;
    begin();
    try {
      const report = await api('/api/report', state.scope);
      state.report = report.status ? { status: String(report.status), path: report.path } : null;
      state.message = `Offline report: ${report.status}. ${report.path ? `Project path: ${report.path}. Read it on the Report tab, or open the file with the project report tool.` : report.reason || ''}`;
      if (state.result?.secondary && ['current', 'generated'].includes(report.status)) {
        state.result.secondary = state.result.secondary.map(item => item.kind === 'report' ? report : item);
      }
    } catch (error) { state.message = `Report refresh remains pending: ${error.message} Any confirmed item save is retained.`; }
    finally { state.busy = false; render(); }
  }
  // A page with no session. One address serves one workspace, chosen where it was launched, so the page cannot pick a
  // folder; it can ask that workspace's own tool to open an attached tab on this machine.
  async function detached(reason) {
    main.setAttribute('aria-busy', 'false');
    document.getElementById('source-context').textContent = 'No selected project session';
    setRoot('No checkout established');
    document.getElementById('actor-context').textContent = 'No actor established';
    let reopenable = false;
    try { reopenable = (await beforeSession('/api/launcher')).reopen === true; } catch { /* The page still says how to launch. */ }
    const outcome = element('p', { class: 'note', role: 'status' });
    const reopen = async event => {
      const control = event.currentTarget;
      control.disabled = true; outcome.textContent = 'Asking this workspace to open…';
      try {
        const { launch } = await beforeSession('/api/reopen', {});
        outcome.textContent = launch.status === 'requested'
          ? `Asked ${launch.browser === 'chrome' ? 'Google Chrome' : 'the default browser'} to open this workspace in a new, attached tab. You can close this one.`
          : `Nothing was opened: ${launch.reason || 'no browser could be started'}. Launch the workspace again from its project.`;
      } catch (error) {
        outcome.textContent = error.status === 429 ? 'A request to open this workspace is already under way. Try again in a few seconds.'
          : 'This workspace could not be opened from this page. Launch it again from its project.';
      } finally { control.disabled = false; }
    };
    const here = sheet('attach-heading', 'The workspace at this address', null, 'sheet wider');
    here.append(paragraph('One address serves one workspace: the checkout it was launched from. This page is not attached to it, so nothing is shown and nothing can be changed here.', 'hero-copy'),
      reopenable ? actions(button('Open this workspace', reopen, { class: 'primary', iconAfter: 'arrow', disabled: false }))
        : paragraph('This workspace was launched without asking for a browser, so it cannot be opened from this page. Open the address its launch printed, or launch it again with the open option.', 'notice'),
      outcome);
    const other = sheet('other-heading', 'A different project', null, 'sheet narrow');
    other.append(paragraph('Each project serves its own workspace at its own address. Launch it from that project’s checkout with the task tool:'),
      element('p', {}, mono('serve --root <checkout> --write --open')),
      paragraph('A workspace can only be chosen where it is launched. A page cannot attach itself to another folder.', 'note'));
    main.replaceChildren(pageLead(heading('Workspace session required'),
      paragraph(reason || 'This page has no session. A launch attaches one page; opening the address by itself starts without one.', 'page-intro')),
      element('div', { class: 'split split--start' }, [here, other]));
  }
  async function initialize() {
    let restored = false;
    if (!sessionToken && launchCode) {
      try { sessionToken = (await beforeSession('/api/attach', { code: launchCode })).token || null; }
      catch { return detached('This launch link has already been used or has expired. A launch link attaches one page, once.'); }
    }
    if (!sessionToken) { sessionToken = kept(); restored = !!sessionToken; }
    if (!sessionToken) return detached();
    // What a stopped page last said was about the read it refused.
    if (state.stopped) { state.stopped = ''; state.message = ''; }
    state.busy = true; renderFeedback();
    try {
      const session = await api('/api/session');
      if (session.schemaVersion !== 1 || !usable(session.snapshot)) throw new Error(UNSUPPORTED);
      keep(sessionToken);
      state.session = session; state.snapshot = session.snapshot;
      if (directItem !== null || directOwner !== null) {
        state.view = 'Work';
        const matches = items().filter(item => item.id === directItem && (!directOwner || item.ownerPath === directOwner));
        if (matches.length === 1 && hasUniqueId(matches[0].id)) state.selectedKey = itemKey(matches[0]);
        else state.message = 'Linked work is missing, ambiguous or unavailable in this selected project. Inspect the available work or return to Overview.';
      }
    } catch (error) {
      // A kept session that the workspace no longer accepts belongs to an earlier launch on this address.
      if (restored && error.status === 403) {
        sessionToken = null; keep(null); state.busy = false;
        return detached('The workspace this tab was attached to has been launched again since, so its earlier session no longer applies.');
      }
      renderStopped(error.message);
    } finally { state.busy = false; main.setAttribute('aria-busy', 'false'); render(); }
  }
  initialize();
})();
