import { db } from './database';
import type { ExportData } from './schema';

const EXPORT_VERSION = 1;

/**
 * Export all user data as JSON (for backup)
 */
export async function exportAllData(): Promise<ExportData> {
    const [
        programs,
        plans,
        workoutDays,
        exercises,
        exerciseBlocks,
        dayExercises,
        sessions,
        setLogs,
        sessionExerciseNotes,
        baselines,
        settingsArray
    ] = await Promise.all([
        db.programs.toArray(),
        db.plans.toArray(),
        db.workoutDays.toArray(),
        db.exercises.toArray(),
        db.exerciseBlocks.toArray(),
        db.dayExercises.toArray(),
        db.sessions.toArray(),
        db.setLogs.toArray(),
        db.sessionExerciseNotes.toArray(),
        db.baselines.toArray(),
        db.settings.toArray()
    ]);

    return {
        version: EXPORT_VERSION,
        exportedAt: new Date(),
        programs,
        plans,
        workoutDays,
        exercises,
        exerciseBlocks,
        dayExercises,
        sessions,
        setLogs,
        sessionExerciseNotes,
        baselines,
        settings: settingsArray[0] ?? {
            id: 'default',
            displayUnits: 'kg',
            restTimerSound: true,
            defaultRestSeconds: 120,
            currentWeek: 1,
            currentPhase: 1
        }
    };
}

/**
 * Download export data as a JSON file
 */
export function downloadBackup(data: ExportData): void {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `iron-legacy-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Import data from a backup JSON file
 * WARNING: This will overwrite existing data
 */
export async function importData(data: ExportData): Promise<void> {
    if (!data.version || data.version > EXPORT_VERSION) {
        throw new Error(`Unsupported backup version: ${data.version}`);
    }

    await db.transaction('rw', [
        db.programs,
        db.plans,
        db.workoutDays,
        db.exercises,
        db.exerciseBlocks,
        db.dayExercises,
        db.sessions,
        db.setLogs,
        db.sessionExerciseNotes,
        db.baselines,
        db.settings
    ], async () => {
        // Clear existing data
        await Promise.all([
            db.sessions.clear(),
            db.setLogs.clear(),
            db.sessionExerciseNotes.clear(),
            db.baselines.clear()
        ]);

        // Import workout data (sessions, sets, notes, baselines)
        if (data.sessions?.length) await db.sessions.bulkAdd(data.sessions);
        if (data.setLogs?.length) await db.setLogs.bulkAdd(data.setLogs);
        if (data.sessionExerciseNotes?.length) await db.sessionExerciseNotes.bulkAdd(data.sessionExerciseNotes);
        if (data.baselines?.length) await db.baselines.bulkAdd(data.baselines);

        // Update settings
        if (data.settings) {
            await db.settings.put(data.settings);
        }
    });
}

/**
 * Parse and validate a backup file
 */
export function parseBackupFile(content: string): ExportData {
    try {
        const data = JSON.parse(content);

        // Basic validation
        if (!data.version || !data.exportedAt) {
            throw new Error('Invalid backup file format');
        }

        return data as ExportData;
    } catch (e) {
        throw new Error(`Failed to parse backup file: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
}
