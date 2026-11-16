'use strict';

/**
 * Simulated file IDs above 2^53, the way an NTFS volume reports them.
 *
 * NTFS keeps a 16-bit sequence number in the top bits of a 64-bit file ID, so real IDs
 * routinely exceed Number.MAX_SAFE_INTEGER. Node reports `ino` as a bigint when a stat is
 * taken with `{ bigint: true }` and as the double nearest to it otherwise. This helper
 * reproduces exactly that: Number-mode stats get `Number(id)`, bigint-mode stats get `id`.
 * Two IDs one apart (`LARGE_FILE_ID`, `LARGE_FILE_ID + 1n`) are different files, yet their
 * Number forms are equal — the case an identity guard must still reject.
 */

const LARGE_FILE_ID = 2n ** 60n + 2n;

/**
 * Run `run` while `fsModule.statSync`, `lstatSync` and `fstatSync` report the file ID that
 * `pick(method, target)` returns (a bigint), or the real one when it returns undefined.
 * Every stub forwards the caller's options, so bigint and Number modes stay distinct.
 * Restores the native functions afterwards, also when `run` throws or rejects.
 */
function withLargeFileIds(fsModule, pick, run) {
    const native = {};
    for (const method of ['statSync', 'lstatSync', 'fstatSync']) {
        native[method] = fsModule[method];
        fsModule[method] = (target, ...args) => {
            const stat = native[method].call(fsModule, target, ...args);
            const id = stat ? pick(method, target) : undefined;
            if (id !== undefined) stat.ino = typeof stat.ino === 'bigint' ? id : Number(id);
            return stat;
        };
    }
    const restore = () => Object.assign(fsModule, native);
    let result;
    try { result = run(); } catch (error) { restore(); throw error; }
    if (result && typeof result.then === 'function') return result.finally(restore);
    restore();
    return result;
}

module.exports = { LARGE_FILE_ID, withLargeFileIds };
