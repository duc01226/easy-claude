# Integration test — native case-profile rules

> Read when the Case Contract Profile Gate in `SKILL.md` resolves a **Native profile** (config or a required project reference declares a different case contract). The strict TC default and its Section 8 procedure stay in `SKILL.md`; the semantic floor in that gate applies to every profile.

## Native-Profile Crosswalk

Under a native profile, apply this crosswalk:

| Concern | Native-profile rule |
| --- | --- |
| Canonical owner and scope | Resolve the business root and canonical owner from config plus required references; read the owner's declared scenario/requirement contract. |
| Identity | MUST ATTENTION preserve the full owner-qualified case identity, including each declared variant. NEVER mint TC IDs or convert native IDs. |
| Test carrier | Use the configured/project-declared test carrier and every matched additive overlay requirement; do not require default `.NET` annotations unless the selected profile declares them. |
| Cardinality | Follow the profile's declared relation. A native profile may explicitly declare many-to-many: one aggregate executor can cover several listed scenarios, and one scenario may have several variant rows or tests. Do not force 1:1 or infer an undeclared relation. |
| Coverage proof | For each mapped identity, MUST ATTENTION inspect the actual executor and assertion, and record its observed result when run. An aggregate proves only the listed cases its inspected path/assertions cover; never invent per-variant reporter outcomes. A link, ID, comment, or generated matrix is not execution proof. |
| Reports and matrices | MUST ATTENTION substitute the native owner, case, variant, carrier, and result fields in every output table. `TC`, Section 8, and default annotation labels below are strict-default examples. |
| Missing or changed intent | Update only the canonical owner through its declared authoring procedure. Do not auto-create a TC/Section 8 shadow; unresolved intent or unavailable owner procedure is `SPEC-GAP`/`BLOCKED`. |
| Test result | MUST ATTENTION separate mapped, executed, and passed states. Only the configured runner's observed result proves execution; `UNKNOWN` is never `PASS`. |

## Native-Profile Task Ordering

When the profile is native, perform the same quality sequence without executing the default-only Section 8/TC instructions below:

1. **FIRST: resolve canonical owner cases.** Read the affected owner and every applicable requirement/scenario, including declared variants. Record the owner-qualified identities and the configured case-to-test carrier. If the owner or required evidence field is missing, conflicting, or cannot be read, stop `BLOCKED`/`UNKNOWN`.
2. **MIDDLE: implement tests.** Exercise real production paths, use the profile's test carrier plus additive overlay requirements, and author expected outcomes that can fail when the protected intent breaks. For universal invariants, add the required property and boundary cases.
3. **FINAL: reconcile both directions.** Map each changed behavior to every applicable owner case and each affected owner case/variant to its actual executor and inspected assertion across integration and unit tests. Follow configured cardinality, including many-to-many mappings; an aggregate executor proves only the cases its actual path/assertions cover. Do not invent per-variant runner outcomes.
4. **Coverage task:** emit one owner/case/variant-to-executor/assertion matrix for the full affected owner scope, with `COVERED`, `GAP`, or `UNKNOWN`; zero `GAP`/`UNKNOWN` results are required for a pass. A mapped case is not an executed or passed case.
5. **Missing or stale contract:** do not create TC IDs, Section 8, or another registry. Route an actual owner change through its declared authoring procedure; preserve user confirmation and operation authority. If that procedure or intent is unavailable, leave the finding blocked.
