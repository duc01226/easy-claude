#!/usr/bin/env node
'use strict';

/**
 * Workflow catalog injection for UserPromptSubmit: the second output of the workflow route.
 * `workflow-route-inject.cjs` owns both outputs and delivers the gate; this file exists because a host
 * cuts any single hook output above its cap, so the catalog needs an output of its own to keep its
 * compact form whatever the gate's length.
 */
require('./workflow-route-inject.cjs').runHook('catalog');
