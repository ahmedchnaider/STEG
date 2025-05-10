import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { app } from '../firebase/firebase';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import Sidebar from './Sidebar';

const Incidents = ({ onLogout }) => {
  const [filterText, setFilterText] = useState('');
  const [voltageFilter, setVoltageFilter] = useState('All Voltages');
  const [posteName, setPosteName] = useState('');
  const [voltageLevel, setVoltageLevel] = useState('30 kV');
  const [departValue, setDepartValue] = useState('');
  const [heureValue, setHeureValue] = useState('');
  const [icValue, setIcValue] = useState('');
  const [rDepartValue, setRDepartValue] = useState('');
  const [retabValue, setRetabValue] = useState('');
  const [irValue, setIrValue] = useState('');
  const [finRetabValue, setFinRetabValue] = useState('');
  const [tronconsValue, setTronconsValue] = useState('');
  const [typeValue, setTypeValue] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingIncident, setEditingIncident] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Available incident types
  const incidentTypes = ['DRR', 'DRL', 'DD', 'ED', 'BC'];

  const db = getFirestore(app);

  // Fetch incidents from Firebase
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
      setError('Failed to load incidents. Please try again later.');
      setIsLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchIncidents();
  }, []);

  // Handle sync button click
  const handleSync = async () => {
    setIsSyncing(true);
    await fetchIncidents();
    setSuccessMessage('Incidents synchronized successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
    setIsSyncing(false);
  };

  // Filter incidents based on search text and voltage filter
  const filteredIncidents = incidents.filter(incident => {
    const matchesText = filterText === '' || 
      incident.posteName?.toLowerCase().includes(filterText.toLowerCase()) ||
      incident.depart?.toLowerCase().includes(filterText.toLowerCase());
    
    const matchesVoltage = voltageFilter === 'All Voltages' || incident.voltage === voltageFilter;
    
    return matchesText && matchesVoltage;
  });

  // Handle type selection
  const handleTypeChange = (type) => {
    // If type already exists in typeValue, remove it, otherwise add it
    if (typeValue.includes(type)) {
      setTypeValue(typeValue.split(' ').filter(t => t !== type).join(' '));
    } else {
      setTypeValue(typeValue ? `${typeValue} ${type}` : type);
    }
  };

  // Handle edit button click
  const handleEditClick = (incident) => {
    setEditingIncident(incident);
    setPosteName(incident.posteName || '');
    setVoltageLevel(incident.voltage || '30 kV');
    setDepartValue(incident.depart || '');
    const declenchement = incident.declenchement || '';
    const icMatch = declenchement.match(/\(Ic: (.*)\)/);
    setHeureValue(declenchement.replace(/\s*\(Ic: .*\)/, '') || '');
    setIcValue(icMatch ? icMatch[1] : '');
    setRDepartValue(incident.rDepart || '');
    setRetabValue(incident.retab || '');
    setIrValue(incident.ir || '');
    setFinRetabValue(incident.finRetab || '');
    setTronconsValue(incident.troncons || '');
    setTypeValue(incident.type || '');
    setIsEditing(true);
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingIncident(null);
    setPosteName('');
    setVoltageLevel('30 kV');
    setDepartValue('');
    setHeureValue('');
    setIcValue('');
    setRDepartValue('');
    setRetabValue('');
    setIrValue('');
    setFinRetabValue('');
    setTronconsValue('');
    setTypeValue('');
    setIsEditing(false);
  };

  // Handle form submission to add new incident
  const handleCommit = async () => {
    // Validate required fields
    if (!posteName.trim()) {
      alert('Poste Name is required');
      return;
    }

    if (!typeValue.trim()) {
      alert('At least one incident type is required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Create new incident object
      const newIncident = {
        posteName,
        voltage: voltageLevel,
        status: editingIncident ? editingIncident.status : 'Pending',
        depart: departValue,
        type: typeValue,
        declenchement: `${heureValue} ${icValue ? `(Ic: ${icValue})` : ''}`,
        rDepart: rDepartValue,
        retab: retabValue,
        ir: irValue,
        finRetab: finRetabValue,
        troncons: tronconsValue
      };

      if (isEditing && editingIncident) {
        // Update existing incident
        const incidentRef = doc(db, 'incidents', editingIncident.id);
        await updateDoc(incidentRef, newIncident);
        
        // Update local state
        setIncidents(prevIncidents => 
          prevIncidents.map(incident => 
            incident.id === editingIncident.id ? 
              { ...incident, ...newIncident } : 
              incident
          )
        );
        
        setSuccessMessage('Incident updated successfully!');
        setIsEditing(false);
        setEditingIncident(null);
      } else {
        // Add new incident
        newIncident.createdAt = serverTimestamp();
        
        // Add to Firestore
        const docRef = await addDoc(collection(db, 'incidents'), newIncident);
        
        // Update local state with the new incident
        setIncidents(prevIncidents => [
          {
            id: docRef.id,
            ...newIncident,
            createdAt: new Date() // Use current date for immediate display
          },
          ...prevIncidents
        ]);
        
        setSuccessMessage('Incident added successfully!');
      }
      
      // Reset form
      setPosteName('');
      setVoltageLevel('30 kV');
      setDepartValue('');
      setHeureValue('');
      setIcValue('');
      setRDepartValue('');
      setRetabValue('');
      setIrValue('');
      setFinRetabValue('');
      setTronconsValue('');
      setTypeValue('');
      
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsSubmitting(false);
    } catch (err) {
      console.error('Error processing incident:', err);
      alert('Failed to save incident. Please try again.');
      setIsSubmitting(false);
    }
  };

  // Handle PDF export
  const handleExportPDF = () => {
    setIsExporting(true);
    
    // Create a printable version of the data
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>STEG Incident Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #1976d2; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #f5f5f5; padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
            td { padding: 10px; border-bottom: 1px solid #eee; }
            .status { 
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
            }
            .pending { background-color: #fff8e1; color: #ff8f00; }
            .resolved { background-color: #e8f5e9; color: #388e3c; }
            .in-progress { background-color: #e3f2fd; color: #1976d2; }
            .voltage { 
              display: inline-block;
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 12px;
              background-color: #2196f3;
              color: white;
            }
            .date-time { color: #666; font-size: 0.8em; text-align: right; }
          </style>
        </head>
        <body>
          <h1>STEG Incident Management - Report</h1>
          <div class="date-time">Generated on: ${new Date().toLocaleString()}</div>
          
          <table>
            <thead>
              <tr>
                <th>Poste Name</th>
                <th>U(kV)</th>
                <th>Status</th>
                <th>Départ</th>
                <th>Type</th>
                <th>Déclenchement</th>
                <th>R Départ</th>
                <th>1er Retab</th>
                <th>Ir(A)</th>
                <th>Fin Retab</th>
                <th>Tronçons</th>
              </tr>
            </thead>
            <tbody>
              ${filteredIncidents.map(incident => `
                <tr>
                  <td>${incident.posteName || ''}</td>
                  <td><span class="voltage">${incident.voltage || ''}</span></td>
                  <td>
                    <span class="status ${incident.status?.toLowerCase() === 'pending' ? 'pending' : 
                                         incident.status?.toLowerCase() === 'resolved' ? 'resolved' : 'in-progress'}">
                      ${incident.status || ''}
                    </span>
                  </td>
                  <td>${incident.depart || ''}</td>
                  <td>${incident.type || ''}</td>
                  <td>${incident.declenchement || ''}</td>
                  <td>${incident.rDepart || ''}</td>
                  <td>${incident.retab || ''}</td>
                  <td>${incident.ir || ''}</td>
                  <td>${incident.finRetab || ''}</td>
                  <td>${incident.troncons || ''}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load before printing
    printWindow.onload = function() {
      printWindow.print();
      setIsExporting(false);
    };
  };

  // Function to update incident status
  const handleStatusChange = async (incidentId, newStatus) => {
    try {
      // Update in Firestore
      const incidentRef = doc(db, 'incidents', incidentId);
      await updateDoc(incidentRef, { 
        status: newStatus 
      });
      
      // Update local state
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => 
          incident.id === incidentId ? { ...incident, status: newStatus } : incident
        )
      );
      
      setSuccessMessage(`Incident status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update incident status. Please try again.');
    }
  };

  // Function to delete incident
  const handleDeleteIncident = async (incidentId) => {
    if (window.confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
      try {
        // Delete from Firestore
        const incidentRef = doc(db, 'incidents', incidentId);
        await deleteDoc(incidentRef);
        
        // Update local state
        setIncidents(prevIncidents => 
          prevIncidents.filter(incident => incident.id !== incidentId)
        );
        
        setSuccessMessage('Incident deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        console.error('Error deleting incident:', err);
        alert('Failed to delete incident. Please try again.');
      }
    }
  };

  // Function to mark incident as resolved
  const handleMarkResolved = async (incidentId) => {
    try {
      // Update in Firestore
      const incidentRef = doc(db, 'incidents', incidentId);
      await updateDoc(incidentRef, { 
        status: 'Resolved'
      });
      
      // Update local state
      setIncidents(prevIncidents => 
        prevIncidents.map(incident => 
          incident.id === incidentId ? { ...incident, status: 'Resolved' } : incident
        )
      );
      
      setSuccessMessage('Incident marked as resolved');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error resolving incident:', err);
      alert('Failed to update incident status. Please try again.');
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
          {/* Command Center */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h2 style={{
                fontSize: '1.2rem',
                margin: 0,
                fontWeight: 500
              }}>Incident Command Center</h2>
              
              <div style={{
                display: 'flex',
                gap: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <input 
                    type="text" 
                    placeholder="Filter by Poste..." 
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '250px'
                    }}
                  />
                </div>
                
                <div>
                  <select 
                    value={voltageFilter}
                    onChange={(e) => setVoltageFilter(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      width: '150px'
                    }}
                  >
                    <option>All Voltages</option>
                    <option>30 kV</option>
                    <option>60 kV</option>
                    <option>90 kV</option>
                  </select>
                </div>
                
                <button 
                  onClick={handleSync}
                  disabled={isSyncing}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 15px',
                    backgroundColor: isSyncing ? '#90caf9' : '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: isSyncing ? 'default' : 'pointer'
                  }}
                >
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                  </svg>
                  {isSyncing ? 'SYNCING...' : 'SYNC STATUS'}
                </button>
                
                <button 
                  onClick={handleExportPDF}
                  disabled={isExporting || isLoading || filteredIncidents.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '8px 15px',
                    backgroundColor: (isExporting || isLoading || filteredIncidents.length === 0) ? '#90caf9' : '#1976d2',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: (isExporting || isLoading || filteredIncidents.length === 0) ? 'default' : 'pointer'
                  }}
                >
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                  </svg>
                  {isExporting ? 'GENERATING...' : 'EXPORT PDF'}
                </button>
              </div>
            </div>

            {/* New Incident Entry */}
            <div style={{
              marginBottom: '20px',
              borderTop: '1px solid #eee',
              paddingTop: '20px'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 500,
                marginBottom: '15px'
              }}>
                {isEditing ? 'Edit Incident' : 'New Incident Entry'}
              </h3>
              
              {successMessage && (
                <div style={{
                  padding: '10px',
                  backgroundColor: '#e8f5e9',
                  color: '#388e3c',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  {successMessage}
                </div>
              )}
              
              {/* Row 1: Poste Name, Voltage, Depart, Heure */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '15px'
              }}>
                {/* Poste Name */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Poste Name *</label>
                  <input 
                    type="text" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={posteName}
                    onChange={(e) => setPosteName(e.target.value)}
                  />
                </div>
                
                {/* Voltage */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Voltage</label>
                  <select 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%',
                      backgroundColor: 'white'
                    }}
                    value={voltageLevel}
                    onChange={(e) => setVoltageLevel(e.target.value)}
                  >
                    <option>30 kV</option>
                    <option>60 kV</option>
                    <option>90 kV</option>
                  </select>
                </div>
                
                {/* Depart */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Depart</label>
                  <input 
                    type="text" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={departValue}
                    onChange={(e) => setDepartValue(e.target.value)}
                  />
                </div>
                
                {/* Heure */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Heure</label>
                  <input 
                    type="time" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={heureValue}
                    onChange={(e) => setHeureValue(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Row 2: Ic, R Depart Heure, 1er Retab, Ir, Fin Retab, Troncons */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '15px'
              }}>
                {/* Ic */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Ic(A)</label>
                  <input 
                    type="text" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={icValue}
                    onChange={(e) => setIcValue(e.target.value)}
                  />
                </div>
                
                {/* R Depart Heure */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>R Départ Heure</label>
                  <input 
                    type="time" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={rDepartValue}
                    onChange={(e) => setRDepartValue(e.target.value)}
                  />
                </div>
                
                {/* 1er Retab */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>1er Retab Heure</label>
                  <input 
                    type="time" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={retabValue}
                    onChange={(e) => setRetabValue(e.target.value)}
                  />
                </div>
                
                {/* Ir */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Ir(A)</label>
                  <input 
                    type="text" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={irValue}
                    onChange={(e) => setIrValue(e.target.value)}
                  />
                </div>
                
                {/* Fin Retab */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Fin Retab Heure</label>
                  <input 
                    type="time" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={finRetabValue}
                    onChange={(e) => setFinRetabValue(e.target.value)}
                  />
                </div>
                
                {/* Troncons */}
                <div style={{ flex: '1' }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Tronçons Concernés</label>
                  <input 
                    type="text" 
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                    value={tronconsValue}
                    onChange={(e) => setTronconsValue(e.target.value)}
                  />
                </div>
              </div>
              
              {/* Row 3: Incident Type */}
              <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                marginBottom: '15px'
              }}>
                <div style={{
                  flex: '1',
                }}>
                  <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontSize: '0.9rem',
                    color: '#666'
                  }}>Incident Type*</label>
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {incidentTypes.map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => handleTypeChange(type)}
                        style={{
                          padding: '6px 12px',
                          border: '1px solid #ddd',
                          borderRadius: '16px',
                          cursor: 'pointer',
                          backgroundColor: typeValue.includes(type) ? '#1976d2' : 'white',
                          color: typeValue.includes(type) ? 'white' : '#333',
                          fontSize: '0.9rem'
                        }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  {typeValue && (
                    <div style={{
                      marginTop: '8px',
                      fontSize: '0.8rem',
                      color: '#666'
                    }}>
                      Selected: {typeValue}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                gap: '10px',
                marginTop: '20px'
              }}>
                {isEditing && (
                  <button 
                    onClick={handleCancelEdit}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 20px',
                      backgroundColor: '#f5f5f5',
                      color: '#666',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontSize: '14px',
                      cursor: 'pointer',
                      marginRight: '10px'
                    }}
                  >
                    CANCEL
                  </button>
                )}
                
                <button 
                  onClick={handleCommit}
                  disabled={isSubmitting}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 20px',
                    backgroundColor: isSubmitting ? '#cccccc' : '#f5f5f5',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: isSubmitting ? 'default' : 'pointer'
                  }}
                >
                  {isSubmitting ? (
                    <>Loading...</>
                  ) : (
                    <>
                      <svg width="16" height="16" fill="#666" viewBox="0 0 24 24">
                        <path d="M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z"/>
                      </svg>
                      {isEditing ? 'UPDATE' : 'COMMIT'}
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Incidents Table */}
            <div style={{
              overflowX: 'auto'
            }}>
              {isLoading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  Loading incidents...
                </div>
              ) : error ? (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  color: '#d32f2f'
                }}>
                  {error}
                </div>
              ) : (
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '14px'
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Actions</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Poste Name</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>U(kV)</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Status</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Départ</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Type</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Déclenchement</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>R Départ Heure</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>1er Retab</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Ir(A)</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Fin Retab Heure</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Tronçons</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredIncidents.length === 0 ? (
                      <tr>
                        <td colSpan="12" style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#666'
                        }}>
                          No incidents found. Add a new incident using the form above.
                        </td>
                      </tr>
                    ) : (
                      filteredIncidents.map(incident => (
                        <tr key={incident.id}>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>
                            <div style={{
                              display: 'flex',
                              gap: '5px'
                            }}>
                              <button 
                                onClick={() => handleMarkResolved(incident.id)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  backgroundColor: '#4caf50',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleEditClick(incident)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  backgroundColor: '#2196f3',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleDeleteIncident(incident.id)}
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  border: 'none',
                                  backgroundColor: '#f44336',
                                  color: 'white',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  cursor: 'pointer'
                                }}
                              >
                                <svg width="14" height="14" fill="white" viewBox="0 0 24 24">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.posteName}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>
                            <span style={{
                              backgroundColor: '#2196f3',
                              color: 'white',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px'
                            }}>{incident.voltage}</span>
                          </td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>
                            <select 
                              style={{
                                padding: '4px 8px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                backgroundColor: 'white'
                              }}
                              value={incident.status || 'Pending'}
                              onChange={(e) => handleStatusChange(incident.id, e.target.value)}
                            >
                              <option>Pending</option>
                              <option>Resolved</option>
                              <option>In Progress</option>
                            </select>
                          </td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.depart}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.type}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.declenchement}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.rDepart}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.retab}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.ir}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.finRetab}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{incident.troncons}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Incidents; 