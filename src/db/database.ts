import Dexie, { type Table } from 'dexie';
import type {
    Program,
    Plan,
    WorkoutDay,
    Exercise,
    ExerciseBlock,
    DayExercise,
    WorkoutSession,
    SetLog,
    ExerciseBaseline,
    UserSettings,
    SessionExerciseNote
} from './schema';

class IronLegacyDB extends Dexie {
    programs!: Table<Program>;
    plans!: Table<Plan>;
    workoutDays!: Table<WorkoutDay>;
    exercises!: Table<Exercise>;
    exerciseBlocks!: Table<ExerciseBlock>;
    dayExercises!: Table<DayExercise>;
    sessions!: Table<WorkoutSession>;
    setLogs!: Table<SetLog>;
    baselines!: Table<ExerciseBaseline>;
    settings!: Table<UserSettings>;
    sessionExerciseNotes!: Table<SessionExerciseNote>;

    constructor() {
        super('iron-legacy');

        // Version 1: Initial schema
        this.version(1).stores({
            programs: 'id, name',
            plans: 'id, programId',
            workoutDays: 'id, planId, dayNumber, [planId+dayNumber]',
            exercises: 'id, canonicalName, category, movementPattern',
            exerciseBlocks: 'id, dayId, order',
            dayExercises: 'id, dayId, blockId, exerciseId, order, [dayId+order]',
            sessions: 'id, planId, dayId, date, completed, [dayId+date], [planId+date]',
            setLogs: 'id, sessionId, exerciseId, dayExerciseId, timestamp, [exerciseId+timestamp], [sessionId+setNumber], [dayExerciseId+timestamp]',
            baselines: 'id, exerciseId, dayExerciseId, [dayExerciseId+setNumber+phaseReps]',
            settings: 'id'
        });

        // Version 2: Add session exercise notes
        this.version(2).stores({
            sessionExerciseNotes: 'id, sessionId, exerciseId, [sessionId+exerciseId]'
        });
    }
}

export const db = new IronLegacyDB();

// ============ Helper Functions ============

/**
 * Get the last session for a specific workout day
 */
export async function getLastSessionForDay(dayId: string): Promise<WorkoutSession | undefined> {
    return db.sessions
        .where('dayId')
        .equals(dayId)
        .reverse()
        .first();
}

/**
 * Get all sets from the last time an exercise was performed
 */
export async function getLastSetsForExercise(
    exerciseId: string,
    dayExerciseId: string
): Promise<SetLog[]> {
    // Find the most recent session that includes this exercise
    const recentSet = await db.setLogs
        .where('[exerciseId+timestamp]')
        .between([exerciseId, Dexie.minKey], [exerciseId, Dexie.maxKey])
        .reverse()
        .first();

    if (!recentSet) return [];

    // Get all sets from that session for this day exercise
    return db.setLogs
        .where('sessionId')
        .equals(recentSet.sessionId)
        .and(set => set.dayExerciseId === dayExerciseId)
        .sortBy('setNumber');
}

/**
 * Get exercise history for charting (last N sessions)
 */
export async function getExerciseHistory(
    exerciseId: string,
    limit: number = 20
): Promise<SetLog[][]> {
    const allSets = await db.setLogs
        .where('exerciseId')
        .equals(exerciseId)
        .reverse()
        .toArray();

    // Group by session
    const sessionMap = new Map<string, SetLog[]>();
    for (const set of allSets) {
        if (!sessionMap.has(set.sessionId)) {
            sessionMap.set(set.sessionId, []);
        }
        sessionMap.get(set.sessionId)!.push(set);
    }

    // Return limited sessions, sorted by timestamp
    const sessions = Array.from(sessionMap.values())
        .slice(0, limit)
        .map(sets => sets.sort((a, b) => a.setNumber - b.setNumber));

    return sessions.reverse(); // Oldest first for charting
}

/**
 * Get or create user settings
 */
export async function getSettings(): Promise<UserSettings> {
    let settings = await db.settings.get('default');

    if (!settings) {
        settings = {
            id: 'default',
            displayUnits: 'kg',
            restTimerSound: true,
            defaultRestSeconds: 120,
            currentWeek: 1,
            currentPhase: 1,
            theme: 'dark'
        };
        await db.settings.put(settings);
    }

    // Ensure theme exists (migration for existing users)
    if (!settings.theme) {
        settings.theme = 'dark';
        await db.settings.put(settings);
    }

    return settings;
}

/**
 * Update user settings
 */
export async function updateSettings(updates: Partial<UserSettings>): Promise<void> {
    await db.settings.update('default', updates);
}

/**
 * Clear all data (for testing/debugging)
 */
export async function clearAllData(): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
            await table.clear();
        }
    });
}

/**
 * Check if database has been seeded
 */
export async function isDatabaseSeeded(): Promise<boolean> {
    const count = await db.programs.count();
    return count > 0;
}
