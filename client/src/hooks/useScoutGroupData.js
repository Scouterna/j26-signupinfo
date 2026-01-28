import { useMemo, useCallback } from 'react';

/**
 * Determines the type of a stat value in the new hierarchical format.
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
 * Checks if a nested object contains sub-questions (objects with answer counts)
 * or is a direct answer-count mapping.
 * @param {Object} obj - The object to check
 * @returns {boolean} True if it contains sub-questions
 */
function hasSubQuestions(obj) {
    if (!obj || typeof obj !== 'object') return false;
    return Object.values(obj).some(v => typeof v === 'object' && !Array.isArray(v));
}

export default function useScoutGroupData(jsonData, selectedScoutGroupIds) {
    /**
     * Extract unique top-level statistic category names from all selected scout groups.
     * In the new format, stats is an object where keys are category names.
     */
    const statistics = useMemo(() => {
        const statCategories = new Set();
        
        jsonData.villages.forEach(village => {
            village.ScoutGroups.forEach(scoutGroup => {
                if (selectedScoutGroupIds.has(scoutGroup.id)) {
                    // stats is now an object, not an array
                    if (scoutGroup.stats && typeof scoutGroup.stats === 'object') {
                        Object.keys(scoutGroup.stats).forEach(categoryName => {
                            statCategories.add(categoryName);
                        });
                    }
                }
            });
        });
        
        return Array.from(statCategories).sort();
    }, [selectedScoutGroupIds, jsonData.villages]);

    const totalParticipants = useMemo(() => {
        let total = 0;
        jsonData.villages.forEach(village => {
            village.ScoutGroups.forEach(scoutGroup => {
                if (selectedScoutGroupIds.has(scoutGroup.id)) {
                    total += scoutGroup.num_participants || 0;
                }
            });
        });
        return total;
    }, [selectedScoutGroupIds, jsonData.villages]);

    /**
     * Gets aggregated statistic data for a given category name.
     * Returns an object with subQuestions containing aggregated values.
     * 
     * The new stats format can have:
     * - Direct counts: { "Kvinna": 31, "Man": 2 }
     * - Nested sub-questions: { "Question?": { "Answer1": 5, "Answer2": 3 } }
     * - Single values: { "Consent text": 11 }
     * - String values: { "Transport": "Bus" }
     * - Arrays: { "Comments": ["text1", "text2"] }
     */
    const getStatisticData = useCallback((categoryName) => {
        const subQuestions = {};
        
        jsonData.villages.forEach(village => {
            village.ScoutGroups.forEach(scoutGroup => {
                if (!selectedScoutGroupIds.has(scoutGroup.id)) return;
                
                const categoryData = scoutGroup.stats?.[categoryName];
                if (!categoryData || typeof categoryData !== 'object') return;
                
                // Check if this category has nested sub-questions or direct values
                const categoryHasSubQuestions = hasSubQuestions(categoryData);
                
                Object.entries(categoryData).forEach(([key, value]) => {
                    const valueType = getValueType(value);
                    
                    if (categoryHasSubQuestions && valueType === 'nested') {
                        // This is a sub-question with answer options
                        if (!subQuestions[key]) {
                            subQuestions[key] = { type: 'answers', values: {} };
                        }
                        
                        Object.entries(value).forEach(([answerKey, answerValue]) => {
                            const answerType = getValueType(answerValue);
                            
                            if (answerType === 'number') {
                                if (!subQuestions[key].values[answerKey]) {
                                    subQuestions[key].values[answerKey] = { name: answerKey, count: 0 };
                                }
                                subQuestions[key].values[answerKey].count += answerValue;
                            } else if (answerType === 'array') {
                                // Free text answers within a sub-question
                                if (!subQuestions[key].values[answerKey]) {
                                    subQuestions[key].values[answerKey] = { 
                                        name: answerKey, 
                                        count: 0, 
                                        freeTextAnswers: [] 
                                    };
                                }
                                subQuestions[key].values[answerKey].count += answerValue.length;
                                subQuestions[key].values[answerKey].freeTextAnswers.push(...answerValue);
                            }
                        });
                    } else if (valueType === 'number') {
                        // Direct count value (could be consent or simple answer)
                        // Use a special "_direct" sub-question for categories with mixed content
                        // Or if it's all direct values, treat each key as an answer
                        const subQuestionKey = categoryHasSubQuestions ? key : '_direct';
                        
                        if (!subQuestions[subQuestionKey]) {
                            subQuestions[subQuestionKey] = { type: 'answers', values: {} };
                        }
                        
                        const answerKey = categoryHasSubQuestions ? '_count' : key;
                        if (!subQuestions[subQuestionKey].values[answerKey]) {
                            subQuestions[subQuestionKey].values[answerKey] = { 
                                name: categoryHasSubQuestions ? 'Antal' : key, 
                                count: 0 
                            };
                        }
                        subQuestions[subQuestionKey].values[answerKey].count += value;
                    } else if (valueType === 'string') {
                        // String value - aggregate per scout group
                        if (!subQuestions[key]) {
                            subQuestions[key] = { type: 'perGroup', values: {} };
                        }
                        const groupKey = `${scoutGroup.id}`;
                        subQuestions[key].values[groupKey] = {
                            name: value,
                            scoutGroupName: scoutGroup.name,
                        };
                    } else if (valueType === 'array') {
                        // Array of free text answers at the category level
                        if (!subQuestions[key]) {
                            subQuestions[key] = { 
                                type: 'answers', 
                                values: { 
                                    '_text': { name: 'Svar', count: 0, freeTextAnswers: [] } 
                                } 
                            };
                        }
                        subQuestions[key].values['_text'].count += value.length;
                        subQuestions[key].values['_text'].freeTextAnswers.push(...value);
                    }
                });
            });
        });
        
        // Post-process: compute groupedByAnswer for perGroup subQuestions
        Object.values(subQuestions).forEach(subQuestion => {
            if (subQuestion.type === 'perGroup') {
                const groupedByAnswer = {};
                
                Object.values(subQuestion.values).forEach(({ name, scoutGroupName }) => {
                    if (!groupedByAnswer[name]) {
                        groupedByAnswer[name] = { count: 0, scoutGroups: [] };
                    }
                    groupedByAnswer[name].count += 1;
                    groupedByAnswer[name].scoutGroups.push(scoutGroupName);
                });
                
                // Sort scout groups alphabetically within each answer
                Object.values(groupedByAnswer).forEach(group => {
                    group.scoutGroups.sort((a, b) => a.localeCompare(b, 'sv'));
                });
                
                subQuestion.groupedByAnswer = groupedByAnswer;
            }
        });
        
        return { subQuestions };
    }, [selectedScoutGroupIds, jsonData.villages]);

    return { statistics, totalParticipants, getStatisticData };
}
