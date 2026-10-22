'use strict';

// Router switches (commitSkillRoute, judgementIntegrityRoute, aiFeatureRoute, qualitySkillReminder,
// corePrinciplesInject) read one layered setting. Intent: a team value survives a framework update
// (it lives in the project config, not the framework-shipped .claude/.ck.json), and each person can
// override it for every project or for one checkout.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { assertEqual, assertTrue } = require('../lib/assertions.cjs');

const PROJECT_DIR = process.env.CLAUDE_PROJECT_DIR;
const utils = require(path.join(PROJECT_DIR, '.claude', 'hooks', 'lib', 'prompt-route-utils.cjs'));

function fixture() {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'router-layers-'));
    const project = path.join(dir, 'project');
    const home = path.join(dir, 'home');
    const write = (file, value) => {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, JSON.stringify(value));
    };
    const files = {
        shipped: path.join(project, '.claude', '.ck.json'),
        team: path.join(project, 'docs', 'project-config.json'),
        personal: path.join(home, '.claude', '.ck.json'),
        checkout: path.join(project, '.claude', '.ck.local.json')
    };
    const enabled = () => utils.isRouterEnabled('commitSkillRoute', 'CK_COMMIT_SKILL_ROUTE', { env: {}, projectDir: project, homeDir: home });
    return { dir, project, home, write, files, enabled, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

module.exports = {
    name: 'router-settings-layers',
    tests: [
        {
            name: '[router-settings-layers] a team switch in the project config beats the framework-shipped default',
            fn: () => {
                const f = fixture();
                try {
                    assertTrue(f.enabled(), 'on with no settings at all');
                    f.write(f.files.shipped, { commitSkillRoute: { enabled: true } });
                    f.write(f.files.team, { project: { name: 'Fixture' }, commitSkillRoute: { enabled: false } });
                    assertEqual(f.enabled(), false, 'the team layer outranks the shipped file a framework update replaces');
                } finally { f.cleanup(); }
            }
        },
        {
            name: '[router-settings-layers] a personal home value beats the team, and the checkout file beats both',
            fn: () => {
                const f = fixture();
                try {
                    f.write(f.files.team, { project: { name: 'Fixture' }, commitSkillRoute: { enabled: false } });
                    f.write(f.files.personal, { commitSkillRoute: { enabled: true } });
                    assertEqual(f.enabled(), true, 'a person turns the team default back on in ~/.claude/.ck.json');
                    f.write(f.files.checkout, { commitSkillRoute: { enabled: false } });
                    assertEqual(f.enabled(), false, 'the checkout file wins last');
                    assertEqual(utils.isRouterEnabled('commitSkillRoute', 'CK_COMMIT_SKILL_ROUTE', { env: { CK_COMMIT_SKILL_ROUTE: '0' }, projectDir: f.project, homeDir: f.home, rawSettings: { enabled: true } }), false,
                        'the environment switch still turns it off');
                } finally { f.cleanup(); }
            }
        },
        {
            name: '[router-settings-layers] settings merge per key, so a later layer that names one key keeps the others',
            fn: () => {
                const f = fixture();
                try {
                    f.write(f.files.team, { project: { name: 'Fixture' }, corePrinciplesInject: { reinjectAfterTokens: 300000 } });
                    f.write(f.files.personal, { corePrinciplesInject: { enabled: false } });
                    const merged = utils.loadRouterSettings(f.project, 'corePrinciplesInject', { homeDir: f.home });
                    assertEqual(JSON.stringify(merged), JSON.stringify({ reinjectAfterTokens: 300000, enabled: false }));
                } finally { f.cleanup(); }
            }
        }
    ]
};
