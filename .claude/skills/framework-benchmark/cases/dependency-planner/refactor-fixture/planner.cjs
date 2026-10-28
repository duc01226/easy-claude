'use strict';

function formatOrder(ids) {
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new TypeError('Expected an array of IDs');
    return ids.join(' -> ');
}

// Intentionally cohesive but monolithic fictional baseline; both arms receive these exact bytes.
function createPlanner(tasks = []) {
    const fail = code => { throw Object.assign(new Error(code), { code }); };
    const validId = id => typeof id === 'string' && /^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(id);
    if (!Array.isArray(tasks)) fail('INVALID_TASK');
    let records = [];
    const check = rows => {
        const normalized = [];
        for (const task of rows) {
            if (!task || typeof task !== 'object' || Array.isArray(task) || !validId(task.id) || (task.requires !== undefined && !Array.isArray(task.requires))) fail('INVALID_TASK');
            const requires = task.requires === undefined ? [] : [...task.requires];
            if (requires.some(id => !validId(id))) fail('INVALID_TASK');
            if (normalized.some(row => row.id === task.id) || new Set(requires).size !== requires.length) fail('DUPLICATE_TASK');
            normalized.push({ id: task.id, requires: requires.sort() });
        }
        const ids = new Set(normalized.map(task => task.id));
        for (const row of normalized) {
            if (row.requires.includes(row.id)) fail('CYCLE');
            if (row.requires.some(id => !ids.has(id))) fail('UNKNOWN_TASK');
        }
        const pending = new Map(normalized.map(row => [row.id, new Set(row.requires)]));
        while (pending.size) {
            const ready = [...pending].filter(([, dependencies]) => dependencies.size === 0).map(([id]) => id).sort();
            if (!ready.length) fail('CYCLE');
            pending.delete(ready[0]);
            for (const dependencies of pending.values()) dependencies.delete(ready[0]);
        }
        return normalized.sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    };
    records = check(tasks);
    return {
        add(task) { records = check([...records, task]); },
        remove(id) {
            if (!validId(id)) fail('INVALID_TASK');
            if (!records.some(row => row.id === id)) fail('UNKNOWN_TASK');
            if (records.some(row => row.requires.includes(id))) fail('IN_USE');
            records = records.filter(row => row.id !== id);
        },
        snapshot() { return records.map(row => ({ id: row.id, requires: [...row.requires] })); },
        plan(targets) {
            if (targets !== undefined && (!Array.isArray(targets) || targets.some(id => !validId(id)))) fail('INVALID_TASK');
            const selected = new Set(); const queue = targets === undefined ? records.map(row => row.id) : [...targets];
            while (queue.length) {
                const id = queue.pop(); const row = records.find(task => task.id === id);
                if (!row) fail('UNKNOWN_TASK');
                if (!selected.has(id)) { selected.add(id); queue.push(...row.requires); }
            }
            const pending = new Map(records.filter(row => selected.has(row.id)).map(row => [row.id, new Set(row.requires)]));
            const result = [];
            while (pending.size) {
                const ready = [...pending].filter(([, dependencies]) => dependencies.size === 0).map(([id]) => id).sort();
                if (!ready.length) fail('CYCLE');
                const next = ready[0]; pending.delete(next); result.push(next);
                for (const dependencies of pending.values()) dependencies.delete(next);
            }
            return result;
        }
    };
}
module.exports = { formatOrder, createPlanner };
