import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { db } from '../db/database';
import { formatWeight } from '../engine/progression';
import type { UserSettings, WorkoutSession, WorkoutDay, SetLog, Exercise } from '../db/schema';

interface HistoryProps {
    settings?: UserSettings;
}

export default function History({ settings }: HistoryProps) {
    const displayUnits = settings?.displayUnits ?? 'kg';
    const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

    // Query all sessions and filter completed ones
    const sessions = useLiveQuery(async () => {
        const allSessions = await db.sessions
            .orderBy('date')
            .reverse()
            .limit(50)
            .toArray();
        return allSessions.filter(s => s.completed === true);
    });

    const workoutDays = useLiveQuery(() => db.workoutDays.toArray());
    const exercises = useLiveQuery(() => db.exercises.toArray());

    const dayMap = new Map(workoutDays?.map(d => [d.id, d]) ?? []);
    const exerciseMap = new Map(exercises?.map(e => [e.id, e]) ?? []);

    if (sessions === undefined) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    const toggleExpand = (sessionId: string) => {
        setExpandedSessionId(prev => prev === sessionId ? null : sessionId);
    };

    return (
        <div className="page animate-fade-in">
            <header className="page-header">
                <h1 className="text-xl font-bold">Workout History</h1>
                <span className="text-sm text-tertiary">{sessions.length} workouts</span>
            </header>

            {sessions.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📋</div>
                    <h2 className="empty-state-title">No workouts yet</h2>
                    <p className="empty-state-text">Complete your first workout to see it here!</p>
                    <Link to="/workout" className="btn btn-primary">
                        Start Workout
                    </Link>
                </div>
            ) : (
                <div className="flex flex-col gap-sm">
                    {sessions.map(session => (
                        <SessionCard
                            key={session.id}
                            session={session}
                            day={dayMap.get(session.dayId)}
                            exerciseMap={exerciseMap}
                            displayUnits={displayUnits}
                            isExpanded={expandedSessionId === session.id}
                            onToggle={() => toggleExpand(session.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface SessionCardProps {
    session: WorkoutSession;
    day?: WorkoutDay;
    exerciseMap: Map<string, Exercise>;
    displayUnits: 'kg' | 'lb';
    isExpanded: boolean;
    onToggle: () => void;
}

function SessionCard({ session, day, exerciseMap, displayUnits, isExpanded, onToggle }: SessionCardProps) {
    const setLogs = useLiveQuery(
        () => db.setLogs.where('sessionId').equals(session.id).toArray(),
        [session.id]
    );

    const totalSets = setLogs?.length ?? 0;
    const totalVolume = setLogs?.reduce((sum, s) => sum + (s.weightKg * s.reps), 0) ?? 0;
    const duration = session.endTime && session.startTime
        ? Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 60000)
        : null;

    // Group sets by exercise
    const setsByExercise = new Map<string, SetLog[]>();
    setLogs?.forEach(log => {
        const existing = setsByExercise.get(log.exerciseId) ?? [];
        existing.push(log);
        setsByExercise.set(log.exerciseId, existing);
    });

    return (
        <div className="card animate-slide-up">
            {/* Header - clickable to expand */}
            <div
                className="flex items-center justify-between cursor-pointer"
                onClick={onToggle}
            >
                <div>
                    <h3 className="card-title">{day?.name ?? 'Workout'}</h3>
                    <p className="text-xs text-tertiary">
                        {format(new Date(session.date), 'EEE, MMM d, yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-sm">
                    <span className="badge badge-success">✓</span>
                    <span className="text-secondary" style={{ fontSize: '1.2rem' }}>
                        {isExpanded ? '▼' : '▶'}
                    </span>
                </div>
            </div>

            {/* Summary stats */}
            <div className="flex gap-lg text-sm mt-sm">
                <div>
                    <span className="text-tertiary">Sets: </span>
                    <span className="font-semibold">{totalSets}</span>
                </div>
                <div>
                    <span className="text-tertiary">Volume: </span>
                    <span className="font-semibold">{formatWeight(totalVolume, displayUnits)}</span>
                </div>
                {duration !== null && duration > 0 && (
                    <div>
                        <span className="text-tertiary">Time: </span>
                        <span className="font-semibold">{duration} min</span>
                    </div>
                )}
            </div>

            {/* Expanded details */}
            {isExpanded && setLogs && (
                <div className="mt-md pt-md" style={{ borderTop: '1px solid var(--border-color)' }}>
                    {Array.from(setsByExercise.entries()).map(([exerciseId, sets]) => {
                        const exercise = exerciseMap.get(exerciseId);
                        const bestSet = sets.reduce((best, s) =>
                            (s.weightKg * s.reps) > (best.weightKg * best.reps) ? s : best
                            , sets[0]);

                        return (
                            <ExerciseDetail
                                key={exerciseId}
                                exercise={exercise}
                                sets={sets}
                                bestSet={bestSet}
                                displayUnits={displayUnits}
                            />
                        );
                    })}

                    {/* Session note if exists */}
                    {session.notes && (
                        <div className="mt-md p-sm" style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                            <span className="text-xs text-tertiary">Session Note:</span>
                            <p className="text-sm">{session.notes}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

interface ExerciseDetailProps {
    exercise?: Exercise;
    sets: SetLog[];
    bestSet: SetLog;
    displayUnits: 'kg' | 'lb';
}

function ExerciseDetail({ exercise, sets, bestSet, displayUnits }: ExerciseDetailProps) {
    const [showSets, setShowSets] = useState(false);

    return (
        <div className="mb-sm">
            {/* Exercise summary row */}
            <div
                className="flex items-center justify-between p-sm cursor-pointer"
                style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}
                onClick={() => setShowSets(!showSets)}
            >
                <div className="flex items-center gap-sm">
                    <span className="text-secondary" style={{ fontSize: '0.8rem' }}>
                        {showSets ? '▼' : '▶'}
                    </span>
                    <span className="font-semibold text-sm">{exercise?.name ?? 'Exercise'}</span>
                </div>
                <div className="flex items-center gap-md text-xs">
                    <span className="text-tertiary">{sets.length} sets</span>
                    <span className="text-accent font-semibold">
                        {formatWeight(bestSet.weightKg, displayUnits)} × {bestSet.reps}
                    </span>
                </div>
            </div>

            {/* Individual sets */}
            {showSets && (
                <div className="pl-md mt-xs">
                    {sets.sort((a, b) => a.setNumber - b.setNumber).map(set => (
                        <div
                            key={set.id}
                            className="flex items-center justify-between py-xs text-xs"
                            style={{ borderBottom: '1px solid var(--border-subtle)' }}
                        >
                            <div className="flex items-center gap-sm">
                                <span className="text-tertiary">Set {set.setNumber}</span>
                                <span className={`badge badge-${set.setType === 'top' ? 'primary' : 'secondary'}`} style={{ fontSize: '0.65rem', padding: '2px 6px' }}>
                                    {set.setType}
                                </span>
                            </div>
                            <div className="flex items-center gap-md">
                                <span>{formatWeight(set.weightKg, displayUnits)} × {set.reps}</span>
                                <span className={`quality-dot ${set.repQuality}`} title={set.repQuality}></span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
