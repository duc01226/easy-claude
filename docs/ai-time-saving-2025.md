# AI Time Savings in Software Development: 2025 Evidence Review

> **Report type:** Research synthesis | **Date:** 2026-04-14 | **Covers:** 2023–2025 studies
> **Audience:** Engineering leaders, independent consultants, technology decision-makers
> **Confidence:** 85% overall — see per-claim confidence levels throughout

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [The Ceiling Problem: Why "55% Faster Coding" ≠ "55% More Productive"](#2-the-ceiling-problem)
3. [Empirical Studies: Controlled Experiments](#3-empirical-studies)
4. [Developer Surveys: Self-Reported Savings](#4-developer-surveys)
5. [How Developers Actually Spend Their Time](#5-how-developers-actually-spend-their-time)
6. [The Perception-Reality Gap](#6-the-perception-reality-gap)
7. [Hidden Costs: What Productivity Studies Miss](#7-hidden-costs)
8. [Consultant & Freelancer Profile](#8-consultant--freelancer-profile)
9. [Where AI Helps vs. Hurts](#9-where-ai-helps-vs-hurts)
10. [The Historical Analogy: Solow Paradox & the Internet](#10-the-historical-analogy)
11. [Calibrated Estimates by Developer Profile](#11-calibrated-estimates-by-developer-profile)
12. [Recommendations for Organizations](#12-recommendations-for-organizations)
13. [Sources & Methodology](#13-sources--methodology)

---

## 1. Executive Summary

**Key finding:** AI coding tools deliver real but narrower productivity gains than headline studies suggest. Six independent research efforts converge on a **~10% organizational productivity ceiling** as of 2025, even as AI code authorship reached 27% of production code. Individual practitioners under favorable conditions can realistically achieve **15–20%** total time savings; unfavorable conditions can result in net slowdowns.

| Metric                                          | Value                 | Source                               |
| ----------------------------------------------- | --------------------- | ------------------------------------ |
| AI adoption among developers                    | 84–93%                | Stack Overflow 2025, DX 2025         |
| Share of production code authored by AI         | 27%                   | DX / Faros AI 2025                   |
| Organizational productivity ceiling (consensus) | ~10%                  | 6 independent studies                |
| Individual practitioner range                   | −19% to +55%          | METR 2025, GitHub 2023               |
| Self-reported savings vs. measured savings gap  | ~39 percentage points | METR RCT 2025                        |
| Developers reporting positive AI sentiment      | 60%                   | Stack Overflow 2025 (down from 70%+) |

**The core paradox:** AI adoption is nearly universal, AI code generation is growing, but measured productivity gains have **plateaued at approximately 4 hours per week** since Q2 2025 and organizational delivery metrics (DORA) remain flat.

---

## 2. The Ceiling Problem

### Amdahl's Law Applied to Developer Productivity

The most common error in AI productivity discourse: extrapolating a speed improvement on _coding_ to an equivalent improvement on _total developer output_. This violates Amdahl's Law.

**The math:**

```
Total time saved = (Fraction of time coding) × (AI speed improvement on coding)

If coding = 25% of time, AI = 50% faster:
  Total savings = 0.25 × 0.50 = 12.5% — not 50%

If coding = 11% of time (Microsoft Research median), AI = 55% faster:
  Total savings = 0.11 × 0.55 = 6% — not 55%
```

**Implication:** Even a theoretical 100% elimination of all coding effort yields only 11–35% total time savings (depending on how much of your time is actually coding). AI tools accelerate only the coding portion; design, architecture, meetings, reviews, client communication, and project management are largely untouched.

### The Vendor Marketing Problem

Most headline productivity figures (particularly "55% faster") are measured on:

- Isolated coding tasks extracted from real work
- Short sessions (1–3 hours), not multi-day projects
- Greenfield code on familiar technologies
- Without measuring output quality or downstream maintenance cost

These conditions are systematically more favorable than typical production work.

---

## 3. Empirical Studies: Controlled Experiments

### 3.1 GitHub / Microsoft Copilot Study (2023) — The Origin of "55% Faster"

| Attribute           | Detail                                                     |
| ------------------- | ---------------------------------------------------------- |
| Finding             | Tasks completed 55.8% faster with Copilot                  |
| Task                | Single JavaScript HTTP server implementation               |
| Sample              | 95 recruited developers; 35 completers                     |
| Duration            | One session (avg ~2.5 hours)                               |
| Quality measured?   | No                                                         |
| Confidence interval | 21%–89%                                                    |
| **Critical flaw**   | Participants knew they were being timed (Hawthorne effect) |

**Assessment:** Useful proof-of-concept, but narrow scope limits generalizability. The 55% figure is widely cited without its caveats.

### 3.2 McKinsey Study (2023)

| Finding                    | Detail                            |
| -------------------------- | --------------------------------- |
| Headline                   | "Up to 2× faster" on coding tasks |
| Complex tasks              | **< 10% improvement**             |
| Junior developers (< 1 yr) | **7–10% slower** with AI          |
| Funding                    | McKinsey (consulting firm)        |

**Assessment:** Reveals a critical nuance — task complexity severely attenuates gains. Junior developers, contrary to intuition, can be net slowed by AI tools because they lack the judgment to efficiently evaluate AI suggestions.

### 3.3 METR Randomized Controlled Trial (2025) — The Strongest Counter-Evidence

| Attribute         | Detail                                                                  |
| ----------------- | ----------------------------------------------------------------------- |
| Design            | Randomized controlled trial (gold standard)                             |
| Participants      | 16 experienced open-source developers                                   |
| Tasks             | 246 real GitHub issues from repos with 22k+ stars and 1M+ lines of code |
| Finding           | Developers were **19% slower** with AI tools (CI: +2% to +39% slower)   |
| Perception        | Developers estimated they were **20% faster**                           |
| Perception gap    | **39 percentage points**                                                |
| AI rejection rate | **56% of AI suggestions rejected**                                      |

**Assessment:** The methodologically strongest study in the literature. Real tasks, real codebases, randomized assignment, experienced practitioners. The finding that experts _slow down_ on complex real-world work directly contradicts lab study results and exposes a fundamental limitation: AI tools currently excel at _generating_ code in context, not at _understanding_ complex existing systems.

### 3.4 Accenture Internal Study

- ~450 developers
- More throughput and higher quality reported with Copilot
- No published methodology or raw data

**Assessment:** Industry-standard "feels good" reporting without rigorous controls. Useful as a directional signal, not a data point.

### 3.5 Mercedes-Benz

- Estimated **30 minutes/day saved** (~6% of an 8-hour workday)
- Conservative, enterprise context
- Aligns closely with the ~10% organizational consensus

### Summary: Empirical Evidence Landscape

| Study         | Measured Gain               | Task Context          | Methodology Quality                        |
| ------------- | --------------------------- | --------------------- | ------------------------------------------ |
| GitHub 2023   | +55% (coding task)          | Simple, isolated      | Low (lab, small n, no quality measurement) |
| McKinsey 2023 | <10% (complex); 2× (simple) | Mixed                 | Medium (consulting-funded)                 |
| **METR 2025** | **−19% (net slower)**       | **Real OSS, complex** | **High (RCT, experienced devs)**           |
| Accenture     | Positive (unquantified)     | Enterprise            | Low (no published methodology)             |
| Mercedes-Benz | +6% (30 min/day)            | Enterprise            | Medium                                     |

**Confidence in range:** 85%. The true range for experienced developers on complex real-world tasks is approximately **−20% to +15%**, with simple/greenfield tasks reaching +40–55%.

---

## 4. Developer Surveys: Self-Reported Savings

### 4.1 Stack Overflow Developer Survey 2025

| Metric                                                   | Value                                 |
| -------------------------------------------------------- | ------------------------------------- |
| Developers using or planning to use AI tools             | 84%                                   |
| Professional developers using AI **daily**               | 51%                                   |
| Agent users reporting reduced task time                  | 70%                                   |
| Positive sentiment toward AI tools                       | **60%** (down from 70%+ in 2023–2024) |
| Developers citing "AI almost right but not quite"        | 66%                                   |
| Developers finding AI code debugging more time-consuming | **45%**                               |

**Trend:** Adoption continues rising while sentiment is declining — a pattern consistent with initial hype giving way to realistic assessment.

### 4.2 JetBrains State of Developer Ecosystem 2025

| Metric                                      | Value                        |
| ------------------------------------------- | ---------------------------- |
| Developers regularly using AI tools         | 85%                          |
| Relying on at least one AI coding assistant | 62%                          |
| Saving at least 1 hour/week                 | ~90% (self-reported)         |
| Saving 8+ hours/week                        | ~20% (self-reported)         |
| **Implied range**                           | **2.5%–20% of 40-hour week** |

### 4.3 DX Survey (4.2M developers, 2025)

| Metric                               | Value                 |
| ------------------------------------ | --------------------- |
| Monthly AI adoption                  | 92.6%                 |
| AI-generated production code share   | 27%                   |
| **Organizational productivity gain** | **~10%**              |
| Research convergence                 | 6 independent studies |

### 4.4 NBER Executive Survey (February 2026, ~6,000 executives)

| Metric                                                     | Value     |
| ---------------------------------------------------------- | --------- |
| Executives reporting no productivity impact (past 3 years) | **> 80%** |
| Expected productivity improvement (next 3 years)           | **1.4%**  |

**Assessment:** The sharpest disconnect in the data. Developer surveys show strong subjective benefit; executive productivity assessments are deeply skeptical. This gap likely reflects: (a) the perception-reality gap documented by METR, (b) productivity gains not yet flowing to business outcomes, and (c) offsetting costs (review, bugs, tech debt) absorbing the gains.

---

## 5. How Developers Actually Spend Their Time

Understanding the ceiling requires knowing what fraction of developer time is actually coding. The data is consistent and surprising to most developers.

### 5.1 Microsoft Research Time Warp Study (2024, ~5,000 developers)

| Activity                                   | Share of Workday |
| ------------------------------------------ | ---------------- |
| Meetings                                   | ~12%             |
| **Writing code**                           | **~11%**         |
| Debugging                                  | ~9%              |
| Architecture / design                      | ~6%              |
| Code reviews / PRs                         | ~5%              |
| Documentation                              | ~4%              |
| All other (communication, planning, admin) | ~53%             |

**Developers' _desired_ coding time:** ~20% — nearly double their actual coding time, indicating widespread frustration with non-coding overhead.

### 5.2 IDC Industry Report (2024)

| Activity Category                       | Share of SDLC |
| --------------------------------------- | ------------- |
| Writing and testing code                | 25–35%        |
| Code management (maintenance, security) | ~35%          |
| Meetings and organizational management  | ~23%          |
| Other                                   | remainder     |

**Median developer codes:** approximately **52 minutes per day** (IDC 2024).

### 5.3 Implications for AI Productivity Ceilings

| Coding % Assumption          | Max AI Gain (100% coding elimination) | Realistic AI Gain (50% coding reduction) |
| ---------------------------- | ------------------------------------- | ---------------------------------------- |
| 11% (Microsoft Research)     | 11%                                   | 5.5%                                     |
| 25% (IDC conservative)       | 25%                                   | 12.5%                                    |
| 35% (IDC high)               | 35%                                   | 17.5%                                    |
| 40% (consultant self-report) | 40%                                   | 20%                                      |

The 40% coding baseline that independent consultants report is at the high end but defensible for practitioners who have eliminated organizational overhead (no large org meetings, fewer process gates, more autonomous execution).

---

## 6. The Perception-Reality Gap

The METR study's most important contribution is not the productivity finding itself, but the gap between perceived and actual performance.

| Metric                         | Value                    |
| ------------------------------ | ------------------------ |
| Actual speed change (METR RCT) | **−19%** (slower)        |
| Developer self-estimate        | **+20%** (faster)        |
| **Perception-reality gap**     | **39 percentage points** |

### Why the Gap Exists

1. **AI reduces friction at the moment of code writing** — the experience of generating code feels faster, even when total task time (including debugging AI output) is longer
2. **Cognitive load redistribution** — developers feel like they're working less hard, which reads as productivity improvement even when wall-clock time increases
3. **Selection bias in memory** — developers remember the tasks where AI helped, not the extended debugging sessions fixing AI-generated bugs
4. **AI suggestion rejection rate** — 56% of AI suggestions are rejected (METR), meaning the evaluation cost is largely invisible to the user

### Organizational Implications

Self-reported productivity gains from developer surveys likely overstate actual gains by a factor of 2–4×. Organizations relying on developer satisfaction surveys to measure AI ROI are measuring sentiment, not output.

---

## 7. Hidden Costs

### 7.1 Code Quality Degradation

| Finding                                             | Metric                  | Source          |
| --------------------------------------------------- | ----------------------- | --------------- |
| Duplicated code blocks (5+ lines)                   | **8× increase** in 2024 | GitClear 2024   |
| AI-generated code with OWASP Top 10 vulnerabilities | **45%**                 | Veracode 2025   |
| Security vulnerabilities vs. human code             | **2.74× more**          | CodeRabbit 2025 |
| Codebase vulnerability increase YoY                 | **107%**                | Black Duck 2026 |

### 7.2 The Downstream Bottleneck (Faros AI, 10,000+ developers)

High AI adoption teams showed:

| Metric                | Change    |
| --------------------- | --------- |
| Tasks completed       | +21%      |
| Pull requests merged  | +98%      |
| **PR size**           | **+154%** |
| **PR review time**    | **+91%**  |
| **Bug rate**          | **+9%**   |
| DORA delivery metrics | **Flat**  |

**Interpretation:** AI accelerates code _production_ but creates a review bottleneck. The bottleneck absorbs the productivity gain before it reaches delivery metrics. More code doesn't mean more shipped value.

### 7.3 Technical Debt Accumulation

- AI-generated code is syntactically correct but often architecturally naive — it doesn't understand the project's design constraints, naming conventions, or future direction
- The "Ikea chair factory" effect: higher output volume at lower craft quality
- Deferred costs compound: a codebase with 2.74× more vulnerabilities requires significantly more future maintenance

### 7.4 Developer Review Overhead

Developers now spend approximately **9% of their time** reviewing and correcting AI-generated output (Stack Overflow 2026). This is a new cost category that didn't exist before AI tools — it is frequently underreported in productivity studies that measure only code generation speed.

---

## 8. Consultant & Freelancer Profile

### 8.1 Freelancer-Specific Data

| Finding                                           | Value          | Source                 |
| ------------------------------------------------- | -------------- | ---------------------- |
| Freelancers using AI tools                        | 77%            | Brookings 2024         |
| Self-reported productivity gain (AI adopters)     | 20–40%         | Brookings 2024         |
| Specific claim ("6h → 2.5h")                      | ~58% reduction | Freelancer survey 2024 |
| "Elite" freelancers (top 2%) reporting AI benefit | 80%+           | Survey 2024            |

### 8.2 Market Dynamics (Counter-Evidence)

Despite individual productivity gains, Brookings Institute research found:

- Freelancers in AI-exposed occupations saw **2% fewer contracts**
- **5% drop in earnings** post-2022
- Negative effects especially pronounced among **experienced, higher-priced freelancers**

**Interpretation:** Individual productivity gains are real, but market pricing adjusts. The value created by AI-driven efficiency may be competed away through lower client rates or lost to AI-native competitors rather than captured as profit.

### 8.3 Why the Consultant Profile Differs from Employed Developers

Independent consultants have structural advantages that shift their AI benefit upward:

| Factor                      | Employed Developer              | Independent Consultant               |
| --------------------------- | ------------------------------- | ------------------------------------ |
| Coding share of time        | 11–25%                          | 30–40% (plausible)                   |
| Organizational meeting load | High (12–20% of day)            | Low (self-managed)                   |
| Process overhead            | High (PRs, reviews, ceremonies) | Low to moderate                      |
| Task self-selection         | Low (assigned tasks)            | High (choose favorable tasks for AI) |
| AI adoption quality         | Variable (org-wide rollout)     | High (personal optimization)         |
| Review discipline           | Varies                          | Personal accountability              |

This structural analysis supports the claim that independent consultants can legitimately experience 15–20% total time savings where employed developers see 5–10%.

---

## 9. Where AI Helps vs. Hurts

### Consistently Positive Impact

| Task Type                                   | Evidence Level | Approximate Gain |
| ------------------------------------------- | -------------- | ---------------- |
| Boilerplate / CRUD generation               | High           | 40–60% faster    |
| Unfamiliar API / library exploration        | High           | 30–50% faster    |
| Test scaffolding (unit tests)               | Medium-High    | 30–45% faster    |
| Documentation generation                    | Medium-High    | 30–50% faster    |
| Initial prototyping / proof-of-concept      | High           | 40–60% faster    |
| Developer onboarding (time to 10th PR)      | High           | ~50% faster      |
| Regex, data transformation, one-off scripts | High           | 40–70% faster    |

### Neutral to Negative Impact

| Task Type                                    | Evidence Level | Approximate Effect                  |
| -------------------------------------------- | -------------- | ----------------------------------- |
| Complex architectural decisions              | High           | 0% to −10%                          |
| Legacy codebase with internal libraries      | High           | −10% to −20%                        |
| Security-sensitive code                      | High           | Net negative (2.74× more vulns)     |
| Tasks requiring deep domain knowledge        | High           | 0% to −15%                          |
| Large-scale refactoring                      | Medium-High    | −5% to +5%                          |
| Debugging AI-generated code                  | High           | Net negative (45% report more time) |
| Complex bug investigation in large codebases | High (METR)    | −19% net                            |

### The Rule of Thumb

> AI tools accelerate **generation** of code in contexts with clear, bounded requirements and familiar technology. They slow down **comprehension** of existing complex systems and **judgment** about architectural correctness.

---

## 10. The Historical Analogy: Solow Paradox and the Internet

### The Solow Productivity Paradox (1987)

Robert Solow's observation: "You can see the computer age everywhere but in the productivity statistics." IT investments from the 1970s–1990s showed minimal measurable macroeconomic productivity gains for approximately 15 years before a late-1990s surge materialized.

### Timeline of the Internet's Productivity Impact

| Period    | Adoption                       | Measured Productivity Impact  |
| --------- | ------------------------------ | ----------------------------- |
| 1993–1997 | Early adoption                 | Negligible                    |
| 1998–2001 | Mass adoption                  | Beginning to register         |
| 2002–2007 | Integration & process redesign | Significant gains materialize |
| 2008+     | Full organizational redesign   | Structural productivity shift |

**Key insight:** The Internet's productivity impact required **organizational process redesign**, not just tool adoption. Companies that layered Internet access on top of existing processes gained little. Companies that redesigned processes around Internet capabilities gained enormously.

### Implications for AI Tools in 2025

The same pattern appears to be unfolding:

- **Tool adoption:** Near-universal (84–93%)
- **Process redesign:** Early stage; most orgs layered AI on existing workflows
- **Measured productivity:** Plateaued at ~10%
- **Prediction:** Gains may accelerate as organizations redesign workflows around AI capabilities (human-AI collaboration, AI-native development processes, automated review pipelines)

### Key Difference from the Internet

The Internet created new economic categories (e-commerce, SaaS, social media) that expanded the market. AI coding tools primarily **accelerate existing activity** — they don't obviously create new categories of software or development work. This suggests the productivity gains, once realized, will be competition-leveling rather than market-expanding for most practitioners.

---

## 11. Calibrated Estimates by Developer Profile

### Scenario Analysis

| Profile                                | Coding % of Time | AI Reduction (Realistic) | Net Total Savings | Confidence |
| -------------------------------------- | ---------------- | ------------------------ | ----------------- | ---------- |
| **Junior developer, simple tasks**     | 30%              | 35–45%                   | 10–14%            | 75%        |
| **Mid-level, mixed tasks**             | 25%              | 20–30%                   | 5–8%              | 80%        |
| **Senior developer, complex codebase** | 20%              | 0–15%                    | 0–3%              | 75%        |
| **Independent consultant, optimized**  | 35–40%           | 30–40%                   | 10–16%            | 70%        |
| **Startup / greenfield developer**     | 40–50%           | 40–50%                   | 16–25%            | 65%        |
| **Enterprise architect**               | 10–15%           | 10–20%                   | 1–3%              | 80%        |
| **Organizational average (all roles)** | 20–25%           | 15–25%                   | **~10%**          | **85%**    |

### Where the 20% Individual Claim Lands

A consultant claiming 20% total time savings requires:

- Coding actually comprising ~40% of their time (upper bound, plausible for solo practitioners)
- AI actually delivering ~50% coding reduction (upper bound, requires favorable task selection)
- No significant net cost from increased bugs, review overhead, or tech debt accumulation

This is an **achievable upper bound under optimized conditions**, not a typical expectation. Most practitioners with similar profiles will land at 10–15%.

---

## 12. Recommendations for Organizations

### For Engineering Leaders

1. **Do not use developer surveys to measure AI productivity.** Self-reported gains overstate actual gains by ~39 percentage points (METR). Measure output metrics: delivery frequency, lead time, defect rate, change failure rate (DORA).

2. **Monitor downstream costs.** Measure PR size trends, review time per PR, security vulnerability rates, and bug rates alongside velocity metrics. AI adoption often shifts work from generation to review without reducing total effort.

3. **Segment by task type.** AI delivers high ROI on boilerplate, tests, and documentation. It delivers negative ROI on complex codebase comprehension. Optimize tool usage accordingly.

4. **Process redesign is required for organizational gains.** Tool adoption alone delivers ~10% gains. Organizations redesigning workflows around AI capabilities (AI-in-the-loop code review, automated test generation pipelines, AI-assisted onboarding) will capture higher returns.

5. **Protect senior developer time from AI review overhead.** The Faros AI data shows AI increases PR volume by 98% while senior reviewers are a bottleneck. This is a net negative if not addressed structurally.

### For Independent Consultants

1. **Quantify actual gains, not perceived gains.** Track time-to-delivery on comparable tasks before and after AI adoption. The perception gap is real.

2. **Invest AI gains in quality, not just speed.** The most defensible productivity claim is "same output, higher quality" or "more features, same time" — not "same features, lower cost to client."

3. **Price based on value, not time.** If AI reduces time-to-delivery, time-based billing erodes your capture of productivity gains. Value-based pricing preserves the benefit.

4. **Account for maintenance cost.** AI-generated code accumulates technical debt faster. Factor future maintenance cost into project pricing.

### For Individual Developers

1. **Use AI where it provably helps.** Boilerplate, tests, docs, unfamiliar APIs — high confidence, measurable gains.

2. **Trust your expert judgment on complex problems.** METR shows experienced developers are slower with AI on complex tasks. The instinct to reach for AI first may be counterproductive on hard problems.

3. **Track your own data.** Use a simple time log to measure actual vs. perceived AI benefit over 30 days. Most developers are surprised by the results.

---

## 13. Sources & Methodology

### Source Tier Classification

- **Tier 1:** Peer-reviewed studies, randomized controlled trials, large-scale surveys with published methodology
- **Tier 2:** Vendor-funded studies, consulting firm research, industry surveys with disclosed methodology
- **Tier 3:** Aggregator sites, commentary, industry blogs

### Primary Sources

| #   | Title                                                                                                                                                                         | Year      | Tier | Key Contribution                                    |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---- | --------------------------------------------------- |
| 1   | [METR: Measuring Impact of Early-2025 AI on Developer Productivity](https://metr.org/blog/2025-07-10-early-2025-ai-experienced-os-dev-study/)                                 | 2025      | 1    | RCT on real OSS tasks; −19% finding; perception gap |
| 2   | [METR Study (arXiv preprint)](https://arxiv.org/abs/2507.09089)                                                                                                               | 2025      | 1    | Academic preprint of above                          |
| 3   | [GitHub: Quantifying Copilot's Impact](https://github.blog/news-insights/research/research-quantifying-github-copilots-impact-on-developer-productivity-and-happiness/)       | 2022–2024 | 2    | Origin of "55% faster" claim                        |
| 4   | [McKinsey: Unleashing Developer Productivity with GenAI](https://www.mckinsey.com/capabilities/tech-and-ai/our-insights/unleashing-developer-productivity-with-generative-ai) | 2023      | 2    | Complex task attenuation; junior developer slowdown |
| 5   | [Stack Overflow Developer Survey 2025 — AI Section](https://survey.stackoverflow.co/2025/ai)                                                                                  | 2025      | 1    | Large-scale developer sentiment; declining trust    |
| 6   | [JetBrains State of Developer Ecosystem 2025](https://blog.jetbrains.com/research/2025/10/state-of-developer-ecosystem-2025/)                                                 | 2025      | 2    | Self-reported time savings distribution             |
| 7   | [Microsoft Research: Time Warp Developer Productivity Study](https://www.microsoft.com/en-us/research/wp-content/uploads/2024/11/Time-Warp-Developer-Productivity-Study.pdf)  | 2024      | 1    | Actual time allocation: 11% coding                  |
| 8   | [InfoWorld: Developers Spend Most Time Not Coding (IDC)](https://www.infoworld.com/article/3831759/developers-spend-most-of-their-time-not-coding-idc-report.html)            | 2024      | 2    | SDLC time breakdown; 52 min/day coding              |
| 9   | [Brookings: Is Generative AI a Job Killer? Freelance Market Evidence](https://www.brookings.edu/articles/is-generative-ai-a-job-killer-evidence-from-the-freelance-market/)   | 2024      | 1    | Freelancer contract and earnings impact             |
| 10  | [AI Coding Productivity Paradox: 93% Adoption, 10% Gains](https://philippdubach.com/posts/93-of-developers-use-ai-coding-tools.-productivity-hasnt-moved./)                   | 2025      | 2    | Multi-source synthesis; 10% ceiling; Faros AI data  |
| 11  | [Stack Overflow Blog: Closing the AI Trust Gap](https://stackoverflow.blog/2026/02/18/closing-the-developer-ai-trust-gap/)                                                    | 2026      | 2    | 9% review overhead; 29% trust rate                  |
| 12  | [Stack Overflow Blog: AI Can 10x Developers in Creating Tech Debt](https://stackoverflow.blog/2026/01/23/ai-can-10x-developers-in-creating-tech-debt/)                        | 2026      | 2    | Craftsman vs. factory manager framing               |
| 13  | [ShiftMag: 93% Use AI, Productivity Still 10%](https://shiftmag.dev/this-cto-says-93-of-developers-use-ai-but-productivity-is-still-10-8013/)                                 | 2026      | 3    | Plateau observation; DX data                        |

### Methodology Notes

- This report synthesizes findings published through April 2026
- Where studies conflict, the higher-quality methodology (RCT > survey > lab study > vendor report) takes precedence
- Confidence levels reflect: sample size, methodology quality, funding source independence, replication status
- The METR RCT (2025) is weighted most heavily for complex real-world task estimates
- Self-reported developer survey data is treated as measuring _perception_, not _output_, based on the METR perception-reality gap finding

---

_Report generated: 2026-04-14 | Based on research conducted April 2026 | Data covers studies and surveys from 2023–2026_
