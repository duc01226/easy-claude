/**
 * Live-source listing (`../lib/live-source-files.cjs`) used by the "no live source names …" scans and
 * the portable-paths scan. Intent: inside the project's own git work tree those scans read only what
 * git lists — tracked plus untracked-not-ignored — so an ignored folder such as another session's
 * worktree under `.claude/worktrees/` can never fail them, while a new file still counts before it is
 * committed. Without that work tree the folder walk they always used still applies.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const assert = require('assert/strict');
const { liveSourceFiles } = require('../lib/live-source-files.cjs');

const gitAvailable = spawnSync('git', ['--version'], { encoding: 'utf8' }).status === 0;
const NO_GIT = gitAvailable ? false : 'git is not on PATH';

/** A temp folder with git isolated from the machine's system and user config. */
function makeRoot() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'live-source-'));
    const env = {
        ...process.env,
        HOME: root, USERPROFILE: root, TMPDIR: root, TEMP: root, TMP: root,
        GIT_CONFIG_NOSYSTEM: '1', GIT_CONFIG_GLOBAL: path.join(root, 'no-gitconfig')
    };
    return { root, env };
}

function write(dir, rel, text = 'fixture\n') {
    const file = path.join(dir, ...rel.split('/'));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, text);
}

function git(dir, env, args) {
    const result = spawnSync('git', args, { cwd: dir, env, encoding: 'utf8', timeout: 15000 });
    if (result.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${result.stderr || result.error}`);
}

function commitAll(dir, env) {
    git(dir, env, ['add', '-A']);
    git(dir, env, ['-c', 'user.email=fixture@example.invalid', '-c', 'user.name=fixture', '-c', 'commit.gpgsign=false', 'commit', '-q', '-m', 'fixture']);
}

/** The project layout every case scans: what must count, and what each rule must keep out. */
function writeProject(dir) {
    write(dir, '.claude/.gitignore', '/worktrees/\n');
    write(dir, '.claude/skills/demo/SKILL.md');                          // tracked: counts
    write(dir, '.claude/skills/demo/gone.md');                           // tracked, deleted below
    write(dir, '.claude/skills/demo/run.py');                            // wrong extension for the caller
    write(dir, '.claude/skills/demo/node_modules/dep.md');               // caller-excluded folder name
    write(dir, '.claude/worktrees/other/.claude/skills/demo/SKILL.md');  // another session's worktree
    write(dir, 'README.md');                                             // a single-file root
}

const MD = { extensions: new Set(['.md']), excludedDirs: new Set(['node_modules']) };
const sorted = iterable => [...iterable].sort();

const tests = [
    {
        name: '[live-source-files] inside its own work tree an ignored worktree is never listed, while tracked and new untracked files are',
        skip: NO_GIT,
        fn: () => {
            // Given a git project whose .claude/.gitignore ignores /worktrees/, with a new untracked file.
            const { root, env } = makeRoot();
            try {
                const project = path.join(root, 'project');
                writeProject(project);
                git(project, env, ['init', '-q']);
                commitAll(project, env);
                fs.rmSync(path.join(project, '.claude', 'skills', 'demo', 'gone.md'));
                write(project, '.claude/skills/demo/new.md');

                // When the .claude root and a single-file root are listed.
                const claude = sorted(liveSourceFiles(project, '.claude', { ...MD, env }));
                const readme = sorted(liveSourceFiles(project, 'README.md', { ...MD, env }));

                // Then only live, in-scope Markdown counts: the worktree copy, the deleted file, the
                // excluded folder and the other extension stay out; the uncommitted file is in.
                assert.deepEqual(claude, ['.claude/skills/demo/SKILL.md', '.claude/skills/demo/new.md']);
                assert.deepEqual(readme, ['README.md']);
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        }
    },
    {
        name: '[live-source-files] outside a work tree the folder walk is used, with the caller excluded folders and extensions',
        fn: () => {
            // Given the same layout with no git repository (an exported bundle).
            const { root, env } = makeRoot();
            try {
                const project = path.join(root, 'project');
                writeProject(project);

                // When the .claude root is listed.
                const claude = sorted(liveSourceFiles(project, '.claude', { ...MD, env }));

                // Then the walk applies the caller's rules but cannot know ignore files, so the worktree
                // copy is listed: the git listing above is what keeps it out.
                assert.deepEqual(claude, [
                    '.claude/skills/demo/SKILL.md',
                    '.claude/skills/demo/gone.md',
                    '.claude/worktrees/other/.claude/skills/demo/SKILL.md'
                ]);
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        }
    },
    {
        name: '[live-source-files] a copy inside another checkout\'s ignored folder is walked, never answered by the outer checkout',
        skip: NO_GIT,
        fn: () => {
            // Given an outer git checkout that ignores tmp/, and the project copied inside tmp/.
            const { root, env } = makeRoot();
            try {
                write(root, 'outer/.gitignore', '/tmp/\n');
                write(root, 'outer/notes.md');
                git(path.join(root, 'outer'), env, ['init', '-q']);
                commitAll(path.join(root, 'outer'), env);
                const project = path.join(root, 'outer', 'tmp', 'project');
                writeProject(project);

                // When the copy's .claude root is listed.
                const claude = sorted(liveSourceFiles(project, '.claude', { ...MD, env }));

                // Then git, which lists nothing of an ignored folder, is not consulted: the walk finds the files.
                assert.ok(claude.includes('.claude/skills/demo/SKILL.md'), `the copy's own files must be scanned; got ${JSON.stringify(claude)}`);
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        }
    },
    {
        name: '[live-source-files] skipSymlinks keeps a linked file out of both the git listing and the walk',
        skip: NO_GIT,
        fn: () => {
            // Given a tracked symbolic link next to a real file. Windows without the symlink privilege
            // refuses to create one (EPERM): the case is skipped there with a logged reason.
            const { root, env } = makeRoot();
            try {
                const project = path.join(root, 'project');
                write(project, 'docs/real.md');
                try {
                    fs.symlinkSync('real.md', path.join(project, 'docs', 'link.md'));
                } catch (error) {
                    if (error.code === 'EPERM' || error.code === 'EACCES') {
                        console.log(`  [live-source-files] symlink case skipped: ${error.code} creating a symlink on this OS`);
                        return;
                    }
                    throw error;
                }
                const options = { extensions: null, excludedDirs: new Set(), skipSymlinks: true, env };
                const walked = sorted(liveSourceFiles(project, 'docs', options));
                git(project, env, ['init', '-q']);
                commitAll(project, env);
                const listed = sorted(liveSourceFiles(project, 'docs', options));

                // Then both paths list the real file only.
                assert.deepEqual(walked, ['docs/real.md']);
                assert.deepEqual(listed, ['docs/real.md']);
            } finally {
                fs.rmSync(root, { recursive: true, force: true });
            }
        }
    }
];

module.exports = { name: 'live-source-files', tests };
