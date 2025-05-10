import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ onLogout }) => {
  // Use try-catch to handle potential router context issues
  let currentPath = '/';
  try {
    const location = useLocation();
    currentPath = location.pathname;
  } catch (error) {
    // If useLocation fails, default to '/'
    console.warn('Router context not available');
  }

  const handleLogout = () => {
    // Call the onLogout prop if provided, otherwise just clear localStorage
    if (onLogout) {
      onLogout();
    } else {
      localStorage.removeItem('token');
      // Redirect to login page
      window.location.href = '/';
    }
  };

  return (
    <div style={{
      width: '200px',
      backgroundColor: 'white',
      borderRight: '1px solid #e0e0e0',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '2px 0 5px rgba(0, 0, 0, 0.05)',
      height: '100%'
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottom: '1px solid #e0e0e0'
      }}>
        <img 
          src="/logosteg.jpg" 
          alt="STEG Logo" 
          style={{
            width: '150px', 
            height: '150px',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Navigation Menu - Using flex with space-between to center vertically */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: '20px 0'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px' // Add consistent gap between menu items
        }}>
          <Link to="/dashboard" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            backgroundColor: currentPath === "/dashboard" ? '#e3f2fd' : 'transparent',
            color: currentPath === "/dashboard" ? '#1976d2' : '#666',
            borderLeft: currentPath === "/dashboard" ? '3px solid #1976d2' : 'none',
            textDecoration: 'none'
          }}>
            <svg style={{ marginRight: '10px' }} width="20" height="20" viewBox="0 0 24 24" fill={currentPath === "/dashboard" ? "#1976d2" : "#666"}>
              <path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>
            </svg>
            <span>Dashboard</span>
          </Link>
          
          <Link to="/incidents" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            backgroundColor: currentPath === "/incidents" ? '#e3f2fd' : 'transparent',
            color: currentPath === "/incidents" ? '#1976d2' : '#666',
            borderLeft: currentPath === "/incidents" ? '3px solid #1976d2' : 'none',
            textDecoration: 'none'
          }}>
            <svg style={{ marginRight: '10px' }} width="20" height="20" viewBox="0 0 24 24" fill={currentPath === "/incidents" ? "#1976d2" : "#666"}>
              <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 9h-2V5h2v6zm4 0h-2v-2h2v2z"/>
            </svg>
            <span>Incidents</span>
          </Link>
          
          <Link to="/analysis" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            backgroundColor: currentPath === "/analysis" ? '#e3f2fd' : 'transparent',
            color: currentPath === "/analysis" ? '#1976d2' : '#666',
            borderLeft: currentPath === "/analysis" ? '3px solid #1976d2' : 'none',
            textDecoration: 'none'
          }}>
            <svg style={{ marginRight: '10px' }} width="20" height="20" viewBox="0 0 24 24" fill={currentPath === "/analysis" ? "#1976d2" : "#666"}>
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/>
            </svg>
            <span>Analysis</span>
          </Link>
          
          <Link to="/reports" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            backgroundColor: currentPath === "/reports" ? '#e3f2fd' : 'transparent',
            color: currentPath === "/reports" ? '#1976d2' : '#666',
            borderLeft: currentPath === "/reports" ? '3px solid #1976d2' : 'none',
            textDecoration: 'none'
          }}>
            <svg style={{ marginRight: '10px' }} width="20" height="20" viewBox="0 0 24 24" fill={currentPath === "/reports" ? "#1976d2" : "#666"}>
              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20M10,13H7V11H10V13M14,13H11V11H14V13M10,16H7V14H10V16M14,16H11V14H14V16Z"/>
            </svg>
            <span>Reports</span>
          </Link>
          
          <Link to="/users" style={{
            display: 'flex',
            alignItems: 'center',
            padding: '12px 20px',
            backgroundColor: currentPath === "/users" ? '#e3f2fd' : 'transparent',
            color: currentPath === "/users" ? '#1976d2' : '#666',
            borderLeft: currentPath === "/users" ? '3px solid #1976d2' : 'none',
            textDecoration: 'none'
          }}>
            <svg style={{ marginRight: '10px' }} width="20" height="20" viewBox="0 0 24 24" fill={currentPath === "/users" ? "#1976d2" : "#666"}>
              <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
            </svg>
            <span>Users</span>
          </Link>
          
          <div 
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 20px',
              color: '#d32f2f',
              textDecoration: 'none',
              cursor: 'pointer',
              marginTop: '20px'
            }}
          >
            <svg style={{ marginRight: '10px' }} width="20" height="20" viewBox="0 0 24 24" fill="#d32f2f">
              <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
            </svg>
            <span>Logout</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 