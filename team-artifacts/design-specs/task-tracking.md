---
status: provisional
source_of_truth: docs/specs/WorkTracking/README.TaskTracking.md
last_updated: 2026-10-06
---
# Work tracking interaction intent
This companion owns visual-design input, not delivery status, requirements or cases. User P14 requested three rendered options; P15 selected the planned work-list approach as the reference. P16 selected A, the split workbench with the list beside detail. The main session owns full continuation and visual verification; selection is not a visual PASS.

Sources: `tmp/design/261006-task-tracking/journey-report.md`, `run-notes.md`, `product-facts.md`, `seeds.md`; `plans/261003-task-pbi-tracking/ui-ux-gates.md`. Exact requirements and cases remain the canonical WorkTracking spec. Existing project design-system reference contains video/print-scoped assets with no app mappings; no application-wide token authority is assumed.

## Jobs and ranked journeys
Contributors work in their own checkout and assign useful work to themselves or another active member. Coordinators inspect responsibility and reconcile competing proposals. Agents maintain exact linked activity/proof without granting acceptance. Actor/job/outcome sourced from prompts; frequency is inferred.

J1 capture/assign → J2 inspect progress → J3 linked work checkpoint → J4 edit/retire → J5 share/reconcile. The three initial design options cover J1 key views only. Full app later covers all five journeys.

## Shared preview contract
Canvas 1440x900 and 390x844. All visual options share rule treatments, information priorities, actions and data; colour/type/layout may vary. One primary action per view; source/scope before numbers; acceptance and current verification separately labelled. No person scores or forecasts.

| View | Hosted step / primary | Secondary | On demand | Not here |
|---|---|---|---|---|
| Work list | J1.1; selected PBI-104 title, Unassigned, Ready; Open item | Other five records, blockers/proof; local proposal | Filter/history | Assignment form; people metrics; detailed acceptance |
| Item detail | J1.2; outcome/current owner; Assign | Ready, dependency, not accepted/no proof/local proposal | History/evidence | All-property editor; member configuration |
| Assignment editor | J1.3; visible Assignee label/member choice; Save assignment | Selected record/current owner; assignment leaves Ready and does not accept work | Stable member IDs | New-member form; status change |
| Saved result | J1.4; Assignment saved, owner Maya; Back to Work | Ready/not accepted/no proof/local proposal | Receipt; refresh pending | Start/Done implication |

Containers: full views for Work/detail/result; short focused editor on desktop and full-width short form on narrow screen. Back/Cancel keep selected record, filters and unsaved choice. No backend/network/storage in these disposable previews; all outcomes visibly simulated. Inactive/unknown members unavailable with reason. Conflict retains choice, rereads current item, permits only a revalidated retry. Saved+refresh pending must keep primary save.

## Exact shared illustrative data
Project: Team workspace. Checkout: Current checkout. Context: Local proposal; shared baseline available.
Members: maya/Maya Chen active; leo/Leo Patel active; sam/Sam Rivera active; former/Former teammate inactive.

| ID | Title | State | Owner | Acceptance | Current verification | Extra |
|---|---|---|---|---|---|---|
| PBI-104 | Export filtered records | Ready | Unassigned | Not accepted | No proof | Outcome: People can export only records matching current filters. Dependency: Filter selection is available. |
| PBI-103 | Keep export column order | In progress | Leo Patel | Not accepted | No proof | — |
| PBI-101 | Download records as a file | Done | Maya Chen | Accepted | Stale | — |
| TASK-208 | Test empty export results | Blocked | Sam Rivera | Not accepted | No proof | Awaiting sample data |
| IDEA-012 | Schedule a weekly export | Draft | Unassigned | Not accepted | No proof | Outside delivery denominator |
| PBI-102 | Choose export columns | Verifying | Sam Rivera | Not accepted | Passing | — |

Preview save changes only PBI-104 owner to Maya; state/acceptance/proof unchanged. Four forward actions (open, assign, choose Maya, save), three view changes, zero typed fields, two decisions, one simulated wait. These source counts are not observed runtime usability.

## Full surface to build after selected A
Overview, Work, My work, People, item detail/editor, Changes and proof. Explicit report snapshot versus writable workspace; bound checkout/profile visible, local/shared baseline and missing-reference limits honest. Search/filter/history/return/deep-link keyboard and narrow layout preserve task context. Only short focused tasks use dialogs. Long edits use full views. Primary creation asks for kind/title/intent only; parent, member, priority and references when needed, enrichment deferred.

## Gates and ownership
WCAG 2.2 AA target; actual rendering/keyboard/focus/reflow/contrast/form draft retention/conflict recovery evidence parent-owned. UI options are not implementation proof. Local app session/authority, native preview isolation and unsupported writer refusals remain core contract obligations. The chosen option's eventual fidelity owner will record actual tokens/component/viewport evidence; this companion does not introduce a new shared design system.

## Selected direction input — P16
The user chose `tmp/design/261006-task-tracking/direction-a.html`: A, split workbench, list beside detail. Source SHA-256: `452a643499ba6ea9e20d12714d0d845cff09f474133f3b7413aec330a58d9c6a`. Parent decision evidence: `tmp/design/261006-task-tracking/direction-approved.md`. Scope, rules, information priority, views and outcomes above govern the full continuation. Runtime/accessibility/visual evidence remains pending.

## Visual direction update — 2026-10-06
The user asked for a redesign of the built workspace and generated snapshot, then chose to add a read-only grouped Work layout. Direction A's structure stays: list beside detail is the default, source and scope come before numbers, and each view or panel has one leading action. The visual language and one layout changed:

- The lifecycle is drawn as a line of stations: it heads the grouped Work layout, summarises Overview and marks position on an item. Blocked work sits beside In progress; canceled work is off the line.
- State, responsible person, current proof and acceptance each carry their own mark. Proof shows one pip per acceptance criterion with one status for the whole item; per-criterion status is not available from the progress snapshot.
- Delivery is drawn as one block per eligible delivery item beside the counted statement. Nothing is drawn when coverage is partial or the blocks would disagree with the counts.
- Records waiting on a person (proved but not accepted, accepted without current proof, blocked, ready but not startable) are listed on Overview and in the snapshot.
- Tokens stay local to the workspace and the snapshot under the existing work-paper/record names. Type is the platform stack only; nothing is bundled or fetched.

Evidence for this update lives under `tmp/reports/task-track-redesign/`: design plan, gate report, measured contrast and captures. Jobs, journeys, rules and information priority above are unchanged.

## Visual direction update — 2026-10-07
The user compared the built workspace with the approved mock-up boards and judged it better but still basic. The first pass had restyled the earlier structure instead of building the boards. Each workspace view is now rebuilt to its board; jobs, journeys, rules and information priority above are unchanged.

- App bar on every view: mark, project name with the checkout path, scope and source controls that open the source and scope form, coverage, reread with the read time, and the acting person. Tabs carry counts, and capture sits at the end of the tab bar.
- Overview: a hero delivery figure with the percentage, one wide block per eligible delivery item, one caption and one leading action; the health card states the owner's dated assessment or that none exists; the lifecycle line shows kinds under each state; records waiting on a person carry a specific action. A project with one record shows that record and its next stops; a project with none shows how delivery scope begins.
- Work: the list beside detail presents rows under recorded-state headings; the record sheet leads with position on the lifecycle and the next stop, then criteria, history and a facts rail. The grouped layout keeps its read-only rules.
- People, Changes, change review, capture and feedback states follow their boards.
- Ended work can be deleted entirely from its record sheet: a canceled or retired record offers `Delete entirely` among its cautious actions. The review states what leaves with the record and waits for an explicit confirmation; open, started or accepted work is not offered it.
- A page reached without a session has its own state: it says that one address serves one workspace, offers to have that workspace opened again when the launch allows it, and says how another project is launched. It shows nothing of the work. The boards did not draw this state.
- Type: the workspace bundles the three typefaces the boards use and serves them itself, with platform fonts behind them for characters outside the bundled Latin sets. This supersedes the 2026-10-06 statement that type is the platform stack only. Nothing is fetched from the network. The generated snapshot stays on platform fonts because it is one self-contained file.
- Width: content is composed for 1440 and centred on wider windows; nothing overflows the page from 320 upward.
- Generated snapshot: rebuilt to its board on platform fonts. A masthead with the project name and a source strip; delivery scope with the hero figure and blocks; health; where work stands; waiting on a person; work as a table whose selected record opens under its row; responsibility with one block per open record per person; inspection limits and snapshot identity. It stays one self-contained file, readable with scripts off and printable, with delivery, proof and health on the first printed page.
- Drawn on the boards but not built, because the data or the feature does not exist: a search across work, people and actions; per-criterion proof results; durations such as days blocked; a delivery effect preview; copy and menu controls on the record sheet. Dates are shown as recorded.

Evidence for this update lives under `tmp/reports/task-track-fidelity/`: gap analysis per board, final report, captures per view and width, measured contrast and overflow.
