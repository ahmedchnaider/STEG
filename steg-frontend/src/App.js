import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Incidents from './components/Incidents';
import Analysis from './components/Analysis';
import Reports from './components/Reports';
import Users from './components/Users';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in
    const checkAuth = () => {
      const token = localStorage.getItem('token');
      setIsAuthenticated(!!token);
      setIsLoading(false);
    };
    checkAuth();
  }, []);

  // Protected Route component
  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return <div>Loading...</div>;
    }
    return isAuthenticated ? children : <Navigate to="/" />;
  };

  // Handle login success
  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route 
            path="/" 
            element={
              isAuthenticated ? 
                <Navigate to="/dashboard" /> : 
                <Login onLoginSuccess={handleLoginSuccess} />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/incidents" 
            element={
              <ProtectedRoute>
                <Incidents onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analysis" 
            element={
              <ProtectedRoute>
                <Analysis onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute>
                <Reports onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/users" 
            element={
              <ProtectedRoute>
                <Users onLogout={handleLogout} />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 