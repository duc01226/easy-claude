# Design spec — worked examples and related skills

> Read the examples when deciding between a Quick Spec and a Full Spec for a request; read the related skills when the request may be building or reviewing UI rather than specifying it (see also When NOT to Use in `SKILL.md`).

## Examples

### Example 1: Simple form spec

**Input:** "Design spec for customer onboarding form"

**Output:** Quick Spec opening with a compact §0a journey (a new customer completes onboarding), then sections 1-4 covering form fields (name, email, company name, plan-tier dropdown), validation rules, submit/cancel actions, and mobile stacking behavior.

### Example 2: Complex dashboard spec

**Input:** "Design spec for order pipeline dashboard with drag-and-drop columns"

**Output:** Full Spec covering Kanban board layout, order cards (component inventory), drag-and-drop interactions, column states (empty, populated, over-limit), filter bar, responsive collapse to list view on mobile, and accessibility for keyboard drag operations.

## Related Skills

| Skill                   | When to use instead                  |
| ----------------------- | ------------------------------------ |
| `ui-design --lane=marketing` | Build marketing/creative UI             |
| `ui-design --lane=product`   | Build product UI (dashboards, apps)     |
| `web-design-guidelines`   | Review existing UI for compliance       |
