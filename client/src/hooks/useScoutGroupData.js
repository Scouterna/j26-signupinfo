import { useMemo, useCallback } from 'react';

export default function useScoutGroupData(jsonData, selectedScoutGroupIds) {
    const statistics = useMemo(() => {
        const statCounts = new Map();
        
        jsonData.villages.forEach(village => {
            village.ScoutGroups.forEach(scoutGroup => {
                if (selectedScoutGroupIds.has(scoutGroup.id)) {
                    scoutGroup.stats.forEach(stat => {
                        statCounts.set(stat.name, (statCounts.get(stat.name) || 0) + 1);
                    });
                }
            });
        });
        
        return Array.from(statCounts.keys());
    }, [selectedScoutGroupIds, jsonData.villages]);

    const totalParticipants = useMemo(() => {
        let total = 0;
        jsonData.villages.forEach(village => {
            village.ScoutGroups.forEach(scoutGroup => {
                if (selectedScoutGroupIds.has(scoutGroup.id)) {
                    total += scoutGroup.num_participants;
                }
            });
        });
        return total;
    }, [selectedScoutGroupIds, jsonData.villages]);

    const getStatisticData = useCallback((statisticName) => {
        const aggregatedValues = {};
        
        jsonData.villages.forEach(village => {
            village.ScoutGroups.forEach(scoutGroup => {
                if (selectedScoutGroupIds.has(scoutGroup.id)) {
                    const stat = scoutGroup.stats.find(s => s.name === statisticName);
                    if (stat && stat.values) {
                        Object.entries(stat.values).forEach(([key, value]) => {
                            const hasNumericCount = Number.isFinite(value?.count);
                            if (hasNumericCount) {
                                if (!aggregatedValues[key]) {
                                    aggregatedValues[key] = { name: value.name, count: 0, free_text_answers: [] };
                                }
                                aggregatedValues[key].count += value.count;
                                
                                // Aggregate free text answers if they exist
                                if (value.free_text_answers) {
                                    const textAnswersMap = new Map(aggregatedValues[key].free_text_answers.map(a => [a.text, a]));
                                    
                                    value.free_text_answers.forEach(answer => {
                                        const existing = textAnswersMap.get(answer.text);
                                        if (existing) {
                                            existing.num_answers += answer.num_answers;
                                        } else {
                                            textAnswersMap.set(answer.text, { text: answer.text, num_answers: answer.num_answers });
                                        }
                                    });
                                    
                                    aggregatedValues[key].free_text_answers = Array.from(textAnswersMap.values());
                                }
                            } else {
                                // Name-only statistic (no numeric count) → map per scout group
                                const groupKey = scoutGroup.id;
                                aggregatedValues[groupKey] = {
                                    name: value?.name,
                                    count: undefined,
                                    scoutGroupName: scoutGroup.name,
                                };
                            }
                        });
                    }
                }
            });
        });
        
        return aggregatedValues;
    }, [selectedScoutGroupIds, jsonData.villages]);

    return { statistics, totalParticipants, getStatisticData };
}
