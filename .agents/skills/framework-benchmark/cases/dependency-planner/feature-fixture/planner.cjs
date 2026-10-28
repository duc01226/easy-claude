'use strict';

function formatOrder(ids) {
    if (!Array.isArray(ids) || ids.some(id => typeof id !== 'string')) throw new TypeError('Expected an array of IDs');
    return ids.join(' -> ');
}

function createPlanner() {
    throw new Error('Planner capability has not been implemented');
}

module.exports = { formatOrder, createPlanner };
