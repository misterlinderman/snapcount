import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth0 } from '@auth0/auth0-react';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import DeckViewPage from './pages/DeckViewPage';
import LockerRoomPage from './pages/LockerRoomPage';
import PlayPage from './pages/PlayPage';
import Profile from './pages/Profile';
import HowToPlayPage from './pages/HowToPlayPage';
import SeasonMapPage from './pages/SeasonMapPage';
import ProtectedRoute from './components/ProtectedRoute';
import RequireAdmin from './components/RequireAdmin';
import Loading from './components/Loading';
import { useApiAuth } from './hooks/useApiAuth';
import AdminLayout from './pages/admin/AdminLayout';
import AdminCardsPage from './pages/admin/AdminCardsPage';
import AdminPlaymakersPage from './pages/admin/AdminPlaymakersPage';
import AdminUpgradesPage from './pages/admin/AdminUpgradesPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminMatchupsPage from './pages/admin/AdminMatchupsPage';
import AdminUsersListPage from './pages/admin/AdminUsersListPage';
import AdminUserDetailPage from './pages/admin/AdminUserDetailPage';
import AdminSessionsPage from './pages/admin/AdminSessionsPage';
import AdminSessionReplayPage from './pages/admin/AdminSessionReplayPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';

function App() {
  const { isLoading } = useAuth0();
  
  // Set up Auth0 token for API requests
  useApiAuth();

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/play"
          element={
            <ProtectedRoute>
              <PlayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/season"
          element={
            <ProtectedRoute>
              <SeasonMapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/locker/:sessionId"
          element={
            <ProtectedRoute>
              <LockerRoomPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/decks/:deckId"
          element={
            <ProtectedRoute>
              <DeckViewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route
          path="/how-to-play"
          element={
            <ProtectedRoute>
              <HowToPlayPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboardPage />} />
          <Route path="cards" element={<AdminCardsPage />} />
          <Route path="playmakers" element={<AdminPlaymakersPage />} />
          <Route path="upgrades" element={<AdminUpgradesPage />} />
          <Route path="matchups" element={<AdminMatchupsPage />} />
          <Route path="users" element={<AdminUsersListPage />} />
          <Route path="users/:userId" element={<AdminUserDetailPage />} />
          <Route path="sessions" element={<AdminSessionsPage />} />
          <Route path="sessions/:sessionId" element={<AdminSessionReplayPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
        </Route>
      </Routes>
    </Layout>
  );
}

export default App;
