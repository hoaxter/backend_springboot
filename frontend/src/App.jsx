import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import RiderDashboard from './pages/RiderDashboard';
import DriverDashboard from './pages/DriverDashboard';

function getUser() {
  const u = localStorage.getItem('user');
  return u ? JSON.parse(u) : null;
}

function ProtectedRoute({ children, role }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to={user.role === 'RIDER' ? '/rider' : '/driver'} />;
  return children;
}

export default function App() {
  const [, setRefresh] = useState(0);
  const forceRefresh = () => setRefresh(n => n + 1);
  const user = getUser();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.role === 'RIDER' ? '/rider' : '/driver'} /> : <Login onAuth={forceRefresh} />} />
        <Route path="/register" element={user ? <Navigate to={user.role === 'RIDER' ? '/rider' : '/driver'} /> : <Register onAuth={forceRefresh} />} />
        <Route path="/rider" element={<ProtectedRoute role="RIDER"><RiderDashboard onLogout={forceRefresh} /></ProtectedRoute>} />
        <Route path="/driver" element={<ProtectedRoute role="DRIVER"><DriverDashboard onLogout={forceRefresh} /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to={user ? (user.role === 'RIDER' ? '/rider' : '/driver') : '/login'} />} />
      </Routes>
    </BrowserRouter>
  );
}
