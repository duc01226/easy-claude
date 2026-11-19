'use strict';

/**
 * Exit codes and typed errors for the voiceover CLI.
 * Mirrors html-export conventions: 0 ok, 1 runtime fault, 2 usage/input error, 3 missing dependency/provider.
 */
const EXIT = Object.freeze({
    OK: 0,
    ERROR: 1,
    USAGE: 2,
    DEPENDENCY: 3
});

class UsageError extends Error {
    constructor(message) {
        super(message);
        this.name = 'UsageError';
        this.exitCode = EXIT.USAGE;
    }
}

class DependencyError extends Error {
    constructor(message) {
        super(message);
        this.name = 'DependencyError';
        this.exitCode = EXIT.DEPENDENCY;
    }
}

module.exports = { EXIT, UsageError, DependencyError };
