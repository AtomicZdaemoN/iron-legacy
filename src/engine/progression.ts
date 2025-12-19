import type {
    SchemeType,
    SetLog,
    DayExercise,
    RepQuality,
    ExerciseBaseline
} from '../db/schema';

// ============ Types ============

export type ProgressionType =
    | 'add_reps'
    | 'improve_quality'
    | 'add_weight'
    | 'maintain'
    | 'establish_baseline';

export interface ProgressionSuggestion {
    type: ProgressionType;
    message: string;
    shortMessage: string;
    targetReps?: number;
    targetWeight?: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    setNumber?: number;  // For per-set suggestions
}

export interface SetPerformance {
    setNumber: number;
    weightKg: number;
    reps: number;
    repQuality: RepQuality;
    isTopSet: boolean;
}

// ============ Constants ============

const WEIGHT_INCREMENT_KG = 2.5;
const WEIGHT_INCREMENT_KG_SMALL = 1.25;
const REPS_OVER_BASELINE_FOR_WEIGHT_INCREASE = 3;

// ============ Main Progression Engine ============

export function suggestProgression(
    schemeType: SchemeType,
    lastPerformance: SetLog[],
    dayExercise: DayExercise,
    baseline?: ExerciseBaseline[]
): ProgressionSuggestion[] {
    if (!lastPerformance.length) {
        return [{
            type: 'establish_baseline',
            message: 'First session! Establish your baseline performance.',
            shortMessage: 'Set baseline',
            confidence: 'high',
            reasoning: 'No previous data exists for this exercise.'
        }];
    }

    switch (schemeType) {
        case 'TOP_SET_BACKOFF_TRIPLE':
            return suggestTripleProgression(lastPerformance, dayExercise, baseline);

        case 'DOUBLE_PROGRESSION':
            return suggestDoubleProgression(lastPerformance, dayExercise);

        case 'DYNAMIC_DOUBLE_PROGRESSION':
            return suggestDynamicDoubleProgression(lastPerformance, dayExercise);

        case 'DROP_SETS':
            return suggestDropSetProgression(lastPerformance, dayExercise);

        case 'AMRAP':
            return suggestAmrapProgression(lastPerformance, dayExercise);

        case 'REST_PAUSE':
            return suggestRestPauseProgression(lastPerformance, dayExercise);

        case 'CLUSTER_SET':
            return suggestClusterProgression(lastPerformance, dayExercise);

        default:
            return suggestDoubleProgression(lastPerformance, dayExercise);
    }
}

// ============ Scheme-Specific Logic ============

/**
 * Triple Progression: Reps → Quality → Weight
 * Used for main lifts (bench, curl, triceps pushdown)
 */
function suggestTripleProgression(
    lastPerformance: SetLog[],
    dayExercise: DayExercise,
    baseline?: ExerciseBaseline[]
): ProgressionSuggestion[] {
    const suggestions: ProgressionSuggestion[] = [];

    // Analyze top set first
    const topSet = lastPerformance.find(s => s.setType === 'top');
    const backoffSets = lastPerformance.filter(s => s.setType === 'backoff');

    if (topSet) {
        const topSetBaseline = baseline?.find(b => b.setNumber === 1);
        const baselineReps = topSetBaseline?.reps ?? dayExercise.currentPhaseReps;
        const repsOverBaseline = topSet.reps - baselineReps;

        if (topSet.repQuality === 'sloppy') {
            suggestions.push({
                type: 'improve_quality',
                message: `Top set: Clean up technique at ${topSet.weightKg}kg × ${topSet.reps}`,
                shortMessage: 'Clean up form',
                confidence: 'high',
                reasoning: 'Rep quality was marked as sloppy. Improving form before adding reps.',
                setNumber: 1
            });
        } else if (repsOverBaseline >= REPS_OVER_BASELINE_FOR_WEIGHT_INCREASE && topSet.repQuality === 'clean') {
            const newWeight = topSet.weightKg + WEIGHT_INCREMENT_KG;
            suggestions.push({
                type: 'add_weight',
                message: `Top set: Add weight! Try ${newWeight}kg × ${baselineReps}`,
                shortMessage: `+${WEIGHT_INCREMENT_KG}kg`,
                targetWeight: newWeight,
                targetReps: baselineReps,
                confidence: 'high',
                reasoning: `Added ${repsOverBaseline} reps over baseline with clean form. Time to progress load.`,
                setNumber: 1
            });
        } else if (topSet.repQuality === 'ok' && repsOverBaseline >= 1) {
            suggestions.push({
                type: 'improve_quality',
                message: `Top set: Make ${topSet.reps} reps cleaner at ${topSet.weightKg}kg`,
                shortMessage: 'Improve quality',
                confidence: 'medium',
                reasoning: 'Good reps, but quality can improve before adding more.',
                setNumber: 1
            });
        } else {
            suggestions.push({
                type: 'add_reps',
                message: `Top set: Try for ${topSet.reps + 1} reps at ${topSet.weightKg}kg`,
                shortMessage: '+1 rep',
                targetReps: topSet.reps + 1,
                confidence: 'high',
                reasoning: 'Building toward baseline + 3-4 reps before adding weight.',
                setNumber: 1
            });
        }
    }

    // Analyze backoff sets (they progress faster typically)
    backoffSets.forEach((set, index) => {
        const setNum = index + 2; // Backoff sets are 2, 3, 4...
        const setBaseline = baseline?.find(b => b.setNumber === setNum);
        const baselineReps = setBaseline?.reps ?? dayExercise.currentPhaseReps;
        const repsOverBaseline = set.reps - baselineReps;

        if (repsOverBaseline >= REPS_OVER_BASELINE_FOR_WEIGHT_INCREASE && set.repQuality !== 'sloppy') {
            const newWeight = set.weightKg + WEIGHT_INCREMENT_KG;
            suggestions.push({
                type: 'add_weight',
                message: `Set ${setNum}: Add weight! Try ${newWeight}kg`,
                shortMessage: `Set ${setNum}: +${WEIGHT_INCREMENT_KG}kg`,
                targetWeight: newWeight,
                confidence: 'medium',
                reasoning: 'Backoff sets progress more quickly. Reps exceeded target.',
                setNumber: setNum
            });
        } else if (set.repQuality !== 'sloppy') {
            suggestions.push({
                type: 'add_reps',
                message: `Set ${setNum}: Try for ${set.reps + 1} reps`,
                shortMessage: `Set ${setNum}: +1 rep`,
                targetReps: set.reps + 1,
                confidence: 'medium',
                setNumber: setNum,
                reasoning: 'Continue building reps on backoff sets.'
            });
        }
    });

    return suggestions;
}

/**
 * Double Progression: Fill out rep range, then add weight
 */
function suggestDoubleProgression(
    lastPerformance: SetLog[],
    dayExercise: DayExercise
): ProgressionSuggestion[] {
    const workingSets = lastPerformance.filter(s => s.setType === 'working' || s.setType === 'top');

    if (!workingSets.length) {
        return [{
            type: 'establish_baseline',
            message: 'No working sets recorded. Log your first session!',
            shortMessage: 'Set baseline',
            confidence: 'high',
            reasoning: 'Missing performance data'
        }];
    }

    const allAtMaxReps = workingSets.every(s => s.reps >= dayExercise.repsMax);
    const allCleanOrOk = workingSets.every(s => s.repQuality !== 'sloppy');

    if (allAtMaxReps && allCleanOrOk) {
        const currentWeight = workingSets[0].weightKg;
        const newWeight = currentWeight + WEIGHT_INCREMENT_KG;
        return [{
            type: 'add_weight',
            message: `All sets at ${dayExercise.repsMax} reps! Add weight: ${newWeight}kg × ${dayExercise.repsMin}`,
            shortMessage: `+${WEIGHT_INCREMENT_KG}kg, reset reps`,
            targetWeight: newWeight,
            targetReps: dayExercise.repsMin,
            confidence: 'high',
            reasoning: 'All sets completed at top of rep range with good form.'
        }];
    }

    const totalReps = workingSets.reduce((sum, s) => sum + s.reps, 0);
    const avgReps = totalReps / workingSets.length;
    const targetReps = Math.min(Math.ceil(avgReps) + 1, dayExercise.repsMax);

    return [{
        type: 'add_reps',
        message: `Work toward ${workingSets.length}×${dayExercise.repsMax} (currently averaging ${avgReps.toFixed(1)})`,
        shortMessage: `Target ${targetReps} reps each set`,
        targetReps,
        confidence: 'high',
        reasoning: 'Building toward top of rep range before increasing weight.'
    }];
}

/**
 * Dynamic Double Progression: Each set progresses independently
 */
function suggestDynamicDoubleProgression(
    lastPerformance: SetLog[],
    dayExercise: DayExercise
): ProgressionSuggestion[] {
    const suggestions: ProgressionSuggestion[] = [];
    const workingSets = lastPerformance.filter(s =>
        s.setType === 'working' || s.setType === 'top' || s.setType === 'backoff'
    ).sort((a, b) => a.setNumber - b.setNumber);

    workingSets.forEach((set) => {
        if (set.reps >= dayExercise.repsMax && set.repQuality !== 'sloppy') {
            const newWeight = set.weightKg + WEIGHT_INCREMENT_KG;
            suggestions.push({
                type: 'add_weight',
                message: `Set ${set.setNumber}: Add weight → ${newWeight}kg × ${dayExercise.repsMin}`,
                shortMessage: `Set ${set.setNumber}: +${WEIGHT_INCREMENT_KG}kg`,
                targetWeight: newWeight,
                targetReps: dayExercise.repsMin,
                confidence: 'high',
                reasoning: `Set ${set.setNumber} hit ${set.reps} reps (max: ${dayExercise.repsMax}).`,
                setNumber: set.setNumber
            });
        } else {
            suggestions.push({
                type: 'add_reps',
                message: `Set ${set.setNumber}: Try for ${Math.min(set.reps + 1, dayExercise.repsMax)} reps at ${set.weightKg}kg`,
                shortMessage: `Set ${set.setNumber}: +1 rep`,
                targetReps: Math.min(set.reps + 1, dayExercise.repsMax),
                confidence: 'medium',
                reasoning: 'Each set progresses toward top of rep range independently.',
                setNumber: set.setNumber
            });
        }
    });

    return suggestions;
}

/**
 * Drop Sets: Focus on execution, track top set weight
 */
function suggestDropSetProgression(
    lastPerformance: SetLog[],
    dayExercise: DayExercise
): ProgressionSuggestion[] {
    const topSet = lastPerformance.find(s => s.setType === 'top');

    if (!topSet) {
        return [{
            type: 'establish_baseline',
            message: 'Log your top set, then perform 2-3 drop sets immediately after',
            shortMessage: 'Set baseline',
            confidence: 'high',
            reasoning: 'No top set recorded'
        }];
    }

    if (topSet.reps >= dayExercise.repsMax && topSet.repQuality !== 'sloppy') {
        return [{
            type: 'add_weight',
            message: `Top set crushed! Try ${topSet.weightKg + WEIGHT_INCREMENT_KG_SMALL}kg next time`,
            shortMessage: `+${WEIGHT_INCREMENT_KG_SMALL}kg on top set`,
            targetWeight: topSet.weightKg + WEIGHT_INCREMENT_KG_SMALL,
            confidence: 'medium',
            reasoning: 'Top set at max reps. Small weight increase for isolation work.'
        }];
    }

    return [{
        type: 'maintain',
        message: `Push the drop sets hard. Top set: ${topSet.weightKg}kg × ${topSet.reps}`,
        shortMessage: 'Push intensity',
        confidence: 'high',
        reasoning: 'Drop sets focus on intensity and pump, not strict progression.'
    }];
}

/**
 * AMRAP: Add weight at 20 reps threshold
 */
function suggestAmrapProgression(
    lastPerformance: SetLog[],
    _dayExercise: DayExercise
): ProgressionSuggestion[] {
    const maxReps = Math.max(...lastPerformance.map(s => s.reps));
    const avgReps = lastPerformance.reduce((sum, s) => sum + s.reps, 0) / lastPerformance.length;

    if (maxReps >= 20) {
        return [{
            type: 'add_weight',
            message: `Hitting 20+ reps! Time to add weight`,
            shortMessage: 'Add weight',
            confidence: 'high',
            reasoning: 'Reached 20 rep threshold for weighted progression.'
        }];
    }

    return [{
        type: 'add_reps',
        message: `Beat last time! Previous best: ${maxReps} reps (avg: ${avgReps.toFixed(1)})`,
        shortMessage: `Beat ${maxReps} reps`,
        targetReps: maxReps + 1,
        confidence: 'high',
        reasoning: 'AMRAP progression: try to beat previous rep count.'
    }];
}

/**
 * Rest Pause: Track total reps in the set
 */
function suggestRestPauseProgression(
    lastPerformance: SetLog[],
    _dayExercise: DayExercise
): ProgressionSuggestion[] {
    const restPauseSet = lastPerformance.find(s => s.setType === 'rest_pause');

    if (!restPauseSet) {
        return [{
            type: 'establish_baseline',
            message: '3-4s pause at bottom, half reps up. One rest pause allowed.',
            shortMessage: 'Set baseline',
            confidence: 'high',
            reasoning: 'No rest pause set recorded'
        }];
    }

    return [{
        type: 'add_reps',
        message: `Beat ${restPauseSet.reps} total reps at ${restPauseSet.weightKg}kg`,
        shortMessage: `Beat ${restPauseSet.reps} reps`,
        targetReps: restPauseSet.reps + 1,
        confidence: 'high',
        reasoning: 'Rest pause progression: accumulate more total reps over time.'
    }];
}

/**
 * Cluster Sets: Track total volume in the time block
 */
function suggestClusterProgression(
    lastPerformance: SetLog[],
    _dayExercise: DayExercise
): ProgressionSuggestion[] {
    const clusterSets = lastPerformance.filter(s => s.modifiers.includes('cluster'));
    const totalReps = clusterSets.reduce((sum, s) => sum + s.reps, 0);

    if (!clusterSets.length) {
        return [{
            type: 'establish_baseline',
            message: '3-5 minute cluster: 3-5 reps, 5-10s rest, repeat until song ends',
            shortMessage: 'Set baseline',
            confidence: 'high',
            reasoning: 'No cluster set recorded'
        }];
    }

    return [{
        type: 'add_reps',
        message: `Beat ${totalReps} total cluster reps`,
        shortMessage: `Beat ${totalReps} total reps`,
        targetReps: totalReps + 5,
        confidence: 'medium',
        reasoning: 'Cluster set progression: accumulate more total reps in the time block.'
    }];
}

// ============ Utility Functions ============

/**
 * Calculate estimated 1RM from weight and reps (Epley formula)
 */
export function calculateE1RM(weightKg: number, reps: number): number {
    if (reps === 1) return weightKg;
    return weightKg * (1 + reps / 30);
}

/**
 * Calculate total volume (weight × reps) for a session
 */
export function calculateVolume(sets: SetLog[]): number {
    return sets.reduce((total, set) => {
        const effectiveWeight = set.weightKg + set.externalLoadKg;
        return total + (effectiveWeight * set.reps);
    }, 0);
}

/**
 * Get the best set from a workout (highest e1RM)
 */
export function getBestSet(sets: SetLog[]): SetLog | null {
    if (!sets.length) return null;
    return sets.reduce((best, set) => {
        const currentE1RM = calculateE1RM(set.weightKg + set.externalLoadKg, set.reps);
        const bestE1RM = calculateE1RM(best.weightKg + best.externalLoadKg, best.reps);
        return currentE1RM > bestE1RM ? set : best;
    });
}

/**
 * Format weight for display (converts kg to lb if needed)
 */
export function formatWeight(weightKg: number, displayUnit: 'kg' | 'lb'): string {
    if (displayUnit === 'lb') {
        const lbs = weightKg * 2.20462;
        return `${Math.round(lbs * 2) / 2} lb`;
    }
    return `${weightKg} kg`;
}

/**
 * Convert lb to kg for storage
 */
export function lbToKg(lb: number): number {
    return lb / 2.20462;
}

/**
 * Convert kg to lb for display
 */
export function kgToLb(kg: number): number {
    return kg * 2.20462;
}
