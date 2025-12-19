import { useLiveQuery } from 'dexie-react-hooks';
import { Link } from 'react-router-dom';
import { db } from '../db/database';
import type { UserSettings, WorkoutDay } from '../db/schema';

interface HomeProps {
    settings?: UserSettings;
}

// Get phase label
function getPhaseLabel(phase: number): string {
    switch (phase) {
        case 1: return '12 reps';
        case 2: return '8 reps';
        case 3: return '5 reps';
        default: return `Phase ${phase}`;
    }
}

export default function Home({ settings }: HomeProps) {
    const currentPlanId = settings?.currentPlanId ?? 'plan-a';

    const plan = useLiveQuery(
        () => db.plans.get(currentPlanId),
        [currentPlanId]
    );

    const workoutDays = useLiveQuery(
        () => db.workoutDays.where('planId').equals(currentPlanId).sortBy('dayNumber'),
        [currentPlanId]
    );

    const todayIndex = new Date().getDay(); // 0 = Sunday
    // Map to workout day: Mon=1, Tue=2, etc. Saturday=6 maps to day 5
    const suggestedDayNumber = todayIndex === 0 ? null : Math.min(todayIndex, plan?.daysPerWeek ?? 5);
    const todayWorkout = workoutDays?.find(d => d.dayNumber === suggestedDayNumber);

    // Loading state
    if (!workoutDays || !plan) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page animate-fade-in">
            <header className="page-header">
                <div>
                    <h1 className="page-title">Iron Legacy</h1>
                    <p className="text-secondary text-sm">by Diego Leyva</p>
                </div>
                <div className="flex flex-col items-end gap-xs">
                    <span className="badge badge-week">
                        Week {settings?.currentWeek ?? 1}
                    </span>
                    <span className="text-xs text-secondary">
                        {getPhaseLabel(settings?.currentPhase ?? 1)}
                    </span>
                </div>
            </header>

            <section className="mb-lg">
                <h2 className="text-lg font-semibold mb-md">Today's Workout</h2>
                {suggestedDayNumber && todayWorkout ? (
                    <Link to={`/workout/${todayWorkout.id}`} className="card today-card" style={{ textDecoration: 'none' }}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-accent">
                                    Day {suggestedDayNumber}
                                </h3>
                                <p className="text-secondary">
                                    {todayWorkout.name}
                                </p>
                            </div>
                            <button className="btn btn-primary">
                                Start →
                            </button>
                        </div>
                    </Link>
                ) : (
                    <div className="card">
                        <p className="text-secondary">Rest day! 🧘</p>
                        <p className="text-sm text-tertiary mt-sm">
                            Or pick a workout below if you're feeling strong.
                        </p>
                    </div>
                )}
            </section>

            <section className="mb-lg">
                <div className="flex items-center justify-between mb-md">
                    <h2 className="text-lg font-semibold">All Workouts</h2>
                    <span className="text-sm text-secondary">{plan?.name}</span>
                </div>

                <div className="flex flex-col gap-sm">
                    {workoutDays.map((day) => (
                        <DayCard key={day.id} day={day} />
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-lg font-semibold mb-md">Quick Actions</h2>
                <div className="flex flex-col gap-sm">
                    <Link to="/history" className="card" style={{ textDecoration: 'none' }}>
                        <div className="flex items-center gap-md">
                            <span className="text-xl">📋</span>
                            <div>
                                <h4 className="card-title">View History</h4>
                                <p className="text-sm text-secondary">See past workouts and progress</p>
                            </div>
                        </div>
                    </Link>
                    <Link to="/dashboard" className="card" style={{ textDecoration: 'none' }}>
                        <div className="flex items-center gap-md">
                            <span className="text-xl">📊</span>
                            <div>
                                <h4 className="card-title">Progress Charts</h4>
                                <p className="text-sm text-secondary">Track strength gains over time</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </section>
        </div>
    );
}

function DayCard({ day }: { day: WorkoutDay }) {
    return (
        <Link to={`/workout/${day.id}`} style={{ textDecoration: 'none' }}>
            <div className="card">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-md">
                        <div className="day-number-badge">
                            <span>{day.dayNumber}</span>
                        </div>
                        <div>
                            <h3 className="card-title">{day.name}</h3>
                            <p className="text-xs text-tertiary">~{day.estimatedDuration} min</p>
                        </div>
                    </div>
                    <span className="text-secondary">→</span>
                </div>
            </div>
        </Link>
    );
}
