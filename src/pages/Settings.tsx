import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings, updateSettings, clearAllData } from '../db/database';
import type { ExportData } from '../db/schema';

// Utility: Get phase from week
function getPhaseFromWeek(week: number): number {
    if (week <= 4) return 1;
    if (week <= 8) return 2;
    return 3;
}

// Utility: Get phase label
function getPhaseLabel(phase: number): string {
    switch (phase) {
        case 1: return 'Phase 1 (12 reps)';
        case 2: return 'Phase 2 (8 reps)';
        case 3: return 'Phase 3 (5 reps)';
        default: return `Phase ${phase}`;
    }
}

export default function Settings() {
    const settings = useLiveQuery(() => getSettings());
    const [exportStatus, setExportStatus] = useState<string | null>(null);
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // Apply theme to document
    useEffect(() => {
        if (settings?.theme) {
            document.documentElement.setAttribute('data-theme', settings.theme);
        }
    }, [settings?.theme]);

    // Calculate current phase from week
    const currentPhase = settings ? getPhaseFromWeek(settings.currentWeek) : 1;

    const handleThemeChange = async (theme: 'dark' | 'light') => {
        await updateSettings({ theme });
    };

    const handleWeekChange = async (week: number) => {
        const phase = getPhaseFromWeek(week);
        await updateSettings({ currentWeek: week, currentPhase: phase });
    };

    const handleAdvanceWeek = async () => {
        if (!settings) return;
        let nextWeek = settings.currentWeek + 1;
        if (nextWeek > 12) nextWeek = 1;
        await handleWeekChange(nextWeek);
    };

    const handleRestartProgram = async () => {
        if (showResetConfirm) {
            await updateSettings({ currentWeek: 1, currentPhase: 1 });
            setShowResetConfirm(false);
        } else {
            setShowResetConfirm(true);
            setTimeout(() => setShowResetConfirm(false), 3000);
        }
    };

    const handleClearHistory = async () => {
        if (showClearConfirm) {
            await db.sessions.clear();
            await db.setLogs.clear();
            await db.sessionExerciseNotes.clear();
            await db.baselines.clear();
            setShowClearConfirm(false);
        } else {
            setShowClearConfirm(true);
            setTimeout(() => setShowClearConfirm(false), 3000);
        }
    };

    const handleExport = async () => {
        try {
            setExportStatus('Exporting...');
            const data: ExportData = {
                version: 1,
                exportedAt: new Date(),
                programs: await db.programs.toArray(),
                plans: await db.plans.toArray(),
                workoutDays: await db.workoutDays.toArray(),
                exercises: await db.exercises.toArray(),
                exerciseBlocks: await db.exerciseBlocks.toArray(),
                dayExercises: await db.dayExercises.toArray(),
                sessions: await db.sessions.toArray(),
                setLogs: await db.setLogs.toArray(),
                sessionExerciseNotes: await db.sessionExerciseNotes.toArray(),
                baselines: await db.baselines.toArray(),
                settings: settings!
            };

            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `iron-legacy-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();

            URL.revokeObjectURL(url);
            setExportStatus('Export complete! ✓');
            setTimeout(() => setExportStatus(null), 3000);
        } catch (err) {
            setExportStatus('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setImportStatus('Importing...');
            const text = await file.text();
            const data: ExportData = JSON.parse(text);

            if (data.version !== 1) {
                throw new Error('Unsupported backup version');
            }

            await clearAllData();

            await db.transaction('rw', db.tables, async () => {
                if (data.programs.length) await db.programs.bulkAdd(data.programs);
                if (data.plans.length) await db.plans.bulkAdd(data.plans);
                if (data.workoutDays.length) await db.workoutDays.bulkAdd(data.workoutDays);
                if (data.exercises.length) await db.exercises.bulkAdd(data.exercises);
                if (data.exerciseBlocks.length) await db.exerciseBlocks.bulkAdd(data.exerciseBlocks);
                if (data.dayExercises.length) await db.dayExercises.bulkAdd(data.dayExercises);
                if (data.sessions.length) await db.sessions.bulkAdd(data.sessions);
                if (data.setLogs.length) await db.setLogs.bulkAdd(data.setLogs);
                if (data.sessionExerciseNotes?.length) await db.sessionExerciseNotes.bulkAdd(data.sessionExerciseNotes);
                if (data.baselines.length) await db.baselines.bulkAdd(data.baselines);
                if (data.settings) await db.settings.put(data.settings);
            });

            setImportStatus('Import complete! Refreshing...');
            setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
            setImportStatus('Import failed: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    if (!settings) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page animate-fade-in">
            <header className="page-header">
                <h1 className="text-xl font-bold">Settings</h1>
            </header>

            {/* Theme */}
            <section className="card mb-md">
                <h3 className="card-title mb-md">Appearance</h3>
                <div className="flex gap-sm">
                    <button
                        className={`btn flex-1 ${settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleThemeChange('dark')}
                    >
                        🌙 Dark
                    </button>
                    <button
                        className={`btn flex-1 ${settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleThemeChange('light')}
                    >
                        ☀️ Light
                    </button>
                </div>
            </section>

            {/* Program Progress */}
            <section className="card mb-md">
                <h3 className="card-title mb-md">Program Progress</h3>

                <div className="flex items-center justify-between mb-md p-sm" style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                    <div>
                        <p className="text-lg font-semibold text-accent">Week {settings.currentWeek}</p>
                        <p className="text-sm text-secondary">{getPhaseLabel(currentPhase)}</p>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={handleAdvanceWeek}>
                        {settings.currentWeek >= 12 ? 'Start New Cycle →' : 'Next Week →'}
                    </button>
                </div>

                <div className="mb-md">
                    <label className="input-label mb-xs" style={{ display: 'block' }}>Select Week</label>
                    <div className="flex gap-xs flex-wrap">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(w => (
                            <button
                                key={w}
                                className={`btn btn-sm ${settings.currentWeek === w ? 'btn-primary' : 'btn-ghost'}`}
                                onClick={() => handleWeekChange(w)}
                                style={{ minWidth: 40 }}
                            >
                                {w}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="text-xs text-tertiary">
                    <p>📅 Weeks 1-4: Phase 1 (12 reps)</p>
                    <p>📅 Weeks 5-8: Phase 2 (8 reps)</p>
                    <p>📅 Weeks 9-12: Phase 3 (5 reps)</p>
                </div>

                <button
                    className={`btn btn-sm mt-md ${showResetConfirm ? 'btn-danger' : 'btn-ghost'}`}
                    onClick={handleRestartProgram}
                >
                    {showResetConfirm ? 'Confirm Reset?' : 'Reset to Week 1'}
                </button>
            </section>

            {/* Data Management */}
            <section className="card mb-md">
                <h3 className="card-title mb-md">Data</h3>

                <div className="flex flex-col gap-sm">
                    <button className="btn btn-secondary" onClick={handleExport}>
                        📤 Export Backup (JSON)
                    </button>

                    <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                        📥 Import Backup
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            style={{ display: 'none' }}
                        />
                    </label>

                    <button
                        className={`btn ${showClearConfirm ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={handleClearHistory}
                    >
                        {showClearConfirm ? '⚠️ Confirm Clear All History?' : '🗑️ Clear Workout History'}
                    </button>
                </div>

                {exportStatus && <p className="text-sm mt-sm text-secondary">{exportStatus}</p>}
                {importStatus && <p className="text-sm mt-sm text-secondary">{importStatus}</p>}
            </section>

            {/* About */}
            <section className="card">
                <h3 className="card-title mb-sm">About</h3>
                <p className="text-lg font-semibold mb-xs">Iron Legacy</p>
                <p className="text-sm text-secondary mb-sm">by Diego Leyva</p>
                <p className="text-xs text-tertiary">
                    A personal workout tracker for strength & hypertrophy training.
                </p>
                <p className="text-xs text-tertiary mt-sm">v1.0.0</p>
            </section>
        </div>
    );
}
