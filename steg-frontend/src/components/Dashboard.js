import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { app } from '../firebase/firebase';
import { getFirestore, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import Sidebar from './Sidebar';

const Dashboard = ({ onLogout }) => {
  const [incidents, setIncidents] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    resolved: 0,
    pending: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const db = getFirestore(app);

  // Fetch incidents from Firebase
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setIsLoading(true);
        const incidentsCollection = collection(db, 'incidents');
        
        // Get all incidents for stats
        const allIncidentsSnapshot = await getDocs(incidentsCollection);
        const allIncidents = allIncidentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Calculate statistics
        const totalCount = allIncidents.length;
        const resolvedCount = allIncidents.filter(incident => incident.status === 'Resolved').length;
        const pendingCount = allIncidents.filter(incident => incident.status === 'Pending').length;
        
        setStats({
          total: totalCount,
          resolved: resolvedCount,
          pending: pendingCount
        });
        
        // Get recent incidents for the table
        const recentIncidentsQuery = query(
          incidentsCollection, 
          orderBy('createdAt', 'desc'), 
          limit(3)
        );
        const recentIncidentsSnapshot = await getDocs(recentIncidentsQuery);
        const recentIncidents = recentIncidentsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setIncidents(recentIncidents);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching incidents:', err);
        setError('Failed to load incidents data. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchIncidents();
  }, [db]);

  // Function to format date 
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    // If it's a Firestore timestamp
    if (dateString.toDate && typeof dateString.toDate === 'function') {
      const date = dateString.toDate();
      return date.toISOString().split('T')[0];
    }
    
    // If it's a string date
    try {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div style={{
      display: 'flex',
      fontFamily: 'Arial, sans-serif',
      height: '100vh',
      margin: 0,
      padding: 0
    }}>
      {/* Sidebar */}
      <Sidebar onLogout={onLogout} />

      {/* Main Content */}
      <div style={{
        flexGrow: 1,
        backgroundColor: '#f5f5f5',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: '#1976d2',
          color: 'white',
          padding: '15px 25px',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '1.5rem',
            fontWeight: 500
          }}>STEG Incident Management</h1>
        </div>

        {/* Dashboard Content */}
        <div style={{
          padding: '20px',
          flexGrow: 1,
          overflowY: 'auto'
        }}>
          {isLoading ? (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px'
            }}>
              <p>Loading dashboard data...</p>
            </div>
          ) : error ? (
            <div style={{
              padding: '20px',
              backgroundColor: '#ffebee',
              color: '#d32f2f',
              borderRadius: '4px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          ) : (
            <>
              {/* Incident Overview */}
              <div style={{
                marginBottom: '30px'
              }}>
                <h2 style={{
                  fontSize: '1.2rem',
                  color: '#333',
                  marginBottom: '20px',
                  fontWeight: 500
                }}>Incident Overview</h2>
                
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  {/* Total Incidents */}
                  <div style={{
                    flex: 1,
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    borderLeft: '4px solid #2196f3'
                  }}>
                    <h3 style={{
                      fontSize: '2rem',
                      margin: '0 0 5px 0',
                      fontWeight: 500,
                      color: '#2196f3'
                    }}>{stats.total}</h3>
                    <p style={{
                      color: '#666',
                      margin: 0
                    }}>Total Incidents</p>
                  </div>
                  
                  {/* Resolved */}
                  <div style={{
                    flex: 1,
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    borderLeft: '4px solid #4caf50'
                  }}>
                    <h3 style={{
                      fontSize: '2rem',
                      margin: '0 0 5px 0',
                      fontWeight: 500,
                      color: '#4caf50'
                    }}>{stats.resolved}</h3>
                    <p style={{
                      color: '#666',
                      margin: 0
                    }}>Resolved</p>
                  </div>
                  
                  {/* Pending */}
                  <div style={{
                    flex: 1,
                    backgroundColor: 'white',
                    borderRadius: '4px',
                    padding: '20px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                    borderLeft: '4px solid #ff9800'
                  }}>
                    <h3 style={{
                      fontSize: '2rem',
                      margin: '0 0 5px 0',
                      fontWeight: 500,
                      color: '#ff9800'
                    }}>{stats.pending}</h3>
                    <p style={{
                      color: '#666',
                      margin: 0
                    }}>Pending</p>
                  </div>
                </div>
              </div>

              {/* Incidents Trend */}
              <div style={{
                marginBottom: '30px',
                backgroundColor: 'white',
                borderRadius: '4px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h2 style={{
                  fontSize: '1.2rem',
                  color: '#333',
                  marginBottom: '20px',
                  fontWeight: 500,
                  borderBottom: '1px solid #eee',
                  paddingBottom: '10px'
                }}>Incidents Trend (Last 30 Days)</h2>
                
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  height: '100px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  <p style={{ color: '#666' }}>
                    {stats.total === 0 
                      ? 'No incident data available to display trends' 
                      : 'Visualization will be available when more data is collected'}
                  </p>
                </div>
              </div>

              {/* Recent Incidents */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '4px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px',
                  borderBottom: '1px solid #eee',
                  paddingBottom: '10px'
                }}>
                  <h2 style={{
                    fontSize: '1.2rem',
                    color: '#333',
                    margin: 0,
                    fontWeight: 500
                  }}>Recent Incidents</h2>
                  
                  <Link to="/incidents" style={{
                    color: '#1976d2',
                    textDecoration: 'none',
                    fontSize: '0.9rem',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    View All
                    <svg style={{ marginLeft: '4px' }} width="16" height="16" viewBox="0 0 24 24" fill="#1976d2">
                      <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                    </svg>
                  </Link>
                </div>
                
                {incidents.length === 0 ? (
                  <div style={{
                    padding: '30px',
                    textAlign: 'center',
                    color: '#666'
                  }}>
                    No incidents available. Add incidents on the Incidents page.
                  </div>
                ) : (
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left'
                  }}>
                    <thead>
                      <tr>
                        <th style={{
                          backgroundColor: '#f5f5f5',
                          padding: '12px 15px',
                          fontWeight: 500,
                          color: '#333',
                          borderBottom: '1px solid #ddd'
                        }}>Incident ID</th>
                        <th style={{
                          backgroundColor: '#f5f5f5',
                          padding: '12px 15px',
                          fontWeight: 500,
                          color: '#333',
                          borderBottom: '1px solid #ddd'
                        }}>Type</th>
                        <th style={{
                          backgroundColor: '#f5f5f5',
                          padding: '12px 15px',
                          fontWeight: 500,
                          color: '#333',
                          borderBottom: '1px solid #ddd'
                        }}>Location</th>
                        <th style={{
                          backgroundColor: '#f5f5f5',
                          padding: '12px 15px',
                          fontWeight: 500,
                          color: '#333',
                          borderBottom: '1px solid #ddd'
                        }}>Date</th>
                        <th style={{
                          backgroundColor: '#f5f5f5',
                          padding: '12px 15px',
                          fontWeight: 500,
                          color: '#333',
                          borderBottom: '1px solid #ddd'
                        }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((incident, index) => (
                        <tr key={incident.id}>
                          <td style={{
                            padding: '12px 15px',
                            borderBottom: '1px solid #eee',
                            color: '#666'
                          }}>{index + 1}</td>
                          <td style={{
                            padding: '12px 15px',
                            borderBottom: '1px solid #eee',
                            color: '#666'
                          }}>{incident.type || 'N/A'}</td>
                          <td style={{
                            padding: '12px 15px',
                            borderBottom: '1px solid #eee',
                            color: '#666'
                          }}>{incident.posteName || 'N/A'}</td>
                          <td style={{
                            padding: '12px 15px',
                            borderBottom: '1px solid #eee',
                            color: '#666'
                          }}>{formatDate(incident.createdAt) || 'N/A'}</td>
                          <td style={{
                            padding: '12px 15px',
                            borderBottom: '1px solid #eee'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              backgroundColor: incident.status === 'Resolved' ? '#e8f5e9' : 
                                             incident.status === 'In Progress' ? '#e3f2fd' : '#fff8e1',
                              color: incident.status === 'Resolved' ? '#388e3c' : 
                                    incident.status === 'In Progress' ? '#1976d2' : '#ff8f00'
                            }}>
                              {incident.status || 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 