import { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { getSettings, isDatabaseSeeded } from './db/database';
import { seedDatabase } from './db/seedData';

// Pages
import Home from './pages/Home';
import Workout from './pages/Workout';
import History from './pages/History';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';

import './index.css';

function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function initialize() {
      try {
        const seeded = await isDatabaseSeeded();
        if (!seeded) {
          await seedDatabase();
        }
        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Initialization error:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize app');
        setIsLoading(false);
      }
    }
    initialize();
  }, []);

  if (isLoading) {
    return (
      <div className="app-container">
        <div className="loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-container">
        <div className="page">
          <div className="empty-state">
            <div className="empty-state-icon">⚠️</div>
            <h2 className="empty-state-title">Something went wrong</h2>
            <p className="empty-state-text">{error}</p>
            <button
              className="btn btn-primary"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Only render app content after database is ready
  return isReady ? <AppContent /> : null;
}

function AppContent() {
  // Now safe to query settings since database is seeded
  const settings = useLiveQuery(() => getSettings());

  return (
    <HashRouter>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Home settings={settings} />} />
          <Route path="/workout" element={<Workout settings={settings} />} />
          <Route path="/workout/:dayId" element={<Workout settings={settings} />} />
          <Route path="/history" element={<History settings={settings} />} />
          <Route path="/dashboard" element={<Dashboard settings={settings} />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>

        <BottomNav />
      </div>
    </HashRouter>
  );
}

function BottomNav() {
  const location = useLocation();

  // Detect if we're in an active workout
  const isInWorkout = location.pathname.startsWith('/workout/');

  return (
    <nav className={`bottom-nav ${isInWorkout ? 'workout-active' : ''}`}>
      <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} end>
        <span className="nav-icon">🏠</span>
        <span>Home</span>
      </NavLink>
      <NavLink to="/workout" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">💪</span>
        <span>Workout</span>
      </NavLink>
      <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">📋</span>
        <span>History</span>
      </NavLink>
      <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">📊</span>
        <span>Progress</span>
      </NavLink>
      <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
        <span className="nav-icon">⚙️</span>
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}

export default App;
