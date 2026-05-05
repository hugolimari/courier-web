import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreatePackagePage } from './pages/CreatePackagePage';
import { PackageMapPage } from './pages/PackageMapPage';
import { DeliverPackagePage } from './pages/DeliverPackagePage';
import { PackageHistoryPage } from './pages/PackageHistoryPage';
import { PublicTrackingPage } from './pages/PublicTrackingPage';
import { ManageUsersPage } from './pages/ManageUsersPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Public routes — no authentication required */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/track" element={<PublicTrackingPage />} />

      {/* Protected routes — JWT required */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard"             element={<DashboardPage />} />
        <Route path="/history"               element={<PackageHistoryPage />} />
        <Route path="/users"                 element={<ManageUsersPage />} />
        <Route path="/packages/new"          element={<CreatePackagePage />} />
        <Route path="/packages/:id/map"      element={<PackageMapPage />} />
        <Route path="/packages/:id/deliver"  element={<DeliverPackagePage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
