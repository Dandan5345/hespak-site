import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AppShell } from './layout/AppShell';
import Onboarding from './pages/Onboarding';
import Home from './pages/Home';
import Calendar from './pages/Calendar';
import Tasks from './pages/Tasks';
import Courses from './pages/Courses';
import Chat from './pages/Chat';
import Focus from './pages/Focus';
import Habits from './pages/Habits';
import Stats from './pages/Stats';
import Profile from './pages/Profile';
import Settings from './pages/Settings';

const ONBOARDED_KEY = 'sf_onboarded';
export function hasOnboarded() {
  return localStorage.getItem(ONBOARDED_KEY) === '1';
}
export function markOnboarded() {
  localStorage.setItem(ONBOARDED_KEY, '1');
}

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  if (!hasOnboarded()) {
    return <Navigate to="/onboarding" replace state={{ from: location }} />;
  }
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/onboarding" element={<Onboarding />} />
      <Route
        path="/*"
        element={
          <RequireOnboarding>
            <AppShell>
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/tasks" element={<Tasks />} />
                <Route path="/courses" element={<Courses />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/focus" element={<Focus />} />
                <Route path="/habits" element={<Habits />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </RequireOnboarding>
        }
      />
    </Routes>
  );
}
