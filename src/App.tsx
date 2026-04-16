import { Routes, Route, Navigate } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CreatePackagePage } from './pages/CreatePackagePage';
import { PackageMapPage } from './pages/PackageMapPage';
import { DeliverPackagePage } from './pages/DeliverPackagePage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/packages/new" element={<CreatePackagePage />} />
        <Route path="/packages/:id/map" element={<PackageMapPage />} />
        <Route path="/packages/:id/deliver" element={<DeliverPackagePage />} />
      </Route>

      {/* Default */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
