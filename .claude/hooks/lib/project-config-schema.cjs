#!/usr/bin/env node
/**
 * Project Config Schema Validator
 *
 * Validates docs/project-config.json against the expected schema structure.
 * Prevents AI from accidentally changing the schema (adding/removing/renaming sections).
 *
 * Usage:
 *   const { validateConfig, SCHEMA } = require('./lib/project-config-schema.cjs');
 *   const result = validateConfig(config);
 *   // result = { valid: true, errors: [], warnings: [] }
 */
'use strict';

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DEFINITION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Schema definition using a simple type system.
 * Types: 'string', 'number', 'array', 'object', 'map', 'arrayOf'
 * 'map' = object with string keys and regex-string values (e.g., serviceMap)
 * 'arrayOf' = array of objects matching a sub-schema
 */
const SCHEMA = {
    _description: { type: 'string', required: false },
    schemaVersion: { type: 'number', required: false },
    project: {
        type: 'object',
        required: false,
        properties: {
            name: { type: 'string', required: true },
            description: { type: 'string', required: false },
            languages: { type: 'array', required: false },
            packageManagers: { type: 'array', required: false },
            monorepoTool: { type: 'string', required: false }
        }
    },
    backendServices: {
        type: 'object',
        required: false,
        deprecated: true,
        properties: {
            patterns: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegex: { type: 'string', required: true, isRegex: true },
                    description: { type: 'string', required: false }
                }
            },
            serviceMap: { type: 'map', required: true, valuesAreRegex: true },
            serviceRepositories: { type: 'map', required: true },
            serviceDomains: { type: 'map', required: true }
        }
    },
    frontendApps: {
        type: 'object',
        required: false,
        deprecated: true,
        properties: {
            patterns: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegex: { type: 'string', required: true, isRegex: true },
                    description: { type: 'string', required: false }
                }
            },
            appMap: { type: 'map', required: true, valuesAreRegex: true },
            legacyApps: { type: 'array', required: true },
            modernApps: { type: 'array', required: true },
            frontendRegex: { type: 'string', required: true, isRegex: true },
            sharedLibRegex: { type: 'string', required: true, isRegex: true }
        }
    },
    designSystem: {
        type: 'object',
        required: true,
        properties: {
            docsPath: { type: 'string', required: true },
            modernUiNote: { type: 'string', required: false },
            appMappings: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
                    docFile: { type: 'string', required: true },
                    description: { type: 'string', required: false },
                    quickTips: { type: 'array', required: false }
                }
            },
            canonicalDoc: { type: 'string', required: false },
            tokenFiles: { type: 'array', required: false }
        }
    },
    // Spec-system roots. Optional at the top level so existing project configs stay
    // valid, but every declared sub-object requires its `path` — a partially-declared
    // specRoots is a configuration error, not a permissive default.
    specRoots: {
        type: 'object',
        required: false,
        describe: 'Spec-system roots. Each declared sub-object requires its `path`; a\npartially-declared specRoots is a configuration error, not a default.',
        properties: {
            // `authorship` and `m1Policy` declare each tree's SEMANTICS, not just its
            // location: whether its content is hand-authored or generated, and whether
            // its prose may name technology (M1). The tech-spec skill cites both as the
            // basis for its M1 exemption, so they are declared here rather than left as
            // an unbacked claim in prose.
            business: {
                type: 'object',
                required: false,
                describe: 'Hand-authored business/feature spec tree (where /spec writes).',
                properties: {
                    path: { type: 'string', required: true, describe: 'Feature-spec dir, relative to repo root (e.g. "docs/specs").' },
                    authorship: { type: 'string', required: false, describe: 'Origin: "hand" (human-authored) for the business tree.' },
                    m1Policy: { type: 'string', required: false, describe: 'M1 prose policy: "strict" (no technology names in §1-7 prose).' }
                }
            },
            technical: {
                type: 'object',
                required: false,
                describe: 'Generated technical spec tree (projected from code/tests by /tech-spec; never hand-edited).',
                properties: {
                    path: { type: 'string', required: true, describe: 'Derived-view dir, relative to repo root (e.g. "docs/tech-specs").' },
                    authorship: { type: 'string', required: false, describe: 'Origin: "derived" (generated) for the technical tree.' },
                    m1Policy: { type: 'string', required: false, describe: 'M1 policy: "exempt" — naming code in a generated projection is the point, not a leak.' }
                }
            }
        }
    },
    // Free-text rationale for a DELIBERATE `techSpecScan` omission, so the absence
    // reads as a decision rather than an oversight to the next maintainer.
    _techSpecScanNote: { type: 'string', required: false, describe: 'Free-text rationale for a DELIBERATE techSpecScan omission, so the absence\nreads as a decision, not an oversight. Set this INSTEAD of techSpecScan when\nthe project has no spec-annotation convention.' },
    // How the tech-spec generator discovers annotated tests. Optional: a project whose
    // stack has no such annotation convention simply omits this, and the generator exits
    // non-zero naming the missing key rather than silently reporting zero annotations.
    //
    // CONTRACT — `annotationPattern` MUST expose exactly two capture groups, in order:
    //   group 1 = trait name, which MUST be `TestSpec` or `TechnicalSpec`
    //   group 2 = the spec id, which MUST be non-empty
    // The generator validates both at parse time and refuses to run on a mismatch. This
    // is enforced BEFORE any derived output is deleted — a pattern whose captures don't
    // match would otherwise fail only after the old output was already removed.
    techSpecScan: {
        type: 'object',
        required: false,
        describe: 'Enables /tech-spec generation — how it discovers annotated tests. Populate\nthis for any project that wants derived technical specs; omit it (and set\n_techSpecScanNote) ONLY if the stack has no spec-annotation convention.',
        properties: {
            sourceRoot: { type: 'string', required: true, describe: 'Primary source dir the generator scans, relative to repo root (e.g. "src").' },
            fileExtensions: { type: 'array', required: true, describe: 'Source-language extensions to scan (e.g. [".cs"] | [".ts"] | [".java"]).' },
            annotationPattern: { type: 'string', required: true, isRegex: true, describe: 'Regex matching THIS project\'s spec annotation. CONTRACT: exactly two capture\ngroups — group 1 = trait name (MUST be TestSpec or TechnicalSpec), group 2 =\nthe non-empty spec id. Validated at parse time; generator refuses on mismatch.' }
        }
    },
    scss: {
        type: 'object',
        required: false,
        deprecated: true,
        properties: {
            appMap: { type: 'map', required: true, valuesAreRegex: true },
            patterns: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
                    description: { type: 'string', required: false },
                    scssExamples: { type: 'array', required: false }
                }
            }
        }
    },
    componentFinder: {
        type: 'object',
        required: false,
        deprecated: true,
        properties: {
            selectorPrefixes: { type: 'array', required: true },
            layerClassification: { type: 'map', required: true }
        }
    },
    sharedNamespace: { type: 'string', required: false, deprecated: true },
    modules: {
        type: 'arrayOf',
        required: false,
        itemSchema: {
            name: { type: 'string', required: true },
            kind: { type: 'string', required: true },
            pathRegex: { type: 'string', required: true, isRegex: true },
            description: { type: 'string', required: false },
            tags: { type: 'array', required: false },
            meta: { type: 'object', required: false, freeform: true }
        }
    },
    contextGroups: {
        type: 'arrayOf',
        required: false,
        itemSchema: {
            name: { type: 'string', required: true },
            pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
            fileExtensions: { type: 'array', required: false },
            guideDoc: { type: 'string', required: false },
            patternsDoc: { type: 'string', required: false },
            stylingDoc: { type: 'string', required: false },
            designSystemDoc: { type: 'string', required: false },
            rules: { type: 'array', required: false }
        }
    },
    styling: {
        type: 'object',
        required: false,
        properties: {
            technology: { type: 'string', required: false },
            fileExtensions: { type: 'array', required: false },
            guideDoc: { type: 'string', required: false },
            appMap: { type: 'map', required: false, valuesAreRegex: true },
            patterns: {
                type: 'arrayOf',
                required: false,
                itemSchema: {
                    name: { type: 'string', required: true },
                    pathRegexes: { type: 'array', required: true, itemsAreRegex: true },
                    description: { type: 'string', required: false },
                    scssExamples: { type: 'array', required: false }
                }
            }
        }
    },
    componentSystem: {
        type: 'object',
        required: false,
        properties: {
            type: { type: 'string', required: false },
            selectorPrefixes: { type: 'array', required: false },
            filePattern: { type: 'string', required: false },
            layerClassification: { type: 'map', required: false }
        }
    },
    framework: {
        type: 'object',
        required: true,
        properties: {
            name: { type: 'string', required: true },
            backendPatternsDoc: { type: 'string', required: false },
            frontendPatternsDoc: { type: 'string', required: false },
            codeReviewDoc: { type: 'string', required: false },
            integrationTestDoc: { type: 'string', required: false },
            e2eTestDoc: { type: 'string', required: false },
            searchPatternKeywords: { type: 'array', required: false }
        }
    },
    testing: {
        type: 'object',
        required: false,
        properties: {
            frameworks: { type: 'array', required: false },
            filePatterns: { type: 'map', required: false },
            commands: { type: 'map', required: false },
            commandsNote: { type: 'string', required: false },
            coverageTool: { type: 'string', required: false },
            guideDoc: { type: 'string', required: false },
            integrationRules: { type: 'array', required: false, itemType: 'string' }
        }
    },
    e2eTesting: {
        type: 'object',
        required: false,
        properties: {
            framework: { type: 'string', required: false },
            language: { type: 'string', required: false },
            configFile: { type: 'string', required: false },
            platformProject: { type: 'string', required: false },
            sharedProject: { type: 'string', required: false },
            bddProject: { type: 'string', required: false },
            nonBddProject: { type: 'string', required: false },
            testsPath: { type: 'string', required: false },
            pageObjectsPath: { type: 'string', required: false },
            fixturesPath: { type: 'string', required: false },
            guideDoc: { type: 'string', required: false },
            configFiles: { type: 'array', required: false },
            testSpecsDocs: { type: 'array', required: false },
            searchPatterns: { type: 'array', required: false },
            runCommands: { type: 'map', required: false },
            tcCodeFormat: { type: 'string', required: false },
            featureAreas: { type: 'array', required: false },
            stats: { type: 'object', required: false, freeform: true },
            dependencies: { type: 'object', required: false, freeform: true },
            architecture: { type: 'object', required: false, freeform: true },
            bestPractices: { type: 'array', required: false },
            entryPoints: { type: 'array', required: false },
            execution: {
                type: 'object',
                required: false,
                describe: 'Optional E2E execution profile. Link surfaceIds to experienceVerification.surfaces; keep startup/readiness in each surface localRun recipe. Missing facts are discovered or reported ENVIRONMENT-BLOCKED, never invented.',
                properties: {
                    surfaceIds: { type: 'array', required: false, itemType: 'string', describe: 'IDs of observable surfaces exercised by E2E. Resolve lifecycle commands through the matching experienceVerification surface.' },
                    auth: {
                        type: 'object',
                        required: false,
                        describe: 'Authentication strategy. Store references only; never put passwords, tokens, cookies, or storage-state contents in project-config.json.',
                        properties: {
                            mode: { type: 'string', required: false, describe: 'One of fixture, storage-state, registration, manual, or none.' },
                            credentialsRef: { type: 'string', required: false, describe: 'Reference to a local fixture identity or secret-manager/env source; never the secret value.' },
                            storageStateRef: { type: 'string', required: false, describe: 'Reference/path to a project-owned browser storage-state artifact; never its JSON contents.' },
                            loginPath: { type: 'string', required: false, describe: 'Observed application login route when a real login journey is required.' },
                            registrationCommand: { type: 'string', required: false, describe: 'Project-owned registration/setup command only when the repository proves it is safe and repeatable; inline credential arguments are warned, so use environment or fixture references.' }
                        }
                    },
                    data: {
                        type: 'object',
                        required: false,
                        describe: 'Seed/reference-data strategy. Prefer idempotent or additive public-path setup and never reset shared state.',
                        properties: {
                            seedCommand: { type: 'string', required: false, describe: 'Project-defined seed or fixture command; missing capability blocks E2E rather than receiving a guessed command; inline credential arguments are warned, so use environment or fixture references.' },
                            workingDir: { type: 'string', required: false, describe: 'Project-relative directory for the seed command.' },
                            mode: { type: 'string', required: false, describe: 'One of reference-only, idempotent, or additive.' },
                            cleanupPolicy: { type: 'string', required: false, describe: 'Project-defined cleanup policy; cleanup may remove only current-run ephemeral data after evidence capture.' }
                        }
                    },
                    browser: {
                        type: 'object',
                        required: false,
                        describe: 'Browser runner and human-QC presentation settings. Readiness/actionability always precede pacing; headed human runs default to a deterministic 200–300ms action delay, while automation may explicitly use zero.',
                        properties: {
                            runner: { type: 'string', required: false, describe: 'Project-configured browser runner hint, such as playwright-cli; do not infer a dependency from this field alone.' },
                            engine: { type: 'string', required: false, describe: 'Project-configured browser engine or target, such as chromium.' },
                            headed: { type: 'boolean', required: false, describe: 'Whether the browser is visible to the user during human-QC execution.' },
                            actionDelayMs: { type: 'number', required: false, describe: 'Deterministic post-action presentation delay: zero for automation, otherwise normally 200–300ms; never a readiness substitute.' }
                        }
                    },
                    evidence: {
                        type: 'object',
                        required: false,
                        describe: 'Evidence capture and redaction settings. Captures are sensitive by default and must be read, redacted, and retained under a project-owned path.',
                        properties: {
                            root: { type: 'string', required: false, describe: 'Project-relative candidate-evidence root.' },
                            capture: { type: 'array', required: false, itemType: 'string', describe: 'Capture kinds: screenshot, console, requests, trace, or video.' },
                            redaction: { type: 'string', required: false, describe: 'Project-defined redaction rule/tool reference; never a secret value.' }
                        }
                    },
                    convergence: {
                        type: 'object',
                        required: false,
                        describe: 'Bounded verify/fix loop controls. A cap or missing capability produces an escalation, never an infinite retry.',
                        properties: {
                            maxAttempts: { type: 'number', required: false, describe: 'Positive bounded maximum remediation attempts.' },
                            consecutiveGreen: { type: 'number', required: false, describe: 'Fresh consecutive green runs required before convergence.' },
                            settleTimeoutSeconds: { type: 'number', required: false, describe: 'Positive bounded timeout for observable readiness/settle signals.' }
                        }
                    }
                }
            }
        }
    },
    experienceVerification: {
        type: 'object',
        required: false,
        describe: 'Optional evidence contract for user-facing or externally observable surfaces. Configure only what the project can actually run and inspect; missing capability is recorded as ENVIRONMENT-BLOCKED, never as a successful check.',
        properties: {
            enabled: { type: 'boolean', required: true, describe: 'Enable conditional experience-review routing for configured surfaces.' },
            evidenceRoot: { type: 'string', required: true, describe: 'Versioned report/candidate-evidence root, relative to the project.' },
            baselineRoot: { type: 'string', required: true, describe: 'Expected-baseline root, changed only through explicit acceptance outside automatic comparison.' },
            acceptancePolicy: { type: 'string', required: true, describe: 'Keep manual-acceptance-required unless the project documents a stricter named owner process.' },
            reviewOn: { type: 'array', required: false, itemType: 'string', describe: 'Impact triggers such as new-surface, changed-surface, bugfix, or baseline-mismatch.' },
            surfaces: {
                type: 'arrayOf',
                required: true,
                itemSchema: {
                    id: { type: 'string', required: true },
                    kind: { type: 'string', required: true },
                    runner: { type: 'string', required: true },
                    entryPoints: { type: 'array', required: true },
                    changeTriggers: { type: 'array', required: false },
                    fullCommand: { type: 'string', required: false },
                    focusedCommand: { type: 'string', required: false },
                    evidenceRoot: { type: 'string', required: false },
                    baselineRoot: { type: 'string', required: false },
                    states: { type: 'array', required: false },
                    localRun: {
                        type: 'object',
                        required: false,
                        describe: 'How this surface is brought up as a WHOLE running system on a developer machine, so a review can exercise it the way a person would instead of reading source. Record only commands the project actually has; a missing command is ENVIRONMENT-BLOCKED at review time, never an assumed default.',
                        properties: {
                            dependencyCommand: { type: 'string', required: false, describe: 'Command that starts the backing services this surface needs before the app itself (database, broker, cache, emulator, stub).' },
                            startCommand: { type: 'string', required: false, describe: 'Command that starts the surface itself. Long-running: the reviewer runs it in the background and tears it down afterwards.' },
                            workingDir: { type: 'string', required: false, describe: 'Directory the start/dependency commands run from, relative to the project root, when it is not the root.' },
                            readyCheck: { type: 'string', required: false, describe: 'Observable readiness signal — a health command/URL to poll or a log line to wait for. Readiness is polled, never assumed from a sleep or from process start.' },
                            readyTimeoutSeconds: { type: 'number', required: false, describe: 'How long readiness may take before the surface is recorded ENVIRONMENT-BLOCKED.' },
                            teardownCommand: { type: 'string', required: false, describe: 'Command that stops what startCommand/dependencyCommand started, so a review leaves no running process behind.' },
                            logSources: { type: 'array', required: false, itemType: 'string', describe: 'Runtime log channels to capture and read besides the surface itself — log file paths or container/service log commands. Browser console/page-error capture is inherent to a web surface and needs no entry.' },
                            credentialsRef: { type: 'string', required: false, describe: 'Pointer to the local fixture identity or credential source used to sign in (env var name, secret-manager key, setup doc). NEVER the secret value itself.' }
                        }
                    },
                    notes: { type: 'string', required: false }
                }
            },
            notApplicableReason: { type: 'string', required: false, describe: 'Evidence-backed reason when this repository has no applicable observable surface or the block is intentionally disabled.' }
        }
    },
    databases: { type: 'object', required: false, freeform: true },
    messaging: {
        type: 'object',
        required: false,
        properties: {
            broker: { type: 'string', required: false },
            patterns: { type: 'array', required: false },
            consumerConvention: { type: 'string', required: false }
        }
    },
    api: {
        type: 'object',
        required: false,
        properties: {
            style: { type: 'string', required: false },
            docsFormat: { type: 'string', required: false },
            docsPath: { type: 'string', required: false },
            authPattern: { type: 'string', required: false }
        }
    },
    infrastructure: {
        type: 'object',
        required: false,
        properties: {
            containerization: { type: 'string', required: false },
            orchestration: { type: 'string', required: false },
            cicd: {
                type: 'object',
                required: false,
                properties: {
                    tool: { type: 'string', required: false },
                    provider: { type: 'string', required: false },
                    configPath: { type: 'string', required: false },
                    environments: { type: 'array', required: false }
                }
            },
            iac: {
                type: 'object',
                required: false,
                properties: {
                    tool: { type: 'string', required: false },
                    configPath: { type: 'string', required: false }
                }
            }
        }
    },
    referenceDocs: {
        type: 'arrayOf',
        required: false,
        itemSchema: {
            filename: { type: 'string', required: true },
            purpose: { type: 'string', required: true },
            sections: { type: 'array', required: false },
            templatePath: { type: 'string', required: false }
        }
    },
    graphConnectors: {
        type: 'object',
        required: false,
        properties: {
            apiEndpoints: {
                type: 'object',
                required: false,
                properties: {
                    enabled: { type: 'boolean', required: false },
                    frontend: {
                        type: 'object',
                        required: false,
                        properties: {
                            framework: { type: 'string', required: true },
                            paths: { type: 'array', required: true },
                            customPatterns: { type: 'array', required: false }
                        }
                    },
                    backend: {
                        type: 'object',
                        required: false,
                        properties: {
                            framework: { type: 'string', required: true },
                            paths: { type: 'array', required: true },
                            routePrefix: { type: 'string', required: false },
                            customPatterns: { type: 'array', required: false }
                        }
                    }
                }
            },
            implicitConnections: {
                type: 'arrayOf',
                required: false,
                itemSchema: {
                    name: { type: 'string', required: true },
                    description: { type: 'string', required: false },
                    edgeKind: { type: 'string', required: true },
                    paths: { type: 'array', required: false },
                    source: {
                        type: 'object',
                        required: true,
                        properties: {
                            filePattern: { type: 'string', required: true },
                            contentPattern: { type: 'string', required: true },
                            keyGroup: { type: 'number', required: true }
                        }
                    },
                    target: {
                        type: 'object',
                        required: true,
                        properties: {
                            filePattern: { type: 'string', required: true },
                            contentPattern: { type: 'string', required: true },
                            keyGroup: { type: 'number', required: true }
                        }
                    },
                    matchBy: { type: 'string', required: true }
                }
            }
        }
    },
    architectureRules: {
        type: 'object',
        required: false,
        properties: {
            layerBoundaries: {
                type: 'arrayOf',
                required: false,
                itemSchema: {
                    layer: { type: 'string', required: true },
                    paths: { type: 'array', required: true },
                    cannotImportFrom: { type: 'array', required: true }
                }
            },
            excludePatterns: { type: 'array', required: false }
        }
    },
    codebaseHealth: {
        type: 'object',
        required: false,
        properties: {
            sourcePaths: { type: 'array', required: false },
            docPaths: { type: 'array', required: false },
            configPatterns: { type: 'array', required: false },
            excludePaths: { type: 'array', required: false }
        }
    },
    integrationTestVerify: {
        type: 'object',
        required: false,
        properties: {
            guidance: { type: 'string', required: false },
            referenceDocs: { type: 'array', required: false, itemType: 'string' },
            runScript: { type: 'string', required: false },
            startupScript: { type: 'string', required: false },
            quickRunCommand: { type: 'string', required: false },
            systemCheckCommand: { type: 'string', required: false },
            testProjectPattern: { type: 'string', required: false },
            testProjects: { type: 'array', required: false }
        }
    },
    workflowPatterns: {
        type: 'object',
        required: false,
        properties: {
            _description: { type: 'string', required: false },
            architectureStyle: { type: 'string', required: false },
            codeHierarchy: { type: 'string', required: false },
            cssMethodology: { type: 'string', required: false },
            stateManagement: { type: 'string', required: false },
            crossModuleValidation: { type: 'string', required: false },
            featureDocTemplate: { type: 'string', required: false },
            reviewRulesDoc: { type: 'string', required: false },
            docSyncGate: {
                type: 'object',
                required: false,
                properties: {
                    enforcedAreas: { type: 'array', required: false }
                }
            }
        }
    },
    localization: {
        type: 'object',
        required: false,
        properties: {
            enabled: { type: 'boolean', required: false },
            supportedLocales: { type: 'array', required: false },
            defaultLocale: { type: 'string', required: false },
            translationFilePatterns: { type: 'array', required: false, itemsAreRegex: true },
            uiPathPatterns: { type: 'array', required: false, itemsAreRegex: true }
        }
    },
    portability: {
        type: 'object',
        required: false,
        properties: {
            // false = keep a project-only CLAUDE.md/AGENTS.md; the agent-files bootstrap
            // gate then checks only existence, not universal-guides completeness. Default true.
            requireUniversalGuides: { type: 'boolean', required: false },
            // The root package.json `name` that marks this repo as carrying the framework's own
            // npm surface. Read by .claude/scripts/codex/tests/framework-repo.helper.mjs to decide
            // whether the framework-repo self-checks apply here; defaults to the upstream
            // 'easy-claude-tooling'. A project that VENDORS this framework and wires the standalone
            // runner into its own npm scripts MUST declare its package name here — otherwise the
            // guard resolves false and every self-check it gates skips silently while the suite
            // still reports green.
            toolingPackageName: { type: 'string', required: false }
        }
    },
    // Per-project skill frontmatter conventions consumed by
    // .claude/skills/skill-creator/scripts/validate-skills.cjs (Scan & Fix mode).
    // Keeps the reusable validator generic — projects declare their non-official
    // frontmatter fields here instead of editing the script.
    skillConventions: {
        type: 'object',
        required: false,
        properties: {
            _description: { type: 'string', required: false },
            conventionFields: { type: 'array', required: false, itemType: 'string' },
            removableFields: { type: 'array', required: false, itemType: 'string' },
            fieldFixes: { type: 'map', required: false }
        }
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// VALIDATION ENGINE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Validate a regex string. Returns null if valid, error string if invalid.
 */
function validateRegex(value, path) {
    try {
        new RegExp(value, 'i');
        return null;
    } catch (e) {
        return `${path}: invalid regex "${value}" — ${e.message}`;
    }
}

/**
 * Validate a value against a field schema.
 * @param {any} value - The value to validate
 * @param {object} fieldSchema - Schema definition for this field
 * @param {string} path - Dot-notation path for error messages
 * @param {string[]} errors - Accumulated errors
 * @param {string[]} warnings - Accumulated warnings
 */
function validateField(value, fieldSchema, path, errors, warnings) {
    // Check required
    if (value === undefined || value === null) {
        if (fieldSchema.required) {
            errors.push(`${path}: required field is missing`);
        }
        return;
    }

    // Emit deprecation warning (field is present but deprecated)
    if (fieldSchema.deprecated) {
        warnings.push(`${path}: DEPRECATED — this field will be removed in a future version`);
    }

    switch (fieldSchema.type) {
        case 'string':
            if (typeof value !== 'string') {
                errors.push(`${path}: expected string, got ${typeof value}`);
                return;
            }
            if (fieldSchema.isRegex) {
                const regexErr = validateRegex(value, path);
                if (regexErr) errors.push(regexErr);
            }
            break;

        case 'number':
            if (typeof value !== 'number') {
                errors.push(`${path}: expected number, got ${typeof value}`);
            }
            break;

        case 'boolean':
            if (typeof value !== 'boolean') {
                errors.push(`${path}: expected boolean, got ${typeof value}`);
            }
            break;

        case 'array':
            if (!Array.isArray(value)) {
                errors.push(`${path}: expected array, got ${typeof value}`);
                return;
            }
            if (fieldSchema.itemType) {
                value.forEach((item, i) => {
                    if (typeof item !== fieldSchema.itemType) {
                        errors.push(`${path}[${i}]: expected ${fieldSchema.itemType}, got ${typeof item}`);
                    }
                });
            }
            if (fieldSchema.itemsAreRegex) {
                value.forEach((item, i) => {
                    if (typeof item === 'string') {
                        const regexErr = validateRegex(item, `${path}[${i}]`);
                        if (regexErr) errors.push(regexErr);
                    }
                });
            }
            break;

        case 'object':
            if (typeof value !== 'object' || Array.isArray(value)) {
                errors.push(`${path}: expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
                return;
            }
            // Skip deep validation for freeform sections (e.g., custom, databases)
            if (fieldSchema.freeform) break;
            // Validate properties
            if (fieldSchema.properties) {
                // Check for required properties
                for (const [propName, propSchema] of Object.entries(fieldSchema.properties)) {
                    validateField(value[propName], propSchema, `${path}.${propName}`, errors, warnings);
                }
                // Warn about unknown top-level properties (but don't error — extensible)
                for (const key of Object.keys(value)) {
                    if (!fieldSchema.properties[key]) {
                        warnings.push(`${path}.${key}: unknown property (not in schema)`);
                    }
                }
            }
            break;

        case 'map':
            if (typeof value !== 'object' || Array.isArray(value)) {
                errors.push(`${path}: expected map (object), got ${Array.isArray(value) ? 'array' : typeof value}`);
                return;
            }
            if (fieldSchema.valuesAreRegex) {
                for (const [key, val] of Object.entries(value)) {
                    if (typeof val === 'string') {
                        const regexErr = validateRegex(val, `${path}.${key}`);
                        if (regexErr) errors.push(regexErr);
                    }
                }
            }
            break;

        case 'arrayOf':
            if (!Array.isArray(value)) {
                errors.push(`${path}: expected array, got ${typeof value}`);
                return;
            }
            if (fieldSchema.itemSchema) {
                value.forEach((item, i) => {
                    if (item === null || typeof item !== 'object' || Array.isArray(item)) {
                        errors.push(`${path}[${i}]: expected object item`);
                        return;
                    }
                    for (const [propName, propSchema] of Object.entries(fieldSchema.itemSchema)) {
                        validateField(item[propName], propSchema, `${path}[${i}].${propName}`, errors, warnings);
                    }
                });
            }
            break;

        default:
            warnings.push(`${path}: unknown schema type "${fieldSchema.type}"`);
    }
}

/**
 * Validate cross-field semantics that cannot be expressed by the structural
 * schema alone. In particular, an empty experience contract must explain why
 * it is disabled; otherwise setup reports can accidentally look like a live
 * verification decision.
 */
function validateExperienceVerificationSemantics(config, errors, warnings) {
    const experience = config.experienceVerification;
    if (experience === undefined || experience === null ||
        typeof experience !== 'object' || Array.isArray(experience)) return;

    if (typeof experience.enabled !== 'boolean' || !Array.isArray(experience.surfaces)) return;

    if (experience.enabled && experience.surfaces.length === 0) {
        errors.push('experienceVerification.surfaces: at least one observable surface is required when experienceVerification.enabled is true; disable it with an evidence-backed notApplicableReason until a surface exists');
    }

    if (!experience.enabled && experience.surfaces.length === 0 &&
        (typeof experience.notApplicableReason !== 'string' || experience.notApplicableReason.trim().length === 0)) {
        errors.push('experienceVerification.notApplicableReason: required when experienceVerification is disabled with no surfaces; provide an evidence-backed NOT-APPLICABLE or pending-capability reason');
    }

    if (!experience.enabled && experience.surfaces.length > 0) {
        warnings.push('experienceVerification: surfaces are configured while the contract is disabled; conditional experience review routing is off until enabled');
    }

    experience.surfaces.forEach((surface, index) => {
        const credentialsRef = surface && surface.localRun && surface.localRun.credentialsRef;
        if (typeof credentialsRef === 'string' && appearsToContainSecretLiteral(credentialsRef)) {
            warnings.push(`experienceVerification.surfaces[${index}].localRun.credentialsRef: appears to contain a credential/token literal; store a reference, not the secret value`);
        }
    });
}

const E2E_AUTH_MODES = new Set(['fixture', 'storage-state', 'registration', 'manual', 'none']);
const E2E_DATA_MODES = new Set(['reference-only', 'idempotent', 'additive']);
const E2E_CAPTURE_KINDS = new Set(['screenshot', 'console', 'requests', 'trace', 'video']);

function isAbsoluteProjectPath(value) {
    return value.startsWith('/') || value.startsWith('\\') || /^[A-Za-z]:[\\/]/.test(value) || value.split(/[\\/]/).includes('..');
}

function appearsToContainSecretLiteral(value) {
    return /\b(?:bearer|basic)\s+[A-Za-z0-9+/=_-]{12,}/i.test(value) ||
        /\b(?:password|passwd|token|secret|cookie)\s*[:=]/i.test(value) ||
        /(?:^|\s)--?(?:password|passwd|token|secret|cookie)(?:[-_a-z]*)\s+(?!\$\{?[\w-]+\}?|%[\w-]+%|(?:env|secret|fixture):)[^\s]+/i.test(value) ||
        /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(value);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function validateE2eExecutionSemantics(config, errors, warnings) {
    const e2e = config.e2eTesting;
    if (e2e === undefined || e2e === null || typeof e2e !== 'object' || Array.isArray(e2e)) return;

    const execution = e2e.execution;
    if (execution === undefined || execution === null || typeof execution !== 'object' || Array.isArray(execution)) return;

    const pathFields = [
        ['e2eTesting.execution.data.workingDir', execution.data && execution.data.workingDir],
        ['e2eTesting.execution.evidence.root', execution.evidence && execution.evidence.root]
    ];
    for (const [path, value] of pathFields) {
        if (typeof value === 'string' && isAbsoluteProjectPath(value)) {
            errors.push(`${path}: must be a project-relative path without parent traversal`);
        }
    }

    const auth = execution.auth;
    if (auth && typeof auth === 'object' && !Array.isArray(auth)) {
        if (typeof auth.mode === 'string' && !E2E_AUTH_MODES.has(auth.mode)) {
            errors.push(`e2eTesting.execution.auth.mode: unsupported mode "${auth.mode}"; expected one of ${Array.from(E2E_AUTH_MODES).join(', ')}`);
        }
        for (const field of ['credentialsRef', 'storageStateRef']) {
            if (typeof auth[field] === 'string' && appearsToContainSecretLiteral(auth[field])) {
                warnings.push(`e2eTesting.execution.auth.${field}: appears to contain a credential/token literal; store a reference, not the secret value`);
            }
        }
        if (auth.mode === 'fixture' && !isNonEmptyString(auth.credentialsRef)) {
            warnings.push('e2eTesting.execution.auth.credentialsRef: required before a fixture-authenticated run can be APPLICABLE');
        }
        if (auth.mode === 'storage-state' && !isNonEmptyString(auth.storageStateRef)) {
            warnings.push('e2eTesting.execution.auth.storageStateRef: required before a storage-state-authenticated run can be APPLICABLE');
        }
        if (auth.mode === 'registration' && !isNonEmptyString(auth.registrationCommand)) {
            warnings.push('e2eTesting.execution.auth.registrationCommand: required before a registration-authenticated run can be APPLICABLE');
        }
    }

    const data = execution.data;
    if (data && typeof data === 'object' && !Array.isArray(data) &&
        typeof data.mode === 'string' && !E2E_DATA_MODES.has(data.mode)) {
        errors.push(`e2eTesting.execution.data.mode: unsupported mode "${data.mode}"; expected one of ${Array.from(E2E_DATA_MODES).join(', ')}`);
    }
    if (data && typeof data === 'object' && !Array.isArray(data) &&
        ['idempotent', 'additive'].includes(data.mode) && !isNonEmptyString(data.seedCommand)) {
        warnings.push('e2eTesting.execution.data.seedCommand: required before an idempotent/additive data run can be APPLICABLE');
    }
    for (const [path, value] of [
        ['e2eTesting.execution.auth.registrationCommand', auth && auth.registrationCommand],
        ['e2eTesting.execution.data.seedCommand', data && data.seedCommand]
    ]) {
        if (typeof value === 'string' && appearsToContainSecretLiteral(value)) {
            warnings.push(`${path}: appears to contain a credential/token literal; use an environment, fixture, or secret-manager reference instead of an inline value`);
        }
    }

    const browser = execution.browser;
    if (browser && typeof browser === 'object' && !Array.isArray(browser)) {
        if (typeof browser.actionDelayMs === 'number') {
            if (!Number.isFinite(browser.actionDelayMs) || !Number.isInteger(browser.actionDelayMs) || browser.actionDelayMs < 0 || browser.actionDelayMs > 2000) {
                errors.push('e2eTesting.execution.browser.actionDelayMs: expected an integer from 0 through 2000');
            } else if (browser.actionDelayMs !== 0 && (browser.actionDelayMs < 200 || browser.actionDelayMs > 300)) {
                warnings.push('e2eTesting.execution.browser.actionDelayMs: human-QC pacing is normally 200–300ms; this value is outside that guidance and is never a readiness signal');
            }
        }
        if (browser.headed === true && browser.actionDelayMs === 0) {
            warnings.push('e2eTesting.execution.browser.actionDelayMs: visible human-QC runs normally use 200–300ms; zero is intended for automation');
        }
    }

    const evidence = execution.evidence;
    if (evidence && typeof evidence === 'object' && !Array.isArray(evidence)) {
        if (Array.isArray(evidence.capture)) {
            evidence.capture.forEach((kind, index) => {
                if (typeof kind === 'string' && !E2E_CAPTURE_KINDS.has(kind)) {
                    errors.push(`e2eTesting.execution.evidence.capture[${index}]: unsupported capture "${kind}"; expected one of ${Array.from(E2E_CAPTURE_KINDS).join(', ')}`);
                }
            });
            if (evidence.capture.some(kind => E2E_CAPTURE_KINDS.has(kind)) && !isNonEmptyString(evidence.redaction)) {
                warnings.push('e2eTesting.execution.evidence.redaction: configure redaction before persisting screenshot, console, request, trace, or video evidence');
            }
        }
    }

    const convergence = execution.convergence;
    if (convergence && typeof convergence === 'object' && !Array.isArray(convergence)) {
        const bounds = [
            ['maxAttempts', convergence.maxAttempts, 1, 10],
            ['consecutiveGreen', convergence.consecutiveGreen, 1, 5],
            ['settleTimeoutSeconds', convergence.settleTimeoutSeconds, 1, 600]
        ];
        for (const [field, value, min, max] of bounds) {
            if (value !== undefined && (!Number.isFinite(value) || !Number.isInteger(value) || value < min || value > max)) {
                errors.push(`e2eTesting.execution.convergence.${field}: expected an integer from ${min} through ${max}`);
            }
        }
        if (typeof convergence.maxAttempts === 'number' && typeof convergence.consecutiveGreen === 'number' && convergence.consecutiveGreen > convergence.maxAttempts) {
            errors.push('e2eTesting.execution.convergence.consecutiveGreen: cannot exceed convergence.maxAttempts');
        }
    }

    if (Array.isArray(execution.surfaceIds)) {
        const surfaces = config.experienceVerification && Array.isArray(config.experienceVerification.surfaces)
            ? config.experienceVerification.surfaces
            : [];
        const knownIds = new Set(surfaces.filter(surface => surface && typeof surface.id === 'string').map(surface => surface.id));
        execution.surfaceIds.forEach((surfaceId, index) => {
            if (typeof surfaceId === 'string' && !knownIds.has(surfaceId)) {
                warnings.push(`e2eTesting.execution.surfaceIds[${index}]: no matching experienceVerification.surfaces[].id; setup must discover or configure the surface before E2E can be APPLICABLE`);
            }
        });
    }
}

/**
 * Validate a config object against the schema.
 * @param {object} config - The parsed project-config.json
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateConfig(config) {
    const errors = [];
    const warnings = [];

    if (!config || typeof config !== 'object') {
        return {
            valid: false,
            errors: ['Config must be a non-null object'],
            warnings: []
        };
    }

    // Validate each top-level section
    for (const [key, fieldSchema] of Object.entries(SCHEMA)) {
        validateField(config[key], fieldSchema, key, errors, warnings);
    }

    validateExperienceVerificationSemantics(config, errors, warnings);
    validateE2eExecutionSemantics(config, errors, warnings);

    // Check for unknown top-level keys
    const knownKeys = new Set(Object.keys(SCHEMA));
    for (const key of Object.keys(config)) {
        if (!knownKeys.has(key)) {
            warnings.push(`${key}: unknown top-level key (not in schema)`);
        }
    }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Get list of required top-level sections.
 * @returns {string[]}
 */
function getRequiredSections() {
    return Object.entries(SCHEMA)
        .filter(([_, schema]) => schema.required || (schema.type === 'object' && schema.required !== false))
        .map(([key]) => key);
}

/**
 * Format validation result as a readable string.
 * @param {{ valid: boolean, errors: string[], warnings: string[] }} result
 * @returns {string}
 */
function formatResult(result) {
    const lines = [];
    if (result.valid) {
        lines.push('Schema validation: PASSED');
    } else {
        lines.push('Schema validation: FAILED');
        lines.push('');
        lines.push('Errors:');
        for (const err of result.errors) {
            lines.push(`  - ${err}`);
        }
    }
    if (result.warnings.length > 0) {
        lines.push('');
        lines.push('Warnings:');
        for (const warn of result.warnings) {
            lines.push(`  - ${warn}`);
        }
    }
    return lines.join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════
// SCHEMA DESCRIPTION (for AI consumption)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate an example item object from an arrayOf itemSchema.
 * Shows exact field names with type and required/optional markers.
 */
function generateExampleItem(itemSchema) {
    const obj = {};
    for (const [field, def] of Object.entries(itemSchema)) {
        const req = def.required ? 'required' : 'optional';
        if (def.type === 'string') {
            obj[field] = def.isRegex ? `<regex> (${req})` : `<string> (${req})`;
        } else if (def.type === 'number') {
            obj[field] = `<number> (${req})`;
        } else if (def.type === 'array') {
            obj[field] = def.itemsAreRegex ? [`<regex> (${req})`] : [`<string> (${req})`];
        } else if (def.type === 'object') {
            obj[field] = `<object> (${req})`;
        } else {
            obj[field] = `<${def.type}> (${req})`;
        }
    }
    return obj;
}

/**
 * Describe a single schema field, appending lines to the output array.
 * @param {string} name - Field name
 * @param {object} schema - Field schema definition
 * @param {number} depth - Indentation depth
 * @param {string[]} lines - Output lines array
 */
/**
 * Emit a field's optional `describe` note as indented `#` comment lines, so
 * `--describe` teaches the authoring AI what a field is FOR and how to derive
 * its value — not just its name/type. Kept out of validation: `describe` is
 * emitter-only metadata on the schema field def, never validated against config.
 * @param {object} schema - Field schema definition (may carry `describe`)
 * @param {number} depth - Indentation depth for the comment lines
 * @param {string[]} lines - Output lines array
 */
function emitDescribe(schema, depth, lines) {
    if (!schema.describe) return;
    const indent = '  '.repeat(depth);
    for (const line of String(schema.describe).split('\n')) {
        lines.push(`${indent}# ${line}`);
    }
}

function describeField(name, schema, depth, lines) {
    const indent = '  '.repeat(depth);
    const depr = schema.deprecated ? ' [DEPRECATED]' : '';
    const req = schema.required ? 'required' : 'optional';

    if (schema.type === 'string' || schema.type === 'number' || schema.type === 'boolean') {
        const extra = schema.isRegex ? ', regex' : '';
        lines.push(`${indent}${name} (${schema.type}, ${req}${extra})${depr}`);
        emitDescribe(schema, depth + 1, lines);
    } else if (schema.type === 'array') {
        const extra = schema.itemsAreRegex ? ' of regexes' : schema.itemType ? ` of ${schema.itemType}s` : '';
        lines.push(`${indent}${name} (array${extra}, ${req})${depr}`);
        emitDescribe(schema, depth + 1, lines);
    } else if (schema.type === 'map') {
        const extra = schema.valuesAreRegex ? ', values are regexes' : '';
        lines.push(`${indent}${name} (map${extra}, ${req})${depr}`);
        emitDescribe(schema, depth + 1, lines);
    } else if (schema.type === 'object') {
        lines.push(`${indent}${name} (object, ${req})${depr}`);
        emitDescribe(schema, depth + 1, lines);
        if (!schema.freeform && schema.properties) {
            for (const [prop, propSchema] of Object.entries(schema.properties)) {
                describeField(prop, propSchema, depth + 1, lines);
            }
        }
    } else if (schema.type === 'arrayOf') {
        lines.push(`${indent}${name} (array of objects, ${req})${depr} — each item:`);
        emitDescribe(schema, depth + 1, lines);
        if (schema.itemSchema) {
            const example = generateExampleItem(schema.itemSchema);
            const json = JSON.stringify(example, null, 2);
            for (const line of json.split('\n')) {
                lines.push(`${indent}  ${line}`);
            }
        }
    }
}

/**
 * Generate human-readable schema description with example JSON shapes.
 * Use this output to ensure AI generates correct field names.
 * @returns {string} Schema documentation suitable for AI consumption
 */
function describeSchema() {
    const lines = ['# project-config.json Schema Reference', ''];
    for (const [key, fieldSchema] of Object.entries(SCHEMA)) {
        if (key === '_description') continue;
        describeField(key, fieldSchema, 0, lines);
        lines.push('');
    }
    return lines.join('\n');
}

module.exports = {
    SCHEMA,
    validateConfig,
    getRequiredSections,
    formatResult,
    validateRegex,
    describeSchema
};

// ═══════════════════════════════════════════════════════════════════════════
// CLI ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

if (require.main === module) {
    const args = process.argv.slice(2);
    if (args.includes('--describe')) {
        console.log(describeSchema());
    } else if (args.includes('--validate')) {
        const fs = require('fs');
        const idx = args.indexOf('--validate');
        const configPath = args[idx + 1] || 'docs/project-config.json';
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const result = validateConfig(config);
            console.log(formatResult(result));
            process.exit(result.valid ? 0 : 1);
        } catch (e) {
            console.error('Failed: ' + e.message);
            process.exit(1);
        }
    } else {
        console.log('Usage: --describe | --validate [path]');
    }
}
