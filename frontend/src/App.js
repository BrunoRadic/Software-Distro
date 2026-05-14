import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Browse from './pages/Browse';
import SoftwareDetails from './pages/SoftwareDetails';
import UploadSoftware from './pages/UploadSoftware';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import AdminPanel from './pages/AdminPanel';
import Register from './pages/Register';
import UploadVersion from './pages/UploadVersion';
import Favorites from './pages/Favorites';
import DownloadHistory from './pages/DownloadHistory';

function App() {
  return (
    <Router>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/browse" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/browse" element={<Browse />} />
        <Route
          path="/favorites"
          element={
            <ProtectedRoute>
              <Favorites />
            </ProtectedRoute>
          }
        />
        <Route
          path="/downloads"
          element={
            <ProtectedRoute>
              <DownloadHistory />
            </ProtectedRoute>
          }
        />
        <Route path="/software/:id" element={<SoftwareDetails />} />
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute requiredRole="developer">
              <UploadSoftware />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/upload-version/:id" 
          element={
            <ProtectedRoute requiredRole="developer">
              <UploadVersion />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute requiredRole="admin">
              <AdminPanel />
            </ProtectedRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;