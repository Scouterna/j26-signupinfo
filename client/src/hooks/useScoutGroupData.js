import { useMemo } from 'react';

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

    return { statistics, totalParticipants };
}
