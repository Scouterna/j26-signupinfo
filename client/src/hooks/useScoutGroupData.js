import { useMemo, useCallback } from 'react';

/**
 * Returns an array of selected scout groups from the villages data.
 * @param {Array} villages - Array of village objects containing ScoutGroups
 * @param {Set} selectedIds - Set of selected scout group IDs
 * @returns {Array} Array of selected scout group objects
 */
export function getSelectedScoutGroups(villages, selectedIds) {
    return villages.flatMap(v => v.ScoutGroups).filter(sg => selectedIds.has(sg.id));
}

/**
 * Determines the type of a stat value in the hierarchical format.
 * @param {any} value - The value to check
 * @returns {'number'|'nested'|'string'|'array'|'empty'} The value type
 */
function getValueType(value) {
    if (value === null || value === undefined) return 'empty';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'string';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'object') return 'nested';
    return 'empty';
}

/**
 * Checks if a object contains sub-questions (objects with answer counts)
 * or is a direct answer-count mapping.
 * @param {Object} obj - The object to check
 * @returns {boolean} True if it contains sub-questions
 */
function hasSubQuestions(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(v => typeof v === 'object' && !Array.isArray(v));
}

/**
 * Ensures a subQuestion exists with the given type, initializing if needed.
 * @param {Object} subQuestions - The subQuestions object to modify
 * @param {string} key - The key for the subQuestion
 * @param {string} type - The type ('answers' or 'perGroup')
 * @returns {Object} The subQuestion object
 */
function ensureSubQuestion(subQuestions, key, type) {
    if (!subQuestions[key]) {
        subQuestions[key] = { type, values: {} };
    }
    return subQuestions[key];
}

/**
 * Ensures an answer value exists, initializing if needed.
 * @param {Object} values - The values object to modify
 * @param {string} key - The key for the answer
 * @param {string} name - The display name
 * @param {boolean} includeFreeText - Whether to include freeTextAnswers array
 * @returns {Object} The answer value object
 */
function ensureAnswerValue(values, key, name, includeFreeText = false) {
    if (!values[key]) {
        values[key] = { name, count: 0 };
        if (includeFreeText) {
            values[key].freeTextAnswers = [];
        }
    }
    return values[key];
}

/**
 * Handles nested object values (sub-questions with answer options).
 * @param {Object} subQuestions - The subQuestions accumulator
 * @param {string} key - The sub-question key
 * @param {Object} value - The nested object with answers
 */
function handleNestedValue(subQuestions, key, value) {
    const subQuestion = ensureSubQuestion(subQuestions, key, 'answers');
    
    Object.entries(value).forEach(([answerKey, answerValue]) => {
        const answerType = getValueType(answerValue);
        
        if (answerType === 'number') {
            const answer = ensureAnswerValue(subQuestion.values, answerKey, answerKey);
            answer.count += answerValue;
        } else if (answerType === 'array') {
            const answer = ensureAnswerValue(subQuestion.values, answerKey, answerKey, true);
            answer.count += answerValue.length;
            answer.freeTextAnswers.push(...answerValue);
        }
    });
}

/**
 * Handles numeric values.
 * @param {Object} subQuestions - The subQuestions accumulator
 * @param {string} key - The value key
 * @param {number} value - The numeric value
 * @param {boolean} categoryHasSubQuestions - Whether the category has nested sub-questions
 */
function handleNumberValue(subQuestions, key, value, categoryHasSubQuestions) {
    const subQuestionKey = categoryHasSubQuestions ? key : '_direct';
    const subQuestion = ensureSubQuestion(subQuestions, subQuestionKey, 'answers');
    
    const answerKey = categoryHasSubQuestions ? '_count' : key;
    const answerName = categoryHasSubQuestions ? 'Antal' : key;
    const answer = ensureAnswerValue(subQuestion.values, answerKey, answerName);
    answer.count += value;
}

/**
 * Handles string values (aggregated per scout group).
 * @param {Object} subQuestions - The subQuestions accumulator
 * @param {string} key - The value key
 * @param {string} value - The string value
 * @param {Object} scoutGroup - The scout group object
 */
function handleStringValue(subQuestions, key, value, scoutGroup) {
    const subQuestion = ensureSubQuestion(subQuestions, key, 'perGroup');
    subQuestion.values[scoutGroup.id] = {
        name: value,
        scoutGroupName: scoutGroup.name,
    };
}

/**
 * Handles array values (free text answers at category level).
 * @param {Object} subQuestions - The subQuestions accumulator
 * @param {string} key - The value key
 * @param {Array} value - The array of text values
 */
function handleArrayValue(subQuestions, key, value) {
    if (!subQuestions[key]) {
        subQuestions[key] = {
            type: 'answers',
            values: { '_text': { name: 'Svar', count: 0, freeTextAnswers: [] } }
        };
    }
    subQuestions[key].values['_text'].count += value.length;
    subQuestions[key].values['_text'].freeTextAnswers.push(...value);
}

/**
 * Computes groupedByAnswer for a perGroup subQuestion.
 * Groups scout groups by their answer value.
 * @param {Object} subQuestion - The subQuestion to process
 * @returns {Object} The groupedByAnswer object
 */
function computeGroupedByAnswer(subQuestion) {
    const groupedByAnswer = {};
    
    Object.entries(subQuestion.values).forEach(([scoutGroupId, { name, scoutGroupName }]) => {
        if (!groupedByAnswer[name]) {
            groupedByAnswer[name] = { count: 0, scoutGroups: [], scoutGroupIds: [] };
        }
        groupedByAnswer[name].count += 1;
        groupedByAnswer[name].scoutGroups.push(scoutGroupName);
        groupedByAnswer[name].scoutGroupIds.push(Number(scoutGroupId));
    });
    
    // Sort scout groups alphabetically within each answer
    Object.values(groupedByAnswer).forEach(group => {
        group.scoutGroups.sort((a, b) => a.localeCompare(b, 'sv'));
    });
    
    return groupedByAnswer;
}

/**
 * Post-processes all perGroup subQuestions to add groupedByAnswer.
 * @param {Object} subQuestions - The subQuestions object to process
 */
function postProcessPerGroupSubQuestions(subQuestions) {
    Object.values(subQuestions).forEach(subQuestion => {
        if (subQuestion.type === 'perGroup') {
            subQuestion.groupedByAnswer = computeGroupedByAnswer(subQuestion);
        }
    });
}

/**
 * Processes a single category entry value based on its type.
 * @param {Object} subQuestions - The subQuestions accumulator
 * @param {string} key - The entry key
 * @param {any} value - The entry value
 * @param {boolean} categoryHasSubQuestions - Whether the category has nested sub-questions
 * @param {Object} scoutGroup - The scout group object (for string values)
 */
function processCategoryEntry(subQuestions, key, value, categoryHasSubQuestions, scoutGroup) {
    const valueType = getValueType(value);
    
    switch (valueType) {
        case 'nested':
            handleNestedValue(subQuestions, key, value);
            break;
        case 'number':
            handleNumberValue(subQuestions, key, value, categoryHasSubQuestions);
            break;
        case 'string':
            handleStringValue(subQuestions, key, value, scoutGroup);
            break;
        case 'array':
            handleArrayValue(subQuestions, key, value);
            break;
        // 'empty' type is ignored
    }
}

export default function useScoutGroupData(jsonData, selectedScoutGroupIds) {
    /**
     * Extract unique top-level statistic category names from all selected scout groups.
     */
    const statistics = useMemo(() => {
        const statCategories = new Set();
        getSelectedScoutGroups(jsonData.villages, selectedScoutGroupIds).forEach(({ stats }) => {
            if (stats && typeof stats === 'object') {
                Object.keys(stats).forEach(categoryName => statCategories.add(categoryName));
            }
        });
        return Array.from(statCategories).sort();
    }, [selectedScoutGroupIds, jsonData.villages]);

    const totalParticipants = useMemo(() => {
        return getSelectedScoutGroups(jsonData.villages, selectedScoutGroupIds)
            .reduce((sum, sg) => sum + (sg.num_participants || 0), 0);
    }, [selectedScoutGroupIds, jsonData.villages]);

    /**
     * Gets aggregated statistic data for a given category name.
     * Returns an object with subQuestions containing aggregated values.
     * 
     * Stats format can be:
     * - Direct counts: { "Kvinna": 31, "Man": 2 }
     * - Nested sub-questions: { "Question?": { "Answer1": 5, "Answer2": 3 } }
     * - Single values: { "text": 11 }
     * - String values: { "Transport": "Bus" }
     * - Arrays: { "Comments": ["text1", "text2"] }
     */
    const getStatisticData = useCallback((categoryName) => {
        const subQuestions = {};
        
        getSelectedScoutGroups(jsonData.villages, selectedScoutGroupIds).forEach(scoutGroup => {
            const categoryData = scoutGroup.stats?.[categoryName];
            if (!categoryData || typeof categoryData !== 'object') return;
            
            const categoryHasSubQuestions = hasSubQuestions(categoryData);
            
            Object.entries(categoryData).forEach(([key, value]) => {
                processCategoryEntry(subQuestions, key, value, categoryHasSubQuestions, scoutGroup);
            });
        });
        
        postProcessPerGroupSubQuestions(subQuestions);
        
        return { subQuestions };
    }, [selectedScoutGroupIds, jsonData.villages]);

    return { statistics, totalParticipants, getStatisticData };
}
