'use strict';

/**
 * Path containment shared by every reader of project-declared locations: the skill-protocol overlay
 * resolver and the knowledge base. Lexical containment (`isInside`) and on-disk containment that also
 * follows links (`isSafelyContainedOnDisk`), so a declared location can never lead outside its area.
 */

const fs = require('fs');
const path = require('path');

function isInside(parent, candidate) {
    const relative = path.relative(parent, candidate);
    return relative === '' || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
}

/**
 * Lexical and symlink containment for paths that may be read by an advisory reader.
 * Missing paths are allowed through so the caller's normal missing-file behavior can report
 * them; an existing path whose real target escapes the project or its declared root is refused.
 */
function isSafelyContainedOnDisk(projectDir, boundaryAbs, targetAbs) {
    const projectAbs = path.resolve(projectDir);
    if (!isInside(projectAbs, boundaryAbs) || !isInside(boundaryAbs, targetAbs)) return false;
    try {
        const projectReal = fs.realpathSync.native(projectAbs);
        let boundaryReal;
        try {
            boundaryReal = fs.realpathSync.native(boundaryAbs);
        } catch (error) {
            return error && error.code === 'ENOENT';
        }
        if (!isInside(projectReal, boundaryReal)) return false;
        let targetReal;
        try {
            targetReal = fs.realpathSync.native(targetAbs);
        } catch (error) {
            return error && error.code === 'ENOENT';
        }
        return isInside(projectReal, targetReal) && isInside(boundaryReal, targetReal);
    } catch {
        return false;
    }
}

module.exports = { isInside, isSafelyContainedOnDisk };
