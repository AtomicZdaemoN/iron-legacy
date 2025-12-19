// Database schema types for Iron Legacy

// ============ Enums ============

export type SchemeType =
    | 'TOP_SET_BACKOFF_TRIPLE'
    | 'DOUBLE_PROGRESSION'
    | 'DYNAMIC_DOUBLE_PROGRESSION'
    | 'DROP_SETS'
    | 'CLUSTER_SET'
    | 'AMRAP'
    | 'PYRAMID_UP'
    | 'REST_PAUSE';

export type BlockType = 'straight' | 'superset' | 'giant';

export type SetType = 'warmup' | 'top' | 'backoff' | 'drop' | 'working' | 'rest_pause';

export type RepQuality = 'clean' | 'ok' | 'sloppy';

export type MovementPattern =
    | 'horizontal_push'
    | 'horizontal_pull'
    | 'vertical_push'
    | 'vertical_pull'
    | 'squat'
    | 'hinge'
    | 'isolation_arms'
    | 'isolation_shoulders'
    | 'isolation_legs'
    | 'core';

export type MuscleCategory =
    | 'chest'
    | 'back'
    | 'shoulders'
    | 'biceps'
    | 'triceps'
    | 'quads'
    | 'hamstrings'
    | 'glutes'
    | 'calves'
    | 'core'
    | 'adductors';

// ============ Core Entities ============

export interface Program {
    id: string;
    name: string;
    description?: string;
    createdAt: Date;
}

export interface Plan {
    id: string;
    programId: string;
    name: string;
    daysPerWeek: number;
}

export interface WorkoutDay {
    id: string;
    planId: string;
    dayNumber: number;
    name: string;
    focus: string;
    estimatedDuration: number; // minutes
}

export interface Exercise {
    id: string;
    name: string;
    canonicalName: string;
    category: MuscleCategory;
    movementPattern: MovementPattern;
    equipment: string[];
    isCalisthenics: boolean;
    formNotes?: string;
}

export interface ExerciseBlock {
    id: string;
    dayId: string;
    order: number;
    blockType: BlockType;
    restSeconds: number;
    exerciseIds: string[];
}

export interface DayExercise {
    id: string;
    dayId: string;
    blockId?: string;
    exerciseId: string;
    order: number;
    schemeType: SchemeType;
    isOptional: boolean;
    setsMin: number;
    setsMax: number;
    repsMin: number;
    repsMax: number;
    restSeconds: number;
    notes: string;
    currentPhaseReps: number;
}

// ============ Workout Logging ============

export interface WorkoutSession {
    id: string;
    planId: string;
    dayId: string;
    date: Date;
    startTime: Date;
    endTime?: Date;
    bodyweightKg?: number;
    notes: string;
    completed: boolean;
}

export interface SetLog {
    id: string;
    sessionId: string;
    exerciseId: string;
    dayExerciseId: string;
    blockId?: string;
    setNumber: number;
    setType: SetType;
    weightKg: number;
    externalLoadKg: number; // For calisthenics: + = added, - = assistance
    reps: number;
    rpe?: number;
    repQuality: RepQuality;
    tempo?: string;
    notes: string;
    modifiers: string[];
    timestamp: Date;
}

// ============ Baseline / Personal Records ============

export interface ExerciseBaseline {
    id: string;
    exerciseId: string;
    dayExerciseId: string;
    setNumber: number;
    weightKg: number;
    reps: number;
    establishedAt: Date;
    phaseReps: number; // 12, 8, or 5
}

// ============ User Settings ============

export interface UserSettings {
    id: string;
    displayUnits: 'kg' | 'lb';
    restTimerSound: boolean;
    defaultRestSeconds: number;
    currentPlanId?: string;
    currentWeek: number;
    currentPhase: number; // 1, 2, or 3
}

// ============ Per-Exercise Session Notes ============

export interface SessionExerciseNote {
    id: string;
    sessionId: string;
    exerciseId: string;
    note: string;
    createdAt: Date;
}

// ============ Export/Import ============

export interface ExportData {
    version: number;
    exportedAt: Date;
    programs: Program[];
    plans: Plan[];
    workoutDays: WorkoutDay[];
    exercises: Exercise[];
    exerciseBlocks: ExerciseBlock[];
    dayExercises: DayExercise[];
    sessions: WorkoutSession[];
    setLogs: SetLog[];
    sessionExerciseNotes: SessionExerciseNote[];
    baselines: ExerciseBaseline[];
    settings: UserSettings;
}

