'use strict';

const DEFAULT_REINJECT_MINUTES = 60;
const DEFAULT_REINJECT_TOKENS = 250000;

const THRESHOLD_PROPERTIES = {
    reinjectAfterMinutes: {
        type: 'number',
        required: false,
        rejectNull: true,
        describe: `Positive whole minutes between PostToolUse reminders. Default ${DEFAULT_REINJECT_MINUTES}. Elapsed time applies even without a transcript.`
    },
    reinjectAfterTokens: {
        type: 'number',
        required: false,
        rejectNull: true,
        describe: `Positive whole number of estimated transcript tokens between PostToolUse reminders. Default ${DEFAULT_REINJECT_TOKENS}. The earlier time or growth threshold wins.`
    }
};

function isThreshold(value) {
    return Number.isSafeInteger(value) && value > 0;
}

function validateReminderThresholds(settings, errors) {
    for (const key of Object.keys(THRESHOLD_PROPERTIES)) {
        const value = settings?.[key];
        if (typeof value === 'number' && !isThreshold(value)) {
            errors.push(`qualitySkillReminder.${key}: expected a positive safe integer`);
        }
    }
}

function resolveReminderThresholds(settings) {
    const { reinjectAfterMinutes, reinjectAfterTokens } = settings || {};
    return {
        minutes: isThreshold(reinjectAfterMinutes) ? reinjectAfterMinutes : DEFAULT_REINJECT_MINUTES,
        tokens: isThreshold(reinjectAfterTokens) ? reinjectAfterTokens : DEFAULT_REINJECT_TOKENS
    };
}

module.exports = { DEFAULT_REINJECT_MINUTES, DEFAULT_REINJECT_TOKENS, THRESHOLD_PROPERTIES, validateReminderThresholds, resolveReminderThresholds };
