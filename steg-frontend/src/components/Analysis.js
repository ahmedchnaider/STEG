import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { app } from '../firebase/firebase';
import { getFirestore, collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import Sidebar from './Sidebar';

const Analysis = ({ onLogout }) => {
  const [timeRange, setTimeRange] = useState('Last 30 Days');
  const [incidentType, setIncidentType] = useState('All Types');
  const [incidents, setIncidents] = useState([]);
  const [typeStats, setTypeStats] = useState({});
  const [monthlyData, setMonthlyData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // New state variables for power distribution reliability metrics
  const [ddCount, setDdCount] = useState(0); // Nombre de déclenchements définitifs
  const [tciHours, setTciHours] = useState(0); // Temps cumulé d'interruption (hours)
  const [tmcMinutes, setTmcMinutes] = useState(0); // Temps moyen de coupure (minutes)
  const [endKwh, setEndKwh] = useState(0); // Énergie non distribuée (kWh)
  const [saidi, setSaidi] = useState(0); // System Average Interruption Duration Index
  const [saifi, setSaifi] = useState(0); // System Average Interruption Frequency Index

  const db = getFirestore(app);

  // Get date range based on selected time range
  const getDateRange = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(timeRange) {
      case 'Last 30 Days':
        startDate.setDate(now.getDate() - 30);
        break;
      case 'Last 60 Days':
        startDate.setDate(now.getDate() - 60);
        break;
      case 'Last 90 Days':
        startDate.setDate(now.getDate() - 90);
        break;
      case 'Last 6 Months':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 'Last Year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate.setDate(now.getDate() - 30);
    }
    
    return { startDate, endDate: now };
  };

  // Parse incident types from string
  const parseIncidentTypes = (typeString) => {
    if (!typeString) return [];
    return typeString.split(' ').filter(type => type.trim().length > 0);
  };

  // Function to filter incidents based on selected filters
  const filterIncidents = (allIncidents) => {
    const { startDate } = getDateRange();
    
    return allIncidents.filter(incident => {
      // Filter by date
      let incidentDate;
      if (incident.createdAt && incident.createdAt.toDate) {
        incidentDate = incident.createdAt.toDate();
      } else if (incident.createdAt) {
        incidentDate = new Date(incident.createdAt);
      } else {
        // If no date, include it
        incidentDate = new Date();
      }
      
      const passesDateFilter = incidentDate >= startDate;
      
      // Filter by type
      const incidentTypes = parseIncidentTypes(incident.type);
      const passesTypeFilter = 
        incidentType === 'All Types' || 
        incidentTypes.includes(incidentType);
      
      return passesDateFilter && passesTypeFilter;
    });
  };

  // Calculate statistics based on filtered incidents
  const calculateStats = (filteredIncidents) => {
    // Calculate type statistics
    const types = {};
    
    filteredIncidents.forEach(incident => {
      const incidentTypes = parseIncidentTypes(incident.type);
      
      incidentTypes.forEach(type => {
        if (!types[type]) {
          types[type] = 0;
        }
        types[type]++;
      });
    });
    
    setTypeStats(types);
    
    // Calculate monthly data
    const months = {};
    
    filteredIncidents.forEach(incident => {
      let date;
      if (incident.createdAt && incident.createdAt.toDate) {
        date = incident.createdAt.toDate();
      } else if (incident.createdAt) {
        date = new Date(incident.createdAt);
      } else {
        return;
      }
      
      const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!months[monthYear]) {
        months[monthYear] = 0;
      }
      months[monthYear]++;
    });
    
    // Convert to array sorted by month
    const monthlyDataArray = Object.entries(months)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    setMonthlyData(monthlyDataArray);
    
    // Calculate power distribution reliability metrics
    calculateReliabilityMetrics(filteredIncidents);
  };
  
  // Calculate power distribution reliability metrics
  const calculateReliabilityMetrics = (incidents) => {
    // Filter for only DD (Déclenchements Définitifs) incidents
    const ddIncidents = incidents.filter(incident => {
      const types = parseIncidentTypes(incident.type);
      return types.includes('DD');
    });
    
    // 1. Nombre de déclenchements définitifs (DD) - Count of permanent outages
    setDdCount(ddIncidents.length);
    
    // For the rest of calculations, we need duration data
    // In a real application, this data would come from the incidents
    const totalCustomers = 10000; // Assuming 10,000 customers in the system for SAIDI/SAIFI
    let totalInterruptionHours = 0;
    let totalInterruptionCustomerHours = 0;
    let totalAffectedCustomers = 0;
    
    ddIncidents.forEach(incident => {
      // Get duration in hours from the incident or use a mock value
      // Calculate based on timestamps if available, otherwise use mock data
      const startTime = incident.declenchement ? new Date(incident.declenchement) : null;
      const endTime = incident.finRetab ? new Date(incident.finRetab) : null;
      
      let duration = 0;
      if (startTime && endTime && !isNaN(startTime) && !isNaN(endTime)) {
        // Calculate actual duration if timestamps are available
        duration = (endTime - startTime) / (1000 * 60 * 60); // Convert to hours
      } else {
        // Use mock duration if actual timestamps aren't available
        duration = incident.duration || Math.floor(Math.random() * 10) + 1;
      }
      
      // Mock affected customers (random between 100-1000 customers)
      // In a real application, this would come from the incident data
      const affectedCustomers = incident.affectedCustomers || Math.floor(Math.random() * 900) + 100;
      
      // Accumulate values for various metrics
      totalInterruptionHours += duration;
      totalInterruptionCustomerHours += (duration * affectedCustomers);
      totalAffectedCustomers += affectedCustomers;
    });
    
    // 2. Temps cumulé d'interruption (TCI) - Cumulative interruption time in hours
    setTciHours(Math.round(totalInterruptionHours));
    
    // 3. Temps moyen de coupure (TMC) - Average outage time in minutes
    const averageOutageMinutes = ddIncidents.length > 0 
      ? (totalInterruptionHours / ddIncidents.length) * 60
      : 0;
    setTmcMinutes(averageOutageMinutes.toFixed(1));
    
    // 4. Énergie non distribuée (END) - Non-distributed energy in kWh
    // END = Sum of (average power per customer × number of affected customers × outage duration)
    const averagePowerPerCustomer = 2; // kW per customer
    const estimatedEnergyLoss = totalInterruptionCustomerHours * averagePowerPerCustomer;
    setEndKwh(estimatedEnergyLoss.toFixed(0));
    
    // 5. SAIDI - System Average Interruption Duration Index
    // SAIDI = Sum of (duration × customers affected) / total customers
    // Measured in customer hours of interruption per customer
    const saidiValue = totalCustomers > 0
      ? totalInterruptionCustomerHours / totalCustomers
      : 0;
    setSaidi(saidiValue.toFixed(2));
    
    // 6. SAIFI - System Average Interruption Frequency Index
    // SAIFI = Sum of customers affected / total customers
    // Measured in interruptions per customer
    const saifiValue = totalCustomers > 0
      ? totalAffectedCustomers / totalCustomers
      : 0;
    setSaifi(saifiValue.toFixed(2));
  };

  // Fetch incidents from Firebase
  useEffect(() => {
    const fetchIncidents = async () => {
      try {
        setIsLoading(true);
        const incidentsCollection = collection(db, 'incidents');
        const q = query(incidentsCollection, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        
        const incidentsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setIncidents(incidentsData);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching incidents:', err);
        setError('Failed to load incidents data. Please try again later.');
        setIsLoading(false);
      }
    };

    fetchIncidents();
  }, [db]);

  // Recalculate statistics when filters or incidents change
  useEffect(() => {
    if (incidents.length > 0) {
      const filteredIncidents = filterIncidents(incidents);
      calculateStats(filteredIncidents);
    }
  }, [incidents, timeRange, incidentType]);

  // Find the incident type with the highest count
  const maxTypeCount = Object.values(typeStats).length > 0 
    ? Math.max(...Object.values(typeStats)) 
    : 0;

  // Get available incident types for filter dropdown
  const availableTypes = ['All Types'];
  incidents.forEach(incident => {
    const types = parseIncidentTypes(incident.type);
    types.forEach(type => {
      if (!availableTypes.includes(type)) {
        availableTypes.push(type);
      }
    });
  });

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

        {/* Analytics Content */}
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
              <p>Loading analytics data...</p>
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
              {/* Analytics Panel */}
              <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '20px',
                marginBottom: '20px',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
              }}>
                <h2 style={{
                  fontSize: '1.2rem',
                  color: '#333',
                  marginTop: 0,
                  marginBottom: '20px',
                  fontWeight: 500
                }}>Incident Analytics</h2>
                
                {/* Filters - Moved to top */}
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9rem',
                      color: '#666',
                      marginBottom: '5px'
                    }}>Time Range</label>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        width: '100%',
                        backgroundColor: 'white'
                      }}
                    >
                      <option>Last 30 Days</option>
                      <option>Last 60 Days</option>
                      <option>Last 90 Days</option>
                      <option>Last 6 Months</option>
                      <option>Last Year</option>
                    </select>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9rem',
                      color: '#666',
                      marginBottom: '5px'
                    }}>Incident Type</label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        width: '100%',
                        backgroundColor: 'white'
                      }}
                    >
                      <option>All Types</option>
                      <option>DRR</option>
                      <option>DRL</option>
                      <option>DD</option>
                      <option>ED</option>
                      <option>BC</option>
                    </select>
                  </div>
                </div>
                
                {/* Main Content Area with flexbox layout */}
                <div style={{
                  display: 'flex',
                  gap: '20px',
                  marginBottom: '20px',
                  flexWrap: 'wrap'
                }}>
                  {/* Power Distribution Reliability Metrics - Left side */}
                  <div style={{
                    flex: '1 1 60%',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    padding: '15px',
                    border: '1px solid #eaeaea'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      marginBottom: '15px'
                    }}>
                      <svg style={{ marginRight: '10px', color: '#1976d2' }} width="20" height="20" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M14.94,13.5H16.31C16.55,15.18 17.06,16.56 17.81,17.56C16.28,16.78 15,15.28 14.94,13.5M7.44,13.5H8.81C8.75,15.28 7.47,16.78 5.94,17.56C6.69,16.56 7.2,15.18 7.44,13.5M4.06,12C4.06,12.12 4.07,12.23 4.07,12.34C3.97,12.23 3.88,12.12 3.78,12C3.88,11.88 3.97,11.77 4.07,11.66C4.07,11.77 4.06,11.88 4.06,12M16.5,12C16.5,12.88 16.5,13.5 16.5,13.5H14.94C14.94,13.5 14.89,13 14.89,12.34C14.89,12.23 14.9,12.11 14.9,12C14.9,11.89 14.89,11.77 14.89,11.66C14.89,11 14.94,10.5 14.94,10.5H16.5C16.5,10.5 16.5,11.12 16.5,12M10.5,12C10.5,12.88 10.5,13.5 10.5,13.5H8.94C8.94,13.5 8.89,13 8.89,12.34C8.89,12.23 8.9,12.11 8.9,12C8.9,11.89 8.89,11.77 8.89,11.66C8.89,11 8.94,10.5 8.94,10.5H10.5C10.5,10.5 10.5,11.12 10.5,12M7.44,10.5C7.2,8.82 6.69,7.44 5.94,6.44C7.47,7.22 8.75,8.72 8.81,10.5H7.44M15.94,12C15.94,12.12 15.93,12.23 15.93,12.34C16.03,12.23 16.12,12.12 16.22,12C16.12,11.88 16.03,11.77 15.93,11.66C15.93,11.77 15.94,11.88 15.94,12M9.94,12C9.94,12.12 9.93,12.23 9.93,12.34C10.03,12.23 10.12,12.12 10.22,12C10.12,11.88 10.03,11.77 9.93,11.66C9.93,11.77 9.94,11.88 9.94,12M16.31,10.5H14.94C15,8.72 16.28,7.22 17.81,6.44C17.06,7.44 16.55,8.82 16.31,10.5M20,9.5V10.5C16.69,10.5 15.12,8.95 13.5,8.94V10.5C13.5,10.5 13.5,10.5 13.5,10.5H11.94V8.94C10.32,8.95 8.75,10.5 5.44,10.5V9.5C5.44,9.5 8.5,9.5 8.5,8H9.5C9.5,9.5 12.56,9.5 12.56,9.5V8H13.56C13.56,9.5 16.5,9.5 16.5,9.5C19.06,9.5 20,9.5 20,9.5Z" />
                      </svg>
                      <h3 style={{
                        fontSize: '1.1rem',
                        color: '#333',
                        margin: 0,
                        fontWeight: 500
                      }}>Power Distribution Reliability Metrics</h3>
                    </div>
                    
                    <p style={{ fontSize: '0.9rem', color: '#666', margin: '0 0 15px' }}>
                      These metrics track the reliability of the electrical distribution network based on incident data.
                    </p>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                      gap: '15px'
                    }}>
                      {/* DD - Nombre de déclenchements définitifs */}
                      <div style={{
                        backgroundColor: '#ffebee',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#777',
                          marginBottom: '8px'
                        }}>
                          Nombre de déclenchements définitifs (DD)
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 500,
                          color: '#d32f2f'
                        }}>
                          {ddCount}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#555',
                          marginTop: '5px'
                        }}>
                          Permanent outages
                        </div>
                      </div>
                      
                      {/* TCI - Temps cumulé d'interruption */}
                      <div style={{
                        backgroundColor: '#fff3e0',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#777',
                          marginBottom: '8px'
                        }}>
                          Temps cumulé d'interruption (TCI)
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 500,
                          color: '#e64a19'
                        }}>
                          {tciHours} <span style={{ fontSize: '0.9rem' }}>h</span>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#555',
                          marginTop: '5px'
                        }}>
                          Total outage duration
                        </div>
                      </div>
                      
                      {/* TMC - Temps moyen de coupure */}
                      <div style={{
                        backgroundColor: '#e0f7fa',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#777',
                          marginBottom: '8px'
                        }}>
                          Temps moyen de coupure (TMC)
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 500,
                          color: '#0097a7'
                        }}>
                          {tmcMinutes} <span style={{ fontSize: '0.9rem' }}>min</span>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#555',
                          marginTop: '5px'
                        }}>
                          Average outage time
                        </div>
                      </div>
                      
                      {/* END - Énergie non distribuée */}
                      <div style={{
                        backgroundColor: '#e8f5e9',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#777',
                          marginBottom: '8px'
                        }}>
                          Énergie non distribuée (END)
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 500,
                          color: '#2e7d32'
                        }}>
                          {endKwh} <span style={{ fontSize: '0.9rem' }}>kWh</span>
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#555',
                          marginTop: '5px'
                        }}>
                          Non-distributed energy
                        </div>
                      </div>
                      
                      {/* SAIDI */}
                      <div style={{
                        backgroundColor: '#f3e5f5',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#777',
                          marginBottom: '8px'
                        }}>
                          SAIDI
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 500,
                          color: '#8e24aa'
                        }}>
                          {saidi}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#555',
                          marginTop: '5px'
                        }}>
                          Interruption Duration Index
                        </div>
                      </div>
                      
                      {/* SAIFI */}
                      <div style={{
                        backgroundColor: '#e8eaf6',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#777',
                          marginBottom: '8px'
                        }}>
                          SAIFI
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 500,
                          color: '#3949ab'
                        }}>
                          {saifi}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#555',
                          marginTop: '5px'
                        }}>
                          Interruption Frequency Index
                        </div>
                      </div>
                      
                      {/* CAIDI */}
                      <div style={{
                        backgroundColor: '#f5f5f5',
                        borderRadius: '8px',
                        padding: '12px',
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#777',
                          marginBottom: '8px'
                        }}>
                          CAIDI
                        </div>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 500,
                          color: '#546e7a'
                        }}>
                          {saifi > 0 ? (saidi / saifi).toFixed(2) : '0.00'}
                        </div>
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#555',
                          marginTop: '5px'
                        }}>
                          Customer Interruption Duration
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Summary Cards - Right side */}
                  <div style={{
                    flex: '1 1 30%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '15px'
                  }}>
                    {/* Convert vertical stack to 2x2 grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(2, 1fr)',
                      gridTemplateRows: 'repeat(2, 1fr)',
                      gap: '15px',
                      height: '100%'
                    }}>
                      {/* Total Incidents */}
                      <div style={{
                        backgroundColor: '#e3f2fd',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          fontSize: '2rem',
                          fontWeight: 500,
                          color: '#1976d2'
                        }}>
                          {filterIncidents(incidents).length}
                        </div>
                        <div style={{
                          color: '#555',
                          fontSize: '0.9rem'
                        }}>
                          Total Incidents
                        </div>
                      </div>
                      
                      {/* Types Count */}
                      <div style={{
                        backgroundColor: '#e8f5e9',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          fontSize: '2rem',
                          fontWeight: 500,
                          color: '#388e3c'
                        }}>
                          {Object.keys(typeStats).length}
                        </div>
                        <div style={{
                          color: '#555',
                          fontSize: '0.9rem'
                        }}>
                          Incident Types
                        </div>
                      </div>
                      
                      {/* Most Common Type */}
                      <div style={{
                        backgroundColor: '#fff8e1',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          fontSize: '1.5rem',
                          fontWeight: 500,
                          color: '#ff8f00',
                          textAlign: 'center'
                        }}>
                          {Object.entries(typeStats).length > 0 
                            ? Object.entries(typeStats).reduce((a, b) => a[1] > b[1] ? a : b)[0]
                            : 'N/A'}
                        </div>
                        <div style={{
                          color: '#555',
                          fontSize: '0.9rem'
                        }}>
                          Most Common Type
                        </div>
                      </div>
                      
                      {/* Average Monthly */}
                      <div style={{
                        backgroundColor: '#f3e5f5',
                        borderRadius: '8px',
                        padding: '15px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                      }}>
                        <div style={{
                          fontSize: '2rem',
                          fontWeight: 500,
                          color: '#8e24aa'
                        }}>
                          {monthlyData.length > 0
                            ? (monthlyData.reduce((sum, item) => sum + item.count, 0) / monthlyData.length).toFixed(1)
                            : '0'}
                        </div>
                        <div style={{
                          color: '#555',
                          fontSize: '0.9rem'
                        }}>
                          Avg. Monthly Incidents
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {incidents.length === 0 ? (
                <div style={{
                  padding: '50px 20px',
                  textAlign: 'center',
                  color: '#666',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px'
                }}>
                  No incident data available. Add incidents on the Incidents page.
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '20px'
                }}>
                  {/* Charts Row 1 */}
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Line Chart - Incidents Over Time - Improved with clear trend line */}
                    <div style={{
                      flex: '1 1 500px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: '15px',
                      border: '1px solid #eee',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <h3 style={{
                        fontSize: '1rem',
                        color: '#333',
                        marginTop: 0,
                        marginBottom: '15px',
                        fontWeight: 500
                      }}>Incidents Over Time</h3>
                      
                      <div style={{
                        height: '250px',
                        position: 'relative'
                      }}>
                        {monthlyData.length === 0 ? (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                            color: '#666'
                          }}>
                            No data available for the selected time period
                          </div>
                        ) : (
                          <div style={{ height: '100%', width: '100%', position: 'relative', padding: '0 10px' }}>
                            {/* Y-axis labels */}
                            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 30, width: '30px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', zIndex: 1 }}>
                              {[...Array(5)].map((_, i) => {
                                const maxCount = Math.max(...monthlyData.map(d => d.count));
                                const value = Math.round(maxCount * (4 - i) / 4);
                                return (
                                  <div key={i} style={{ fontSize: '0.7rem', color: '#777', textAlign: 'right' }}>
                                    {value}
                                  </div>
                                );
                              })}
                            </div>
                            
                            {/* Grid lines */}
                            <div style={{ position: 'absolute', left: '30px', right: 0, top: 0, bottom: '30px', zIndex: 0 }}>
                              {[...Array(5)].map((_, i) => (
                                <div key={i} style={{ 
                                  position: 'absolute', 
                                  left: 0, 
                                  right: 0, 
                                  top: `${i * 25}%`, 
                                  borderBottom: i === 4 ? '1px solid #ccc' : '1px dashed #eee',
                                  height: 1
                                }} />
                              ))}
                            </div>
                            
                            {/* Line chart */}
                            <div style={{ position: 'absolute', left: '30px', right: 0, top: 0, bottom: '30px', zIndex: 1 }}>
                              <svg width="100%" height="100%" style={{ overflow: 'visible' }}>
                                {/* Line connecting points - enhanced */}
                                <defs>
                                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="#1976d2" stopOpacity="0.8" />
                                    <stop offset="100%" stopColor="#1976d2" stopOpacity="0.2" />
                                  </linearGradient>
                                </defs>
                                
                                {/* Area under the line - for visual emphasis */}
                                <path 
                                  d={monthlyData.map((item, i) => {
                                    const maxCount = Math.max(...monthlyData.map(d => d.count));
                                    const x = `${(i / (monthlyData.length - 1)) * 100}%`;
                                    const y = maxCount > 0 ? `${(1 - item.count / maxCount) * 100}%` : '100%';
                                    
                                    if (i === 0) {
                                      return `M ${x} ${y}`;
                                    } else if (i === monthlyData.length - 1) {
                                      return `L ${x} ${y} L ${x} 100% L 0% 100% Z`;
                                    } else {
                                      return `L ${x} ${y}`;
                                    }
                                  }).join(' ')}
                                  fill="url(#lineGradient)"
                                  opacity="0.3"
                                />
                                
                                {/* Primary line - thicker and more prominent */}
                                <path 
                                  d={monthlyData.map((item, i) => {
                                    const maxCount = Math.max(...monthlyData.map(d => d.count));
                                    const x = `${(i / (monthlyData.length - 1)) * 100}%`;
                                    const y = maxCount > 0 ? `${(1 - item.count / maxCount) * 100}%` : '100%';
                                    return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                  }).join(' ')}
                                  fill="none"
                                  stroke="#1976d2"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                
                                {/* Trend indicator - Moving average or trendline */}
                                {monthlyData.length > 4 && (
                                  <path 
                                    d={(() => {
                                      // Simplistic trend/average line
                                      const maxCount = Math.max(...monthlyData.map(d => d.count));
                                      const avgCount = monthlyData.reduce((acc, item) => acc + item.count, 0) / monthlyData.length;
                                      const avgY = maxCount > 0 ? `${(1 - avgCount / maxCount) * 100}%` : '50%';
                                      
                                      // Calculate trend slope (simple linear)
                                      const slope = monthlyData.length > 1 ? 
                                        (monthlyData[monthlyData.length-1].count - monthlyData[0].count) / (monthlyData.length - 1) 
                                        : 0;
                                        
                                      // Generate trend line
                                      return monthlyData.map((item, i) => {
                                        const x = `${(i / (monthlyData.length - 1)) * 100}%`;
                                        const trendValue = monthlyData[0].count + (slope * i);
                                        const y = maxCount > 0 ? `${(1 - trendValue / maxCount) * 100}%` : '50%';
                                        return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                      }).join(' ');
                                    })()}
                                    fill="none"
                                    stroke="#f44336"
                                    strokeWidth="2"
                                    strokeDasharray="5,5"
                                  />
                                )}
                                
                                {/* Data points */}
                                {monthlyData.map((item, i) => {
                                  const maxCount = Math.max(...monthlyData.map(d => d.count));
                                  const x = `${(i / (monthlyData.length - 1)) * 100}%`;
                                  const y = maxCount > 0 ? `${(1 - item.count / maxCount) * 100}%` : '100%';
                                  
                                  return (
                                    <g key={i}>
                                      <circle 
                                        cx={x} 
                                        cy={y} 
                                        r="5" 
                                        fill="#1976d2" 
                                        stroke="white" 
                                        strokeWidth="2"
                                      />
                                      {/* Value labels above points */}
                                      <text
                                        x={x}
                                        y={parseFloat(y) - 10}
                                        textAnchor="middle"
                                        fontSize="10"
                                        fill="#333"
                                      >
                                        {item.count}
                                      </text>
                                      {/* Hover tooltip - would be better with JavaScript interactivity */}
                                      <title>{`${item.month}: ${item.count} incidents`}</title>
                                    </g>
                                  );
                                })}
                              </svg>
                            </div>
                            
                            {/* X-axis labels */}
                            <div style={{ 
                              position: 'absolute', 
                              left: '30px', 
                              right: 0, 
                              bottom: 0, 
                              height: '30px',
                              display: 'flex',
                              borderTop: '1px solid #ccc'
                            }}>
                              {monthlyData.map((item, i) => (
                                <div 
                                  key={i} 
                                  style={{ 
                                    flex: 1, 
                                    textAlign: 'center', 
                                    fontSize: '0.7rem', 
                                    color: '#777',
                                    transform: 'translateY(5px)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                  }}
                                >
                                  {item.month.split('-')[1]}
                                </div>
                              ))}
                            </div>
                            
                            {/* Legend for trend line */}
                            {monthlyData.length > 4 && (
                              <div style={{ 
                                position: 'absolute', 
                                top: '10px', 
                                right: '10px', 
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '0.7rem',
                                color: '#555',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                padding: '4px 8px',
                                borderRadius: '4px'
                              }}>
                                <div style={{ 
                                  width: '12px', 
                                  height: '2px', 
                                  backgroundColor: '#f44336',
                                  marginRight: '4px',
                                  display: 'inline-block'
                                }}></div>
                                Trend
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Bar Chart - Incidents by Type */}
                    <div style={{
                      flex: '1 1 400px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: '15px',
                      border: '1px solid #eee',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <h3 style={{
                        fontSize: '1rem',
                        color: '#333',
                        marginTop: 0,
                        marginBottom: '15px',
                        fontWeight: 500
                      }}>Incidents by Type</h3>
                      
                      <div style={{
                        height: '250px',
                        position: 'relative'
                      }}>
                        {Object.keys(typeStats).length === 0 ? (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                            color: '#666'
                          }}>
                            No type data available for the selected filters
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            height: '100%',
                            alignItems: 'flex-end',
                            justifyContent: 'space-around',
                            paddingBottom: '40px'
                          }}>
                            {Object.entries(typeStats).map(([type, count], index) => {
                              const barHeight = maxTypeCount > 0 ? (count / maxTypeCount) * 100 : 0;
                              const colors = {
                                'DD': '#d32f2f',
                                'DRR': '#2979ff',
                                'DRL': '#00b0ff',
                                'ED': '#4caf50',
                                'BC': '#ff9800'
                              };
                              const barColor = colors[type] || '#66bb6a';
                              
                              return (
                                <div 
                                  key={index} 
                                  style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    width: `${80 / Object.keys(typeStats).length}%`,
                                    maxWidth: '80px'
                                  }}
                                >
                                  <div 
                                    style={{
                                      height: `${barHeight * 0.8}%`, // Leave room for labels
                                      width: '100%',
                                      background: `linear-gradient(180deg, ${barColor} 0%, ${barColor}dd 100%)`,
                                      borderTopLeftRadius: '3px',
                                      borderTopRightRadius: '3px',
                                      display: 'flex',
                                      justifyContent: 'center',
                                      alignItems: 'flex-start',
                                      color: 'white',
                                      fontSize: '0.9rem',
                                      fontWeight: 'bold',
                                      padding: '2px 0',
                                      boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                  >
                                    {count > 0 && count}
                                  </div>
                                  <div style={{
                                    marginTop: '8px',
                                    fontSize: '0.9rem',
                                    color: '#444',
                                    textAlign: 'center',
                                    fontWeight: '500'
                                  }}>
                                    {type}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Charts Row 2 */}
                  <div style={{
                    display: 'flex',
                    gap: '20px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Pie Chart - Incident Status Distribution */}
                    <div style={{
                      flex: '1 1 400px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: '15px',
                      border: '1px solid #eee',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <h3 style={{
                        fontSize: '1rem',
                        color: '#333',
                        marginTop: 0,
                        marginBottom: '15px',
                        fontWeight: 500
                      }}>Incident Status Distribution</h3>

                      <div style={{
                        height: '250px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {incidents.length === 0 ? (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                            color: '#666'
                          }}>
                            No incident data available
                          </div>
                        ) : (
                          <div style={{
                            display: 'flex',
                            width: '100%',
                            height: '100%',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 0'
                          }}>
                            {(() => {
                              const filteredIncidents = filterIncidents(incidents);
                              
                              // Count incidents by status
                              const statusCounts = {
                                'Pending': 0,
                                'In Progress': 0,
                                'Resolved': 0
                              };
                              
                              // Calculate status distribution
                              filteredIncidents.forEach(incident => {
                                const status = incident.status || 'Pending';
                                if (statusCounts[status] !== undefined) {
                                  statusCounts[status]++;
                                } else {
                                  statusCounts[status] = 1;
                                }
                              });
                              
                              const totalIncidents = filteredIncidents.length;
                              
                              if (totalIncidents === 0) {
                                return (
                                  <div style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    color: '#666'
                                  }}>
                                    No status data available
                                  </div>
                                );
                              }
                              
                              const statusItems = [
                                { status: 'Pending', color: '#ff9800', count: statusCounts['Pending'] || 0 },
                                { status: 'In Progress', color: '#2196f3', count: statusCounts['In Progress'] || 0 },
                                { status: 'Resolved', color: '#4caf50', count: statusCounts['Resolved'] || 0 }
                              ].filter(item => item.count > 0);
                              
                              // Calculate percentages and angles for the pie chart
                              let cumulativePercentage = 0;
                              statusItems.forEach(item => {
                                item.percentage = (item.count / totalIncidents) * 100;
                                item.startAngle = cumulativePercentage * 3.6; // 3.6 degrees per percentage point (360 / 100)
                                cumulativePercentage += item.percentage;
                                item.endAngle = cumulativePercentage * 3.6;
                              });
                              
                              return (
                                <>
                                  {/* Pie Chart */}
                                  <div style={{ width: '50%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <div style={{ 
                                      width: '180px', 
                                      height: '180px', 
                                      borderRadius: '50%',
                                      position: 'relative',
                                      boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                    }}>
                                      {statusItems.map((item, index) => {
                                        // Create CSS for pie segments
                                        const clipPath = `polygon(50% 50%, ${50 + 50 * Math.cos(item.startAngle * Math.PI / 180)}% ${50 + 50 * Math.sin(item.startAngle * Math.PI / 180)}%, ${50 + 50 * Math.cos((item.startAngle + (item.endAngle - item.startAngle) / 2) * Math.PI / 180)}% ${50 + 50 * Math.sin((item.startAngle + (item.endAngle - item.startAngle) / 2) * Math.PI / 180)}%, ${50 + 50 * Math.cos(item.endAngle * Math.PI / 180)}% ${50 + 50 * Math.sin(item.endAngle * Math.PI / 180)}%)`;
                                        
                                        return (
                                          <div key={index} style={{
                                            position: 'absolute',
                                            width: '100%',
                                            height: '100%',
                                            backgroundColor: item.color,
                                            borderRadius: '50%',
                                            clipPath: clipPath
                                          }}></div>
                                        );
                                      })}
                                      
                                      {/* Inner circle for donut style */}
                                      <div style={{
                                        position: 'absolute',
                                        width: '60%',
                                        height: '60%',
                                        backgroundColor: 'white',
                                        borderRadius: '50%',
                                        top: '20%',
                                        left: '20%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexDirection: 'column'
                                      }}>
                                        <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#333' }}>
                                          {totalIncidents}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                          Total
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Legend */}
                                  <div style={{ width: '40%' }}>
                                    {statusItems.map((item, index) => (
                                      <div key={index} style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                                        <div style={{ 
                                          width: '14px', 
                                          height: '14px', 
                                          backgroundColor: item.color,
                                          marginRight: '10px',
                                          borderRadius: '3px'
                                        }}></div>
                                        <div style={{ flexGrow: 1 }}>
                                          <div style={{ fontSize: '0.9rem', color: '#333', fontWeight: '500' }}>
                                            {item.status}
                                          </div>
                                          <div style={{ fontSize: '0.8rem', color: '#666' }}>
                                            {item.count} ({item.percentage.toFixed(1)}%)
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Most Frequent Départs Chart */}
                    <div style={{
                      flex: '1 1 400px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      padding: '15px',
                      border: '1px solid #eee',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <h3 style={{
                        fontSize: '1rem',
                        color: '#333',
                        marginTop: 0,
                        marginBottom: '15px',
                        fontWeight: 500,
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        <svg style={{ marginRight: '8px', color: '#1976d2' }} width="18" height="18" viewBox="0 0 24 24">
                          <path fill="currentColor" d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z" />
                        </svg>
                        Most Frequent Départs
                      </h3>

                      <div style={{
                        height: '250px',
                        position: 'relative',
                        padding: '10px 0'
                      }}>
                        {incidents.length === 0 ? (
                          <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '100%',
                            color: '#666'
                          }}>
                            No incident data available
                          </div>
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center'
                          }}>
                            {(() => {
                              const filteredIncidents = filterIncidents(incidents);
                              
                              // Group incidents by départ
                              const departCounts = {};
                              let totalIncidents = 0;
                              
                              filteredIncidents.forEach(incident => {
                                if (incident.depart) {
                                  const depart = incident.depart.trim();
                                  if (depart) {
                                    if (!departCounts[depart]) {
                                      departCounts[depart] = {
                                        count: 0,
                                        ddCount: 0,
                                        resolved: 0,
                                        voltage: incident.voltage || 'N/A'
                                      };
                                    }
                                    departCounts[depart].count++;
                                    totalIncidents++;
                                    
                                    // Count DD incidents for each départ
                                    if (incident.type && incident.type.includes('DD')) {
                                      departCounts[depart].ddCount++;
                                    }
                                    
                                    // Count resolved incidents
                                    if (incident.status === 'Resolved') {
                                      departCounts[depart].resolved++;
                                    }
                                  }
                                }
                              });
                              
                              // Convert to array and sort by count
                              const sortedDeparts = Object.entries(departCounts)
                                .map(([depart, data]) => ({
                                  depart,
                                  ...data,
                                  percentage: (data.count / totalIncidents) * 100,
                                  resolutionRate: data.count > 0 ? (data.resolved / data.count) * 100 : 0
                                }))
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 8); // Show top 8 départs
                                  
                              // Generate colors based on voltage levels
                              const getColorByVoltage = (voltage) => {
                                if (voltage === '90 kV') return '#d32f2f';
                                if (voltage === '60 kV') return '#ff9800';
                                if (voltage === '30 kV') return '#2196f3';
                                return '#9e9e9e';
                              };
                              
                              if (sortedDeparts.length === 0) {
                                return (
                                  <div style={{
                                    width: '100%',
                                    textAlign: 'center',
                                    padding: '30px 0',
                                    color: '#666'
                                  }}>
                                    No départ data available for the selected filters
                                  </div>
                                );
                              }
                              
                              // Find maximum count for scaling
                              const maxCount = Math.max(...sortedDeparts.map(d => d.count));
                              
                              return (
                                <div style={{ width: '100%' }}>
                                  <div style={{ marginBottom: '15px', overflowY: 'auto', maxHeight: '210px' }}>
                                    {sortedDeparts.map((item, index) => {
                                      const widthPercentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                                      const color = getColorByVoltage(item.voltage);
                                      
                                      return (
                                        <div key={index} style={{ marginBottom: '12px' }}>
                                          <div style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            marginBottom: '4px' 
                                          }}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                              <span style={{ 
                                                width: '10px',
                                                height: '10px',
                                                backgroundColor: color,
                                                display: 'inline-block',
                                                marginRight: '6px',
                                                borderRadius: '50%'
                                              }}></span>
                                              <span style={{ 
                                                fontSize: '0.9rem', 
                                                maxWidth: '200px',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                whiteSpace: 'nowrap'
                                              }}>
                                                {item.depart}
                                              </span>
                                            </div>
                                            <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                              {item.count}
                                            </div>
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', height: '16px' }}>
                                            {/* Main bar */}
                                            <div style={{ 
                                              flex: 1,
                                              position: 'relative'
                                            }}>
                                              <div style={{ 
                                                width: '100%',
                                                height: '12px',
                                                backgroundColor: '#f5f5f5',
                                                borderRadius: '6px',
                                                overflow: 'hidden'
                                              }}>
                                                <div style={{ 
                                                  width: `${widthPercentage}%`,
                                                  height: '100%',
                                                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                                                  borderRadius: '6px',
                                                  position: 'relative',
                                                  transition: 'width 0.3s ease-in-out'
                                                }}>
                                                  {/* DD incident indicator */}
                                                  {item.ddCount > 0 && (
                                                    <div style={{
                                                      position: 'absolute',
                                                      top: '0',
                                                      right: '0',
                                                      bottom: '0',
                                                      width: `${(item.ddCount / item.count) * 100}%`,
                                                      background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.2) 3px, rgba(255,255,255,0.2) 6px)'
                                                    }}></div>
                                                  )}
                                                </div>
                                              </div>
                                              {/* Value label */}
                                              <div style={{
                                                position: 'absolute',
                                                right: '0',
                                                top: '14px',
                                                fontSize: '0.75rem',
                                                color: '#666'
                                              }}>
                                                {item.percentage.toFixed(1)}%
                                              </div>
                                            </div>
                                            
                                            {/* Resolution indicator */}
                                            <div style={{
                                              marginLeft: '10px',
                                              width: '38px',
                                              textAlign: 'center',
                                              fontSize: '0.75rem',
                                              color: item.resolutionRate > 50 ? '#4caf50' : '#f44336',
                                              fontWeight: 'bold'
                                            }}>
                                              {Math.round(item.resolutionRate)}%
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                  
                                  <div style={{
                                    borderTop: '1px solid #eee',
                                    paddingTop: '10px',
                                    display: 'flex',
                                    fontSize: '0.8rem',
                                    color: '#666',
                                    justifyContent: 'space-between'
                                  }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <div style={{ 
                                        width: '12px', 
                                        height: '12px', 
                                        background: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(0,0,0,0.2) 3px, rgba(0,0,0,0.2) 6px)',
                                        marginRight: '4px',
                                        display: 'inline-block'
                                      }}></div>
                                      DD Incidents
                                    </div>
                                    <div>
                                      <span style={{ marginRight: '8px', color: '#4caf50', fontWeight: 'bold' }}>%</span>
                                      Résolution
                                    </div>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
    
  );
};

export default Analysis; 