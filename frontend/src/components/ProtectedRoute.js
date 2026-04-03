import React from 'react';
import { Navigate } from 'react-router-dom';
import { getUser } from '../utils/auth';

function ProtectedRoute({ children, requiredRole }) {
  const user = getUser();
  
  if (!user) {
    return <Navigate to="/login" />;
  }
  
  if (requiredRole && user.role !== requiredRole && user.role !== 'admin') {
    return <Navigate to="/browse" />;
  }
  
  return children;
}

export default ProtectedRoute;