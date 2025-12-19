import { db } from './database';
import type {
    Program,
    Plan,
    WorkoutDay,
    Exercise,
    ExerciseBlock,
    DayExercise,
    SchemeType
} from './schema';

// ============ Program Definition ============

const PROGRAM_ID = 'iron-legacy-v1';

const program: Program = {
    id: PROGRAM_ID,
    name: 'Iron Legacy',
    description: 'Diego Leyva\'s personalized strength & hypertrophy program based on Golden Warrior',
    createdAt: new Date()
};

// ============ Plans ============

const plans: Plan[] = [
    { id: 'plan-a', programId: PROGRAM_ID, name: 'Plan A (5-day)', daysPerWeek: 5 },
    { id: 'plan-b', programId: PROGRAM_ID, name: 'Plan B (4-day)', daysPerWeek: 4 },
    { id: 'plan-c', programId: PROGRAM_ID, name: 'Plan C (3-day)', daysPerWeek: 3 }
];

// ============ Workout Days ============

const workoutDays: WorkoutDay[] = [
    // Plan A - 5 days
    { id: 'day-a1', planId: 'plan-a', dayNumber: 1, name: 'Upper Body 1', focus: 'push/arms', estimatedDuration: 75 },
    { id: 'day-a2', planId: 'plan-a', dayNumber: 2, name: 'Back + Legs', focus: 'pull/legs', estimatedDuration: 70 },
    { id: 'day-a3', planId: 'plan-a', dayNumber: 3, name: 'Upper Body 2', focus: 'push/pull', estimatedDuration: 65 },
    { id: 'day-a4', planId: 'plan-a', dayNumber: 4, name: 'Lower Body', focus: 'legs', estimatedDuration: 60 },
    { id: 'day-a5', planId: 'plan-a', dayNumber: 5, name: 'Upper Body 3', focus: 'volume', estimatedDuration: 55 },

    // Plan B - 4 days (days 1-4)
    { id: 'day-b1', planId: 'plan-b', dayNumber: 1, name: 'Upper Body 1', focus: 'push/arms', estimatedDuration: 75 },
    { id: 'day-b2', planId: 'plan-b', dayNumber: 2, name: 'Back + Legs', focus: 'pull/legs', estimatedDuration: 70 },
    { id: 'day-b3', planId: 'plan-b', dayNumber: 3, name: 'Upper Body 2', focus: 'push/pull', estimatedDuration: 65 },
    { id: 'day-b4', planId: 'plan-b', dayNumber: 4, name: 'Lower Body', focus: 'legs', estimatedDuration: 60 },

    // Plan C - 3 days (days 1-3, with optional leg work on day 3)
    { id: 'day-c1', planId: 'plan-c', dayNumber: 1, name: 'Upper Body 1', focus: 'push/arms', estimatedDuration: 75 },
    { id: 'day-c2', planId: 'plan-c', dayNumber: 2, name: 'Back + Legs', focus: 'pull/legs', estimatedDuration: 70 },
    { id: 'day-c3', planId: 'plan-c', dayNumber: 3, name: 'Upper Body 2 + Legs', focus: 'full', estimatedDuration: 80 }
];

// ============ Exercises ============

const exercises: Exercise[] = [
    // Chest
    { id: 'bench-close', name: 'Bench Press (Close Grip)', canonicalName: 'bench_press', category: 'chest', movementPattern: 'horizontal_push', equipment: ['barbell', 'bench'], isCalisthenics: false, formNotes: 'Close grip presses are poppy off the bottom, harder to lock out. Fully lock out each rep. Lead with elbows on descent.' },
    { id: 'bench-db', name: 'Dumbbell Bench Press', canonicalName: 'bench_press', category: 'chest', movementPattern: 'horizontal_push', equipment: ['dumbbell', 'bench'], isCalisthenics: false, formNotes: 'Bring dumbbells all the way down at 45° angle. Pause under tension, do 3/4 reps stopping shy of lockout.' },
    { id: 'dip-assisted', name: 'Dip (Assisted)', canonicalName: 'dip', category: 'chest', movementPattern: 'horizontal_push', equipment: ['dip_machine'], isCalisthenics: true, formNotes: 'Forward lean, pseudo push-up position. Pause at top and bottom. Slow reps as you approach failure.' },

    // Back
    { id: 'pullup-bw', name: 'Pull-Up (Bodyweight)', canonicalName: 'pullup', category: 'back', movementPattern: 'vertical_pull', equipment: ['pullup_bar'], isCalisthenics: true, formNotes: 'Grab bar outside shoulder width. Pull as high as possible (to sternum). Don\'t lower to dead hang.' },
    { id: 'pullup-neutral', name: 'Pull-Up (Neutral Grip, Weighted)', canonicalName: 'pullup', category: 'back', movementPattern: 'vertical_pull', equipment: ['pullup_bar', 'weight_belt'], isCalisthenics: true, formNotes: 'Shoulder width grip. Pull to sternum. Keep back arched, slow reps as ROM decreases.' },
    { id: 'chinup-bw', name: 'Chin-Up (Bodyweight)', canonicalName: 'chinup', category: 'back', movementPattern: 'vertical_pull', equipment: ['pullup_bar'], isCalisthenics: true, formNotes: 'Shoulder width grip. Keep elbows tucked for more biceps activation. Lower under tension.' },
    { id: 'cable-row', name: 'Seated Cable Row', canonicalName: 'cable_row', category: 'back', movementPattern: 'horizontal_pull', equipment: ['cable'], isCalisthenics: false, formNotes: 'Allow upper back to flex at start. Slow eccentrics as you approach the point where you can\'t pull to 90°.' },
    { id: 'kelso-shrug', name: 'Kelso Shrug', canonicalName: 'kelso_shrug', category: 'back', movementPattern: 'horizontal_pull', equipment: ['cable', 'barbell'], isCalisthenics: false, formNotes: 'Pull shoulder blades down and back, squeeze, then hang and stretch. Repeat until failure.' },
    { id: 'lat-prayer', name: 'Lat Prayer', canonicalName: 'lat_prayer', category: 'back', movementPattern: 'vertical_pull', equipment: ['cable'], isCalisthenics: false, formNotes: 'Slow rep cadence. Let lats fully stretch at top for 1-2 count.' },
    { id: 'reverse-pec-deck', name: 'Reverse Pec Deck', canonicalName: 'rear_delt_fly', category: 'back', movementPattern: 'horizontal_pull', equipment: ['machine'], isCalisthenics: false, formNotes: 'For rear delts. Can use cluster sets with heavier loading and partial reps.' },

    // Shoulders
    { id: 'lateral-db', name: 'Lateral Raise (Dumbbell)', canonicalName: 'lateral_raise', category: 'shoulders', movementPattern: 'isolation_shoulders', equipment: ['dumbbell'], isCalisthenics: false, formNotes: 'Raise in a path that doesn\'t hurt shoulders. Pause under tension at top. Lower under tension always.' },
    { id: 'lateral-cable', name: 'Lateral Raise (Cable)', canonicalName: 'lateral_raise', category: 'shoulders', movementPattern: 'isolation_shoulders', equipment: ['cable'], isCalisthenics: false, formNotes: 'Tension at the bottom is key. Don\'t pause at top, money is at stretched position.' },

    // Biceps
    { id: 'curl-barbell', name: 'Barbell Curl', canonicalName: 'bicep_curl', category: 'biceps', movementPattern: 'isolation_arms', equipment: ['barbell'], isCalisthenics: false, formNotes: 'Start with back stationary, triceps flexed. Raise shoulders as you curl. Keep wrists neutral.' },
    { id: 'curl-hammer', name: 'Hammer Curl', canonicalName: 'hammer_curl', category: 'biceps', movementPattern: 'isolation_arms', equipment: ['dumbbell'], isCalisthenics: false, formNotes: 'Keep upper arm and elbows in line with body. Don\'t turn into pseudo rows.' },
    { id: 'curl-spider', name: 'Spider Curl', canonicalName: 'spider_curl', category: 'biceps', movementPattern: 'isolation_arms', equipment: ['dumbbell', 'barbell'], isCalisthenics: false, formNotes: 'Elbows trapped in front of glass wall. Squeeze biased - no need to pause at bottom.' },
    { id: 'curl-preacher-db', name: 'Preacher Curl (Dumbbell)', canonicalName: 'preacher_curl', category: 'biceps', movementPattern: 'isolation_arms', equipment: ['dumbbell', 'preacher_bench'], isCalisthenics: false, formNotes: 'Keep butt and pits glued to bench. Wrists curled up for safety. Lower under tension.' },
    { id: 'curl-incline', name: 'Incline Curl (Dumbbell)', canonicalName: 'incline_curl', category: 'biceps', movementPattern: 'isolation_arms', equipment: ['dumbbell', 'incline_bench'], isCalisthenics: false, formNotes: 'Flex triceps at bottom. Avoid heaving with hips. Slow eccentric as you fatigue.' },

    // Triceps
    { id: 'pushdown-cable', name: 'Tricep Pushdown (Cable)', canonicalName: 'tricep_pushdown', category: 'triceps', movementPattern: 'isolation_arms', equipment: ['cable'], isCalisthenics: false, formNotes: 'Wide stance for stability. Track elbows back at top, push in front at bottom. Pause at lockout.' },
    { id: 'pushdown-incline', name: 'Incline Tricep Pressdown', canonicalName: 'tricep_pushdown', category: 'triceps', movementPattern: 'isolation_arms', equipment: ['cable', 'incline_bench'], isCalisthenics: false, formNotes: 'Bench at 60-70° for stability. Same form as regular pushdowns.' },
    { id: 'extension-incline-db', name: 'Incline Tricep Extension (Dumbbell)', canonicalName: 'tricep_extension', category: 'triceps', movementPattern: 'isolation_arms', equipment: ['dumbbell', 'incline_bench'], isCalisthenics: false, formNotes: 'Lead with elbows on descent. Keep upper arm position stable.' },

    // Legs - Quads
    { id: 'squat-platz', name: 'Platz Squat', canonicalName: 'squat', category: 'quads', movementPattern: 'squat', equipment: ['barbell'], isCalisthenics: false, formNotes: 'Go as low as possible pushing knees ahead of toes. Pause at bottom. One rest pause allowed per set.' },
    { id: 'squat-platz-paused', name: 'Platz Squat (Paused)', canonicalName: 'squat', category: 'quads', movementPattern: 'squat', equipment: ['barbell'], isCalisthenics: false, formNotes: 'Same as Platz Squat with added pause at bottom. Perfect practice makes perfect.' },
    { id: 'leg-extension', name: 'Leg Extension', canonicalName: 'leg_extension', category: 'quads', movementPattern: 'isolation_legs', equipment: ['machine'], isCalisthenics: false, formNotes: 'Substitution for Sissy Squats. Control the eccentric.' },
    { id: 'cossack-squat', name: 'Cossack Squat', canonicalName: 'cossack_squat', category: 'adductors', movementPattern: 'squat', equipment: ['bodyweight', 'dumbbell'], isCalisthenics: true, formNotes: 'Practice with bodyweight first. Own the eccentrics, push ROM deeper over time.' },

    // Legs - Hamstrings
    { id: 'curl-ham-lying', name: 'Lying Hamstring Curl', canonicalName: 'hamstring_curl', category: 'hamstrings', movementPattern: 'isolation_legs', equipment: ['machine'], isCalisthenics: false, formNotes: 'Lower under control, pause under tension at bottom. Add padding under hips for ROM. End when can\'t reach 90°.' },
    { id: 'curl-ham-seated', name: 'Seated Hamstring Curl', canonicalName: 'hamstring_curl', category: 'hamstrings', movementPattern: 'isolation_legs', equipment: ['machine'], isCalisthenics: false, formNotes: 'Lean forward to pre-stretch. No pause at shortened position. Pause 1 count at lengthened position.' },

    // Calves
    { id: 'calf-standing', name: 'Standing Calf Raise', canonicalName: 'calf_raise', category: 'calves', movementPattern: 'isolation_legs', equipment: ['machine', 'smith_machine'], isCalisthenics: false, formNotes: '3-4 second pause at bottom (no stretch reflex). Only come up halfway. One rest pause allowed.' },

    // Core
    { id: 'leg-raise', name: 'Leg Raise', canonicalName: 'leg_raise', category: 'core', movementPattern: 'core', equipment: ['dip_tower', 'pullup_bar'], isCalisthenics: true, formNotes: 'Only raise legs 3/4 up, don\'t lower all the way. Pause at top and bottom. Kicks out hip flexors.' },
    { id: 'oblique-raise', name: 'Hanging Oblique Knee Raise', canonicalName: 'oblique_raise', category: 'core', movementPattern: 'core', equipment: ['dip_tower', 'pullup_bar'], isCalisthenics: true, formNotes: 'Same as leg raises but flex into one side of obliques. Slow down as burn sets in.' },
    { id: 'crunch-bw', name: 'Crunch (Bodyweight)', canonicalName: 'crunch', category: 'core', movementPattern: 'core', equipment: ['floor', 'bench'], isCalisthenics: true, formNotes: 'Can giant set with calisthenics work. Add weight when you can do 20 reps.' }
];

// ============ Day Exercises for Plan A ============

function createDayExercise(
    dayId: string,
    exerciseId: string,
    order: number,
    schemeType: SchemeType,
    opts: {
        isOptional?: boolean;
        setsMin?: number;
        setsMax?: number;
        repsMin?: number;
        repsMax?: number;
        restSeconds?: number;
        notes?: string;
        currentPhaseReps?: number;
        blockId?: string;
    } = {}
): DayExercise {
    return {
        id: `de-${dayId}-${order}`,
        dayId,
        exerciseId,
        order,
        schemeType,
        blockId: opts.blockId,
        isOptional: opts.isOptional ?? false,
        setsMin: opts.setsMin ?? 2,
        setsMax: opts.setsMax ?? 3,
        repsMin: opts.repsMin ?? 8,
        repsMax: opts.repsMax ?? 12,
        restSeconds: opts.restSeconds ?? 120,
        notes: opts.notes ?? '',
        currentPhaseReps: opts.currentPhaseReps ?? 12
    };
}

// Exercise Blocks for supersets
const exerciseBlocks: ExerciseBlock[] = [
    // Day 2: Cable Row + Kelso Shrug superset
    { id: 'block-a2-row', dayId: 'day-a2', order: 3, blockType: 'superset', restSeconds: 150, exerciseIds: ['cable-row', 'kelso-shrug'] },

    // Day 5: Dip + Chin-Up superset
    { id: 'block-a5-dip-chin', dayId: 'day-a5', order: 1, blockType: 'superset', restSeconds: 120, exerciseIds: ['dip-assisted', 'chinup-bw'] },

    // Day 5: Incline Curl + Extension superset
    { id: 'block-a5-arms', dayId: 'day-a5', order: 2, blockType: 'superset', restSeconds: 120, exerciseIds: ['curl-incline', 'extension-incline-db'] }
];

// Day exercises - using Plan A (will duplicate for B and C)
const dayExercisesPlanA: DayExercise[] = [
    // Day 1: Upper Body 1
    createDayExercise('day-a1', 'bench-close', 1, 'TOP_SET_BACKOFF_TRIPLE', { setsMin: 3, setsMax: 4, repsMin: 12, repsMax: 12, restSeconds: 150, notes: '1 top set + 2-3 backoff sets at -15%', currentPhaseReps: 12 }),
    createDayExercise('day-a1', 'lateral-db', 2, 'DROP_SETS', { setsMin: 3, setsMax: 4, repsMin: 12, repsMax: 15, restSeconds: 60, notes: '1 top set + 2-3 drop sets' }),
    createDayExercise('day-a1', 'curl-barbell', 3, 'TOP_SET_BACKOFF_TRIPLE', { setsMin: 3, setsMax: 4, repsMin: 12, repsMax: 12, restSeconds: 120, notes: '1 top set + 2-3 backoff sets', currentPhaseReps: 12 }),
    createDayExercise('day-a1', 'curl-hammer', 4, 'DYNAMIC_DOUBLE_PROGRESSION', { isOptional: true, setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, restSeconds: 90, notes: 'Optional brachialis work' }),
    createDayExercise('day-a1', 'pushdown-cable', 5, 'TOP_SET_BACKOFF_TRIPLE', { setsMin: 3, setsMax: 4, repsMin: 15, repsMax: 15, restSeconds: 90, notes: '1 top set + 2-3 backoff sets', currentPhaseReps: 15 }),
    createDayExercise('day-a1', 'pullup-bw', 6, 'DOUBLE_PROGRESSION', { setsMin: 3, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 120, notes: 'Arms fatigued = more back engagement' }),
    createDayExercise('day-a1', 'leg-raise', 7, 'DOUBLE_PROGRESSION', { setsMin: 3, setsMax: 3, repsMin: 12, repsMax: 20, restSeconds: 75, notes: 'Optional cluster sets' }),

    // Day 2: Back + Legs
    createDayExercise('day-a2', 'squat-platz', 1, 'TOP_SET_BACKOFF_TRIPLE', { setsMin: 3, setsMax: 3, repsMin: 5, repsMax: 12, restSeconds: 180, notes: 'Option A: Top set 5-8, then add weight for 8-10, then 10-12', currentPhaseReps: 12 }),
    createDayExercise('day-a2', 'leg-extension', 2, 'DOUBLE_PROGRESSION', { isOptional: true, setsMin: 2, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 75, notes: 'Substituted for Sissy Squats' }),
    createDayExercise('day-a2', 'cable-row', 3, 'DOUBLE_PROGRESSION', { setsMin: 2, setsMax: 2, repsMin: 8, repsMax: 12, restSeconds: 150, notes: 'Superset with Kelso Shrugs', blockId: 'block-a2-row' }),
    createDayExercise('day-a2', 'kelso-shrug', 4, 'DOUBLE_PROGRESSION', { setsMin: 2, setsMax: 2, repsMin: 8, repsMax: 12, restSeconds: 150, notes: 'Immediately after rows', blockId: 'block-a2-row' }),
    createDayExercise('day-a2', 'lat-prayer', 5, 'DOUBLE_PROGRESSION', { isOptional: true, setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, restSeconds: 90, notes: 'Extra lat volume if needed' }),
    createDayExercise('day-a2', 'curl-ham-lying', 6, 'DYNAMIC_DOUBLE_PROGRESSION', { setsMin: 2, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 120, notes: 'Add padding under hips for ROM' }),
    createDayExercise('day-a2', 'calf-standing', 7, 'REST_PAUSE', { setsMin: 1, setsMax: 1, repsMin: 15, repsMax: 30, restSeconds: 0, notes: '3-4s pause at bottom, half reps up, one rest pause allowed' }),

    // Day 3: Upper Body 2
    createDayExercise('day-a3', 'bench-db', 1, 'DYNAMIC_DOUBLE_PROGRESSION', { setsMin: 3, setsMax: 4, repsMin: 8, repsMax: 12, restSeconds: 150, notes: 'Match Day 1 scheme at 80% load' }),
    createDayExercise('day-a3', 'pullup-neutral', 2, 'DYNAMIC_DOUBLE_PROGRESSION', { setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, restSeconds: 150, notes: 'Weighted if possible' }),
    createDayExercise('day-a3', 'curl-spider', 3, 'DYNAMIC_DOUBLE_PROGRESSION', { setsMin: 3, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 105, notes: 'Squeeze biased curl' }),
    createDayExercise('day-a3', 'curl-preacher-db', 4, 'DYNAMIC_DOUBLE_PROGRESSION', { isOptional: true, setsMin: 2, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 120, notes: 'Skip if doing optional squats' }),
    createDayExercise('day-a3', 'pushdown-incline', 5, 'DYNAMIC_DOUBLE_PROGRESSION', { setsMin: 3, setsMax: 3, repsMin: 8, repsMax: 12, restSeconds: 120, notes: 'Bench at 60-70°' }),
    createDayExercise('day-a3', 'oblique-raise', 6, 'DOUBLE_PROGRESSION', { setsMin: 3, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 90, notes: 'Skip if doing added leg work' }),

    // Day 4: Lower Body
    createDayExercise('day-a4', 'squat-platz-paused', 1, 'TOP_SET_BACKOFF_TRIPLE', { setsMin: 3, setsMax: 3, repsMin: 5, repsMax: 12, restSeconds: 180, notes: 'Match Day 2 scheme at 80-85% load', currentPhaseReps: 12 }),
    createDayExercise('day-a4', 'cossack-squat', 2, 'DOUBLE_PROGRESSION', { setsMin: 3, setsMax: 3, repsMin: 10, repsMax: 12, restSeconds: 120, notes: 'Adductor focus. Own the eccentrics.' }),
    createDayExercise('day-a4', 'leg-extension', 3, 'DOUBLE_PROGRESSION', { isOptional: true, setsMin: 2, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 90, notes: 'Beat the books from Day 2' }),
    createDayExercise('day-a4', 'lateral-cable', 4, 'DROP_SETS', { isOptional: true, setsMin: 3, setsMax: 4, repsMin: 12, repsMax: 15, restSeconds: 60, notes: 'Beat the books from Day 1' }),
    createDayExercise('day-a4', 'curl-ham-seated', 5, 'DYNAMIC_DOUBLE_PROGRESSION', { setsMin: 2, setsMax: 3, repsMin: 8, repsMax: 12, restSeconds: 120, notes: 'Optional cluster set' }),
    createDayExercise('day-a4', 'calf-standing', 6, 'REST_PAUSE', { setsMin: 1, setsMax: 1, repsMin: 15, repsMax: 30, restSeconds: 0, notes: 'Beat the books from Day 2' }),

    // Day 5: Upper Body 3 (Supersets)
    createDayExercise('day-a5', 'dip-assisted', 1, 'AMRAP', { setsMin: 3, setsMax: 3, repsMin: 10, repsMax: 20, restSeconds: 120, notes: 'Add weight when hitting 20 reps', blockId: 'block-a5-dip-chin' }),
    createDayExercise('day-a5', 'chinup-bw', 2, 'AMRAP', { setsMin: 3, setsMax: 3, repsMin: 10, repsMax: 20, restSeconds: 120, notes: 'Superset with dips', blockId: 'block-a5-dip-chin' }),
    createDayExercise('day-a5', 'curl-incline', 3, 'DYNAMIC_DOUBLE_PROGRESSION', { setsMin: 2, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 120, notes: 'Third time training biceps - filing gaps', blockId: 'block-a5-arms' }),
    createDayExercise('day-a5', 'extension-incline-db', 4, 'DYNAMIC_DOUBLE_PROGRESSION', { setsMin: 2, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 120, notes: 'Superset with incline curls', blockId: 'block-a5-arms' }),
    createDayExercise('day-a5', 'reverse-pec-deck', 5, 'DYNAMIC_DOUBLE_PROGRESSION', { isOptional: true, setsMin: 2, setsMax: 3, repsMin: 10, repsMax: 15, restSeconds: 90, notes: 'If rear delts need work. Cluster sets optional.' }),
    createDayExercise('day-a5', 'crunch-bw', 6, 'AMRAP', { setsMin: 3, setsMax: 3, repsMin: 15, repsMax: 30, restSeconds: 60, notes: 'Add weight at 20 reps. Giant set with calisthenics.' })
];

// ============ Seed Function ============

export async function seedDatabase(): Promise<void> {
    // Check if already seeded
    const programCount = await db.programs.count();
    if (programCount > 0) {
        console.log('Database already seeded');
        return;
    }

    await db.transaction('rw', [
        db.programs,
        db.plans,
        db.workoutDays,
        db.exercises,
        db.exerciseBlocks,
        db.dayExercises,
        db.settings
    ], async () => {
        // Add program
        await db.programs.add(program);

        // Add plans
        await db.plans.bulkAdd(plans);

        // Add workout days
        await db.workoutDays.bulkAdd(workoutDays);

        // Add exercises
        await db.exercises.bulkAdd(exercises);

        // Add exercise blocks
        await db.exerciseBlocks.bulkAdd(exerciseBlocks);

        // Add day exercises for Plan A
        await db.dayExercises.bulkAdd(dayExercisesPlanA);

        // Initialize settings with Plan A as default
        await db.settings.add({
            id: 'default',
            displayUnits: 'kg',
            restTimerSound: true,
            defaultRestSeconds: 120,
            currentPlanId: 'plan-a',
            currentWeek: 1,
            currentPhase: 1
        });
    });

    console.log('Database seeded successfully!');
}

export { program, plans, workoutDays, exercises, exerciseBlocks, dayExercisesPlanA };
