import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Browse from './pages/Browse';
import SoftwareDetails from './pages/SoftwareDetails';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/browse" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/software/:id" element={<SoftwareDetails />} />
      </Routes>
    </Router>
  );
}

export default App;