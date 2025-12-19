import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { v4 as uuid } from 'uuid';
import { db, getLastSetsForExercise } from '../db/database';
import { suggestProgression, formatWeight } from '../engine/progression';
import type {
    UserSettings,
    DayExercise,
    Exercise,
    SetLog,
    WorkoutSession,
    RepQuality,
    SetType
} from '../db/schema';

interface WorkoutProps {
    settings?: UserSettings;
}

export default function Workout({ settings }: WorkoutProps) {
    const { dayId } = useParams();
    const navigate = useNavigate();
    const displayUnits = settings?.displayUnits ?? 'kg';

    const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
    const [sessionSets, setSessionSets] = useState<SetLog[]>([]);
    const [restTimer, setRestTimer] = useState<{ active: boolean; seconds: number; target: number }>({
        active: false,
        seconds: 0,
        target: settings?.defaultRestSeconds ?? 120
    });

    // Get workout day data
    const selectedDayId = dayId ?? `day-a1`;

    const workoutDay = useLiveQuery(
        () => db.workoutDays.get(selectedDayId),
        [selectedDayId]
    );

    const dayExercises = useLiveQuery(
        () => db.dayExercises.where('dayId').equals(selectedDayId).sortBy('order'),
        [selectedDayId]
    );

    const exerciseIds = dayExercises?.map(de => de.exerciseId) ?? [];
    const exercises = useLiveQuery(
        () => db.exercises.where('id').anyOf(exerciseIds).toArray(),
        [exerciseIds.join(',')]
    );

    // Start a new session when entering workout
    useEffect(() => {
        if (workoutDay && !activeSession) {
            const session: WorkoutSession = {
                id: uuid(),
                planId: workoutDay.planId,
                dayId: workoutDay.id,
                date: new Date(),
                startTime: new Date(),
                notes: '',
                completed: false
            };
            setActiveSession(session);
        }
    }, [workoutDay, activeSession]);

    // Rest timer countdown
    useEffect(() => {
        let interval: number | null = null;
        if (restTimer.active && restTimer.seconds < restTimer.target) {
            interval = window.setInterval(() => {
                setRestTimer(prev => {
                    const newSeconds = prev.seconds + 1;
                    if (newSeconds >= prev.target) {
                        // Timer complete - play sound if enabled
                        if (settings?.restTimerSound !== false) {
                            try {
                                const audioCtx = new AudioContext();
                                const oscillator = audioCtx.createOscillator();
                                const gainNode = audioCtx.createGain();
                                oscillator.connect(gainNode);
                                gainNode.connect(audioCtx.destination);
                                oscillator.frequency.value = 800;
                                oscillator.type = 'sine';
                                gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
                                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                                oscillator.start(audioCtx.currentTime);
                                oscillator.stop(audioCtx.currentTime + 0.5);
                            } catch (e) {
                                // Sound not supported
                            }
                        }
                        return { ...prev, seconds: newSeconds, active: false };
                    }
                    return { ...prev, seconds: newSeconds };
                });
            }, 1000);
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [restTimer.active, restTimer.seconds, restTimer.target, settings?.restTimerSound]);

    // Save session on completion
    const saveSession = useCallback(async () => {
        if (activeSession && sessionSets.length > 0) {
            const completedSession = {
                ...activeSession,
                endTime: new Date(),
                completed: true
            };
            await db.sessions.put(completedSession);
            await db.setLogs.bulkPut(sessionSets);
        }
    }, [activeSession, sessionSets]);

    const handleFinishWorkout = async () => {
        await saveSession();
        navigate('/');
    };

    const startRestTimer = (seconds: number = settings?.defaultRestSeconds ?? 120) => {
        setRestTimer({ active: true, seconds: 0, target: seconds });
    };

    const stopRestTimer = () => {
        setRestTimer(prev => ({ ...prev, active: false }));
    };

    const adjustTimerTarget = (delta: number) => {
        setRestTimer(prev => ({ ...prev, target: Math.max(15, prev.target + delta) }));
    };

    // Add set WITHOUT auto-starting timer - timer starts on save/confirm
    const addSet = (dayExerciseId: string, exerciseId: string, setData: Partial<SetLog>) => {
        if (!activeSession) return;

        const existingSets = sessionSets.filter(s => s.dayExerciseId === dayExerciseId);
        const newSetNumber = existingSets.length + 1;

        const newSet: SetLog = {
            id: uuid(),
            sessionId: activeSession.id,
            exerciseId,
            dayExerciseId,
            setNumber: newSetNumber,
            setType: setData.setType ?? 'working',
            weightKg: setData.weightKg ?? 0,
            externalLoadKg: setData.externalLoadKg ?? 0,
            reps: setData.reps ?? 0,
            rpe: setData.rpe,
            repQuality: setData.repQuality ?? 'ok',
            tempo: setData.tempo,
            notes: setData.notes ?? '',
            modifiers: setData.modifiers ?? [],
            timestamp: new Date()
        };

        setSessionSets(prev => [...prev, newSet]);
        // Timer will start when user confirms the set (in SetRow handleSave)
    };

    const updateSet = (setId: string, updates: Partial<SetLog>, shouldStartTimer: boolean = false) => {
        setSessionSets(prev =>
            prev.map(set => set.id === setId ? { ...set, ...updates } : set)
        );
        // Start timer when set is confirmed/saved
        if (shouldStartTimer) {
            startRestTimer();
        }
    };

    const deleteSet = (setId: string) => {
        setSessionSets(prev => {
            const filtered = prev.filter(set => set.id !== setId);
            // Renumber remaining sets per dayExerciseId
            const byDayExercise = new Map<string, SetLog[]>();
            filtered.forEach(set => {
                if (!byDayExercise.has(set.dayExerciseId)) {
                    byDayExercise.set(set.dayExerciseId, []);
                }
                byDayExercise.get(set.dayExerciseId)!.push(set);
            });

            const renumbered: SetLog[] = [];
            byDayExercise.forEach(sets => {
                sets.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
                sets.forEach((set, idx) => {
                    renumbered.push({ ...set, setNumber: idx + 1 });
                });
            });

            return renumbered;
        });
    };

    if (!workoutDay || !dayExercises || !exercises) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    const exerciseMap = new Map(exercises.map(e => [e.id, e]));
    const totalSets = sessionSets.length;
    const totalVolume = sessionSets.reduce((sum, s) => sum + (s.weightKg * s.reps), 0);

    return (
        <div className="page animate-fade-in">
            {/* Sticky Header with Rest Timer */}
            <header className="page-header sticky">
                <div>
                    <h1 className="text-xl font-bold">Day {workoutDay.dayNumber}</h1>
                    <p className="text-secondary text-sm">{workoutDay.name}</p>
                </div>
                <div className="flex items-center gap-sm">
                    {restTimer.active && (
                        <RestTimerBadge
                            seconds={restTimer.seconds}
                            target={restTimer.target}
                            onStop={stopRestTimer}
                        />
                    )}
                    <button className="btn btn-primary btn-sm" onClick={handleFinishWorkout}>
                        Finish ✓
                    </button>
                </div>
            </header>

            {/* Session Stats */}
            <div className="flex gap-lg mb-md text-sm">
                <div>
                    <span className="text-tertiary">Sets: </span>
                    <span className="font-semibold text-accent">{totalSets}</span>
                </div>
                <div>
                    <span className="text-tertiary">Volume: </span>
                    <span className="font-semibold">{formatWeight(totalVolume, displayUnits)}</span>
                </div>
                {/* Manual timer start button */}
                {!restTimer.active && (
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => startRestTimer()}
                        style={{ marginLeft: 'auto' }}
                    >
                        ⏱️ Start Timer
                    </button>
                )}
            </div>

            {/* Exercise List */}
            <div className="flex flex-col gap-md">
                {dayExercises.map((dayExercise, index) => {
                    const exercise = exerciseMap.get(dayExercise.exerciseId);
                    if (!exercise) return null;

                    const sets = sessionSets.filter(s => s.dayExerciseId === dayExercise.id);

                    return (
                        <ExerciseCard
                            key={dayExercise.id}
                            index={index + 1}
                            exercise={exercise}
                            dayExercise={dayExercise}
                            sets={sets}
                            displayUnits={displayUnits}
                            onAddSet={(setData) => addSet(dayExercise.id, exercise.id, setData)}
                            onUpdateSet={updateSet}
                            onDeleteSet={deleteSet}
                        />
                    );
                })}
            </div>

            {/* Floating Rest Timer (when active) */}
            {restTimer.active && (
                <div className="rest-timer-floating">
                    <RestTimerDisplay
                        seconds={restTimer.seconds}
                        target={restTimer.target}
                        onStop={stopRestTimer}
                        onAdjust={adjustTimerTarget}
                    />
                </div>
            )}

            <div className="mt-lg mb-xl">
                <button className="btn btn-primary btn-block btn-lg" onClick={handleFinishWorkout}>
                    Complete Workout 🎉
                </button>
            </div>
        </div>
    );
}

// Rest Timer Badge (compact, in header)
function RestTimerBadge({ seconds, target, onStop }: { seconds: number; target: number; onStop: () => void }) {
    const remaining = Math.max(0, target - seconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const progress = Math.min(seconds / target, 1);
    const isComplete = seconds >= target;

    return (
        <button
            className={`rest-timer-badge ${isComplete ? 'complete' : ''}`}
            onClick={onStop}
            title="Click to stop timer"
        >
            <span className="timer-text">{mins}:{secs.toString().padStart(2, '0')}</span>
            <span className="timer-progress" style={{ width: `${progress * 100}%` }} />
        </button>
    );
}

// Rest Timer Display (floating overlay) - now with ±15s buttons
function RestTimerDisplay({
    seconds,
    target,
    onStop,
    onAdjust
}: {
    seconds: number;
    target: number;
    onStop: () => void;
    onAdjust: (delta: number) => void;
}) {
    const remaining = Math.max(0, target - seconds);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    const isComplete = seconds >= target;

    return (
        <div className={`rest-timer-display ${isComplete ? 'complete' : ''}`}>
            <div className="timer-circle">
                <span className="timer-time">{mins}:{secs.toString().padStart(2, '0')}</span>
                <span className="timer-label">{isComplete ? 'Rest Complete!' : 'Resting...'}</span>
            </div>
            <div className="timer-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => onAdjust(-15)}>−15s</button>
                <button className="btn btn-ghost btn-sm" onClick={() => onAdjust(15)}>+15s</button>
                <button className="btn btn-secondary btn-sm" onClick={onStop}>Skip</button>
            </div>
        </div>
    );
}

interface ExerciseCardProps {
    index: number;
    exercise: Exercise;
    dayExercise: DayExercise;
    sets: SetLog[];
    displayUnits: 'kg' | 'lb';
    onAddSet: (setData: Partial<SetLog>) => void;
    onUpdateSet: (setId: string, updates: Partial<SetLog>, startTimer?: boolean) => void;
    onDeleteSet: (setId: string) => void;
}

function ExerciseCard({
    index,
    exercise,
    dayExercise,
    sets,
    displayUnits,
    onAddSet,
    onUpdateSet,
    onDeleteSet
}: ExerciseCardProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    // Get last performance for this exercise
    const lastSets = useLiveQuery(
        () => getLastSetsForExercise(exercise.id, dayExercise.id),
        [exercise.id, dayExercise.id]
    );

    // Get progression suggestions
    const suggestions = lastSets ? suggestProgression(
        dayExercise.schemeType,
        lastSets,
        dayExercise
    ) : [];

    const mainSuggestion = suggestions[0];

    // Get scheme badge color
    const getSchemeColor = () => {
        switch (dayExercise.schemeType) {
            case 'TOP_SET_BACKOFF_TRIPLE': return 'var(--scheme-triple)';
            case 'DOUBLE_PROGRESSION': return 'var(--scheme-double)';
            case 'DYNAMIC_DOUBLE_PROGRESSION': return 'var(--scheme-dynamic)';
            case 'DROP_SETS': return 'var(--scheme-drop)';
            case 'AMRAP': return 'var(--scheme-amrap)';
            case 'REST_PAUSE': return 'var(--scheme-rest-pause)';
            default: return 'var(--scheme-cluster)';
        }
    };

    const handleQuickAddSet = () => {
        // Copy from last set or create new
        const lastSet = sets[sets.length - 1] || lastSets?.[0];

        let setType: SetType = 'working';
        if (sets.length === 0 && dayExercise.schemeType === 'TOP_SET_BACKOFF_TRIPLE') {
            setType = 'top';
        } else if (dayExercise.schemeType === 'TOP_SET_BACKOFF_TRIPLE' && sets.length > 0) {
            setType = 'backoff';
        } else if (dayExercise.schemeType === 'DROP_SETS') {
            setType = sets.length === 0 ? 'top' : 'drop';
        } else if (dayExercise.schemeType === 'REST_PAUSE') {
            setType = 'rest_pause';
        }

        onAddSet({
            setType,
            weightKg: lastSet?.weightKg ?? 0,
            externalLoadKg: lastSet?.externalLoadKg ?? 0,
            reps: lastSet?.reps ?? dayExercise.repsMin,
            repQuality: 'ok'
        });
    };

    return (
        <div className="card exercise-card animate-slide-up">
            <div
                className="exercise-header"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: 'pointer' }}
            >
                <div>
                    <div className="flex items-center gap-sm mb-xs">
                        <span className="text-tertiary font-mono text-sm">{index}.</span>
                        <h3 className="exercise-name">{exercise.name}</h3>
                        {dayExercise.isOptional && (
                            <span className="badge badge-optional">Optional</span>
                        )}
                    </div>
                    <div className="exercise-meta">
                        <span
                            className="badge"
                            style={{ background: getSchemeColor(), color: '#000' }}
                        >
                            {dayExercise.schemeType.replace(/_/g, ' ')}
                        </span>
                        <span>{dayExercise.setsMin}-{dayExercise.setsMax} × {dayExercise.repsMin}-{dayExercise.repsMax}</span>
                    </div>
                </div>
                <div className="flex items-center gap-sm">
                    {sets.length > 0 && (
                        <span className="badge badge-success">{sets.length}</span>
                    )}
                    <span className="text-secondary">{isExpanded ? '▼' : '▶'}</span>
                </div>
            </div>

            {isExpanded && (
                <div className="animate-fade-in">
                    {/* Last Performance */}
                    {lastSets && lastSets.length > 0 && (
                        <div className="mt-md p-sm" style={{ background: 'var(--bg-tertiary)', borderRadius: 'var(--radius-md)' }}>
                            <p className="text-xs text-tertiary mb-xs">Last time:</p>
                            <div className="flex gap-sm flex-wrap">
                                {lastSets.slice(0, 4).map((set, i) => (
                                    <span key={i} className="text-sm font-mono">
                                        {formatWeight(set.weightKg, displayUnits)} × {set.reps}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Progression Hint */}
                    {mainSuggestion && (
                        <div className="progression-hint">
                            <span className="progression-hint-icon">💡</span>
                            <div>
                                <p className="progression-hint-short">{mainSuggestion.shortMessage}</p>
                                <p className="progression-hint-text text-sm">{mainSuggestion.reasoning}</p>
                            </div>
                        </div>
                    )}

                    {/* Current Session Sets */}
                    <div className="exercise-sets mt-md">
                        {sets.map((set) => (
                            <SetRow
                                key={set.id}
                                set={set}
                                displayUnits={displayUnits}
                                onUpdate={(updates, startTimer) => onUpdateSet(set.id, updates, startTimer)}
                                onDelete={() => onDeleteSet(set.id)}
                            />
                        ))}

                        {/* Add Set Button */}
                        <button
                            className="btn btn-secondary btn-block mt-sm"
                            onClick={handleQuickAddSet}
                        >
                            + Add Set
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

interface SetRowProps {
    set: SetLog;
    displayUnits: 'kg' | 'lb';
    onUpdate: (updates: Partial<SetLog>, startTimer?: boolean) => void;
    onDelete: () => void;
}

function SetRow({ set, displayUnits, onUpdate, onDelete }: SetRowProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [weight, setWeight] = useState(set.weightKg);
    const [reps, setReps] = useState(set.reps);
    const [quality, setQuality] = useState<RepQuality>(set.repQuality);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Start editing immediately for new sets (weight = 0)
    useEffect(() => {
        if (set.weightKg === 0 && set.reps === 0) {
            setIsEditing(true);
        }
    }, [set.weightKg, set.reps]);

    const handleSave = () => {
        onUpdate({ weightKg: weight, reps, repQuality: quality }, true); // Start timer on save
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (showDeleteConfirm) {
            onDelete();
        } else {
            setShowDeleteConfirm(true);
            setTimeout(() => setShowDeleteConfirm(false), 3000);
        }
    };

    const getSetTypeLabel = () => {
        switch (set.setType) {
            case 'top': return 'TOP';
            case 'backoff': return 'B';
            case 'drop': return 'D';
            case 'warmup': return 'W';
            case 'rest_pause': return 'RP';
            default: return `#${set.setNumber}`;
        }
    };

    if (isEditing) {
        return (
            <div className="set-row-editing animate-fade-in">
                {/* Row 1: Set type label */}
                <div className="set-row-header">
                    <span className={`set-type-badge ${set.setType === 'top' ? 'top' : ''}`}>
                        {getSetTypeLabel()}
                    </span>
                    <button
                        className={`btn btn-icon btn-sm ${showDeleteConfirm ? 'btn-danger' : 'btn-ghost'}`}
                        onClick={handleDelete}
                    >
                        {showDeleteConfirm ? '🗑️' : '×'}
                    </button>
                </div>

                {/* Row 2: Weight and Reps side by side */}
                <div className="set-row-inputs">
                    <div className="input-group-compact">
                        <label className="text-xs text-tertiary">Weight ({displayUnits})</label>
                        <div className="input-stepper-compact">
                            <button className="btn-stepper" onClick={() => setWeight(w => Math.max(0, w - 2.5))}>−</button>
                            <input
                                type="number"
                                className="input-compact"
                                value={weight}
                                onChange={e => setWeight(Number(e.target.value))}
                                step="2.5"
                            />
                            <button className="btn-stepper" onClick={() => setWeight(w => w + 2.5)}>+</button>
                        </div>
                    </div>
                    <div className="input-group-compact">
                        <label className="text-xs text-tertiary">Reps</label>
                        <div className="input-stepper-compact">
                            <button className="btn-stepper" onClick={() => setReps(r => Math.max(0, r - 1))}>−</button>
                            <input
                                type="number"
                                className="input-compact"
                                value={reps}
                                onChange={e => setReps(Number(e.target.value))}
                            />
                            <button className="btn-stepper" onClick={() => setReps(r => r + 1)}>+</button>
                        </div>
                    </div>
                </div>

                {/* Row 3: Quality and Save */}
                <div className="set-row-footer">
                    <div className="quality-selector-large">
                        <button
                            className={`quality-btn-large clean ${quality === 'clean' ? 'active' : ''}`}
                            onClick={() => setQuality('clean')}
                        >
                            ✓
                        </button>
                        <button
                            className={`quality-btn-large ok ${quality === 'ok' ? 'active' : ''}`}
                            onClick={() => setQuality('ok')}
                        >
                            ~
                        </button>
                        <button
                            className={`quality-btn-large sloppy ${quality === 'sloppy' ? 'active' : ''}`}
                            onClick={() => setQuality('sloppy')}
                        >
                            !
                        </button>
                    </div>
                    <button className="btn btn-primary" onClick={handleSave}>
                        Save Set ✓
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div
            className="set-row-display animate-slide-up"
            onClick={() => setIsEditing(true)}
        >
            <span className={`set-type-badge ${set.setType === 'top' ? 'top' : ''}`}>
                {getSetTypeLabel()}
            </span>
            <div className="set-value">
                <span className="set-weight">{formatWeight(set.weightKg, displayUnits)}</span>
                <span className="set-unit">{displayUnits}</span>
            </div>
            <div className="set-value">
                <span className="set-reps">{set.reps}</span>
                <span className="set-unit">reps</span>
            </div>
            <span className={`quality-dot ${set.repQuality}`} />
        </div>
    );
}
