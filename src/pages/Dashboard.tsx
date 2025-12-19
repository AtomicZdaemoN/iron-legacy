import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { db, getExerciseHistory } from '../db/database';
import { calculateE1RM, formatWeight } from '../engine/progression';
import type { UserSettings, SetLog } from '../db/schema';

interface DashboardProps {
    settings?: UserSettings;
}

export default function Dashboard({ settings }: DashboardProps) {
    const displayUnits = settings?.displayUnits ?? 'kg';
    const [selectedExerciseId, setSelectedExerciseId] = useState<string>('bench-close');

    const exercises = useLiveQuery(() => db.exercises.toArray());

    // Loading state
    if (!exercises) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page animate-fade-in">
            <header className="page-header">
                <h1 className="text-xl font-bold">Progress</h1>
            </header>

            <section className="mb-lg">
                <h2 className="text-lg font-semibold mb-md">Exercise Progress</h2>

                {/* Exercise Selector */}
                <select
                    className="input w-full mb-md"
                    value={selectedExerciseId}
                    onChange={e => setSelectedExerciseId(e.target.value)}
                >
                    {exercises.map(ex => (
                        <option key={ex.id} value={ex.id}>{ex.name}</option>
                    ))}
                </select>

                <ExerciseChart
                    exerciseId={selectedExerciseId}
                    displayUnits={displayUnits}
                />
            </section>

            <section>
                <h2 className="text-lg font-semibold mb-md">Key Lifts Overview</h2>
                <div className="flex flex-col gap-sm">
                    <KeyLiftCard exerciseId="bench-close" displayUnits={displayUnits} />
                    <KeyLiftCard exerciseId="squat-platz" displayUnits={displayUnits} />
                    <KeyLiftCard exerciseId="curl-barbell" displayUnits={displayUnits} />
                    <KeyLiftCard exerciseId="pushdown-cable" displayUnits={displayUnits} />
                </div>
            </section>
        </div>
    );
}

interface ExerciseChartProps {
    exerciseId: string;
    displayUnits: 'kg' | 'lb';
}

function ExerciseChart({ exerciseId, displayUnits }: ExerciseChartProps) {
    const [chartData, setChartData] = useState<{ date: string; e1rm: number; reps: number; weight: number }[]>([]);

    useLiveQuery(async () => {
        const history = await getExerciseHistory(exerciseId, 20);

        if (!history.length) {
            setChartData([]);
            return;
        }

        const data = history.map((sessionSets: SetLog[]) => {
            const bestSet = sessionSets.reduce((best, set) => {
                const e1rm = calculateE1RM(set.weightKg, set.reps);
                const bestE1rm = calculateE1RM(best.weightKg, best.reps);
                return e1rm > bestE1rm ? set : best;
            });

            return {
                date: format(new Date(bestSet.timestamp), 'MM/dd'),
                e1rm: Math.round(calculateE1RM(bestSet.weightKg, bestSet.reps) * 10) / 10,
                reps: bestSet.reps,
                weight: bestSet.weightKg
            };
        });

        setChartData(data);
    }, [exerciseId]);

    if (!chartData.length) {
        return (
            <div className="card">
                <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                    <div className="empty-state-icon">📊</div>
                    <p className="text-secondary">No data yet for this exercise</p>
                    <p className="text-xs text-tertiary mt-sm">Complete a workout to see your progress here</p>
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <h3 className="card-title mb-md">Estimated 1RM Trend</h3>
            <div style={{ width: '100%', height: 200 }}>
                <ResponsiveContainer>
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="e1rmGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#d4a853" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#d4a853" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis
                            dataKey="date"
                            tick={{ fill: '#888', fontSize: 11 }}
                            axisLine={{ stroke: '#444' }}
                            tickLine={{ stroke: '#444' }}
                        />
                        <YAxis
                            tick={{ fill: '#888', fontSize: 11 }}
                            axisLine={{ stroke: '#444' }}
                            tickLine={{ stroke: '#444' }}
                            domain={['dataMin - 5', 'dataMax + 5']}
                            width={40}
                        />
                        <Tooltip
                            contentStyle={{
                                background: '#1a1a1d',
                                border: '1px solid #333',
                                borderRadius: '8px',
                                padding: '8px 12px'
                            }}
                            labelStyle={{ color: '#f5f5f7', marginBottom: 4 }}
                            itemStyle={{ color: '#d4a853' }}
                            formatter={(value) => [`${formatWeight(value as number, displayUnits)} e1RM`, '']}
                        />
                        <Area
                            type="monotone"
                            dataKey="e1rm"
                            stroke="#d4a853"
                            strokeWidth={2}
                            fill="url(#e1rmGradient)"
                            dot={{ fill: '#d4a853', r: 4, stroke: '#1a1a1d', strokeWidth: 2 }}
                            activeDot={{ r: 6, fill: '#d4a853' }}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-between mt-sm text-xs text-tertiary">
                <span>Oldest</span>
                <span>Most Recent</span>
            </div>
        </div>
    );
}

interface KeyLiftCardProps {
    exerciseId: string;
    displayUnits: 'kg' | 'lb';
}

function KeyLiftCard({ exerciseId, displayUnits }: KeyLiftCardProps) {
    const exercise = useLiveQuery(() => db.exercises.get(exerciseId), [exerciseId]);
    const [stats, setStats] = useState<{ bestE1rm: number; lastWeight: number; lastReps: number } | null>(null);

    useLiveQuery(async () => {
        const history = await getExerciseHistory(exerciseId, 10);
        if (!history.length) {
            setStats(null);
            return;
        }

        // Find best e1RM across all sessions
        let bestE1rm = 0;
        let lastWeight = 0;
        let lastReps = 0;

        history.forEach((sessionSets: SetLog[]) => {
            sessionSets.forEach(set => {
                const e1rm = calculateE1RM(set.weightKg, set.reps);
                if (e1rm > bestE1rm) {
                    bestE1rm = e1rm;
                }
            });
        });

        // Get last session's best set
        const lastSession = history[history.length - 1];
        if (lastSession?.length) {
            const lastBest = lastSession.reduce((best: SetLog, set: SetLog) => {
                const e1rm = calculateE1RM(set.weightKg, set.reps);
                const bestE1rm = calculateE1RM(best.weightKg, best.reps);
                return e1rm > bestE1rm ? set : best;
            });
            lastWeight = lastBest.weightKg;
            lastReps = lastBest.reps;
        }

        setStats({ bestE1rm, lastWeight, lastReps });
    }, [exerciseId]);

    if (!exercise) return null;

    return (
        <div className="card">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="font-semibold">{exercise.name}</h4>
                    {stats ? (
                        <p className="text-sm text-secondary">
                            Last: {formatWeight(stats.lastWeight, displayUnits)} × {stats.lastReps}
                        </p>
                    ) : (
                        <p className="text-sm text-tertiary">No data yet</p>
                    )}
                </div>
                {stats && (
                    <div className="text-right">
                        <p className="text-lg font-bold text-accent">
                            {formatWeight(stats.bestE1rm, displayUnits)}
                        </p>
                        <p className="text-xs text-tertiary">Best e1RM</p>
                    </div>
                )}
            </div>
        </div>
    );
}
