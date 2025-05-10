import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { app } from '../firebase/firebase';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';
import Sidebar from './Sidebar';

const Reports = ({ onLogout }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [exportFormat, setExportFormat] = useState('csv');
  const [isExporting, setIsExporting] = useState(false);

  const db = getFirestore(app);

  // Handle file upload
  const handleFileUpload = async (file) => {
    // Only accept Excel or CSV files
    const validExtensions = ['.xlsx', '.xls', '.csv'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.includes(fileExtension)) {
      alert('Please upload an Excel (.xlsx, .xls) or CSV file.');
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadError(null);
      
      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      
      // Upload to server
      const response = await fetch('http://localhost:5000/api/files/upload', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Set uploaded file with server path
        setUploadedFile({
          ...file,
          filePath: result.data.filePath,
          name: file.name,
          size: file.size
        });
        
        // Update available sheets from server response
        setAvailableSheets(result.data.sheets);
        
        // Select first sheet by default
        if (result.data.sheets.length > 0) {
          setSelectedSheet(result.data.sheets[0]);
          
          // Automatically load data from first sheet
          loadSheetData(result.data.filePath, result.data.sheets[0]);
        }
      } else {
        setUploadError(result.message || 'Error uploading file');
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Load sheet data
  const loadSheetData = async (filePath, sheetName) => {
    if (!filePath || !sheetName) return;
    
    try {
      setIsLoadingTable(true);
      
      const response = await fetch(`http://localhost:5000/api/files/sheet-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath,
          sheetName
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setTableData(result.data.rows);
        setTableColumns(result.data.columns);
      } else {
        setError(result.message || 'Error loading sheet data');
      }
    } catch (error) {
      console.error('Error loading sheet data:', error);
      setError('Failed to load sheet data. Please try again.');
    } finally {
      setIsLoadingTable(false);
    }
  };

  // Handle file input change
  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      handleFileUpload(file);
    }
  };

  // Handle file drop
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      handleFileUpload(file);
    }
  };

  // Handle drag events
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // Handle sheet selection
  const handleSheetChange = (e) => {
    const newSheet = e.target.value;
    setSelectedSheet(newSheet);
    if (uploadedFile && uploadedFile.filePath) {
      loadSheetData(uploadedFile.filePath, newSheet);
    }
  };

  // Handle file removal
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setTableData([]);
    setTableColumns([]);
    setSelectedSheet('');
    setAvailableSheets([]);
  };

  // Export table data
  const exportTable = async () => {
    if (tableData.length === 0 || isExporting) return;
    
    setIsExporting(true);
    
    try {
      // For CSV export directly in browser
      if (exportFormat === 'csv') {
        // Generate CSV content
        let csvContent = tableColumns.join(',') + '\n';
        
        tableData.forEach(row => {
          const rowValues = tableColumns.map(col => {
            // Ensure values with commas are quoted
            let value = row[col] || '';
            if (typeof value === 'string' && value.includes(',')) {
              return `"${value}"`;
            }
            return value;
          });
          csvContent += rowValues.join(',') + '\n';
        });
        
        // Create Blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `report_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (exportFormat === 'excel') {
        // For Excel, let's send a request to the backend
        const response = await fetch('http://localhost:5000/api/files/export-excel', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            columns: tableColumns,
            data: tableData
          }),
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report_${Date.now()}.xlsx`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          setError('Failed to export to Excel');
        }
      } else if (exportFormat === 'pdf') {
        // For PDF export
        const exportWindow = window.open('', '_blank');
        exportWindow.document.write(`
          <html>
            <head>
              <title>STEG Report Export</title>
              <style>
                body { font-family: Arial, sans-serif; padding: 20px; }
                h1 { color: #1976d2; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th { background-color: #f5f5f5; padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
                td { padding: 10px; border-bottom: 1px solid #eee; }
                .date-time { color: #666; font-size: 0.8em; text-align: right; }
              </style>
            </head>
            <body>
              <h1>STEG Report</h1>
              <div class="date-time">Generated on: ${new Date().toLocaleString()}</div>
              
              <table>
                <thead>
                  <tr>
                    ${tableColumns.map(col => `<th>${col}</th>`).join('')}
                  </tr>
                </thead>
                <tbody>
                  ${tableData.map(row => `
                    <tr>
                      ${tableColumns.map(col => `<td>${row[col] || ''}</td>`).join('')}
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </body>
          </html>
        `);
        
        exportWindow.document.close();
        exportWindow.focus();
        
        setTimeout(() => {
          exportWindow.print();
        }, 250);
      }
    } catch (error) {
      console.error('Export error:', error);
      setError('Failed to export data');
    } finally {
      setIsExporting(false);
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

        {/* Reports Content */}
        <div style={{
          padding: '20px',
          flexGrow: 1,
          overflowY: 'auto'
        }}>
          {/* File Upload Panel */}
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
            }}>Reports Management</h2>
            
            <div style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '30px'
            }}>
              <div style={{
                flex: 2
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  color: '#666',
                  marginBottom: '5px'
                }}>Upload Data Files (Excel or CSV)</label>
                
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '15px',
                  marginBottom: '10px'
                }}>
                  {/* Display uploaded file as a square if it exists */}
                  {uploadedFile && !isUploading && (
                    <div style={{
                      width: '120px',
                      height: '120px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      position: 'relative',
                      padding: '10px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{
                        position: 'absolute',
                        top: '5px',
                        right: '5px',
                        cursor: 'pointer',
                        zIndex: 2
                      }}
                      onClick={handleRemoveFile}
                      >
                        <svg style={{ width: '16px', height: '16px', color: '#f44336' }} viewBox="0 0 24 24">
                          <path fill="currentColor" d="M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z" />
                        </svg>
                      </div>
                      
                      <div style={{
                        width: '40px',
                        height: '40px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '10px'
                      }}>
                        <svg style={{ width: '24px', height: '24px', color: '#1976d2' }} viewBox="0 0 24 24">
                          <path fill="currentColor" d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                        </svg>
                      </div>
                      
                      <div style={{
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        width: '100%',
                        whiteSpace: 'nowrap'
                      }}>
                        <div style={{ fontWeight: 'bold', color: '#333', fontSize: '0.85rem' }}>{uploadedFile.name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Loading indicator during upload */}
                  {isUploading && (
                    <div style={{
                      width: '120px',
                      height: '120px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        border: '3px solid #f3f3f3',
                        borderTop: '3px solid #1976d2',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      <style>{`
                        @keyframes spin {
                          0% { transform: rotate(0deg); }
                          100% { transform: rotate(360deg); }
                        }
                      `}</style>
                      <p style={{ marginTop: '10px', fontSize: '0.8rem', color: '#666' }}>Uploading...</p>
                    </div>
                  )}
                  
                  {/* Error message */}
                  {uploadError && (
                    <div style={{
                      width: '100%',
                      padding: '10px',
                      backgroundColor: '#ffebee',
                      color: '#d32f2f',
                      borderRadius: '4px',
                      marginBottom: '10px'
                    }}>
                      {uploadError}
                    </div>
                  )}
                  
                  {/* Add new file square */}
                  <div 
                    style={{
                      width: '120px',
                      height: '120px',
                      border: `2px dashed ${isDragging ? '#1976d2' : '#ddd'}`,
                      borderRadius: '4px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'center',
                      alignItems: 'center',
                      backgroundColor: isDragging ? '#e3f2fd' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => document.getElementById('file-input').click()}
                  >
                    <input
                      id="file-input"
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                    <svg style={{ width: '32px', height: '32px', color: '#1976d2', marginBottom: '10px' }} viewBox="0 0 24 24">
                      <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
                    </svg>
                    <p style={{ margin: '0', color: '#666', fontSize: '0.85rem', textAlign: 'center' }}>
                      Add File
                    </p>
                    <p style={{ margin: '5px 0 0', fontSize: '0.7rem', color: '#888', textAlign: 'center' }}>
                      .xlsx, .xls, .csv
                    </p>
                  </div>
                </div>
              </div>
              
              <div style={{
                flex: 1
              }}>
                <label style={{
                  display: 'block',
                  fontSize: '0.9rem',
                  color: '#666',
                  marginBottom: '5px'
                }}>Select Sheet</label>
                <select 
                  value={selectedSheet}
                  onChange={handleSheetChange}
                  disabled={!uploadedFile || isUploading}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    width: '100%',
                    backgroundColor: (uploadedFile && !isUploading) ? 'white' : '#f5f5f5',
                    cursor: (uploadedFile && !isUploading) ? 'pointer' : 'not-allowed'
                  }}
                >
                  {availableSheets.length === 0 ? (
                    <option value="">No sheets available</option>
                  ) : (
                    availableSheets.map(sheet => (
                      <option key={sheet} value={sheet}>{sheet}</option>
                    ))
                  )}
                </select>
                <div style={{ 
                  marginTop: '5px', 
                  fontSize: '0.8rem', 
                  color: uploadedFile ? '#388e3c' : '#888',
                  display: 'flex',
                  alignItems: 'center' 
                }}>
                  {uploadedFile ? (
                    <>
                      <svg style={{ width: '16px', height: '16px', marginRight: '4px' }} viewBox="0 0 24 24">
                        <path fill="currentColor" d="M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z" />
                      </svg>
                      Ready to view
                    </>
                  ) : 'Upload a file to select sheet'}
                </div>
              </div>
            </div>
          </div>
          
          {/* Table Display and Export */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '15px'
            }}>
              <h2 style={{
                fontSize: '1.2rem',
                color: '#333',
                margin: 0,
                fontWeight: 500
              }}>Report Data</h2>
              
              {tableData.length > 0 && (
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center'
                }}>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      backgroundColor: 'white'
                    }}
                  >
                    <option value="csv">CSV</option>
                    <option value="excel">Excel</option>
                    <option value="pdf">PDF (Print)</option>
                  </select>
                  
                  <button
                    onClick={exportTable}
                    disabled={isExporting || tableData.length === 0}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      backgroundColor: (isExporting || tableData.length === 0) ? '#90caf9' : '#1976d2',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '0.9rem',
                      cursor: (isExporting || tableData.length === 0) ? 'default' : 'pointer'
                    }}
                  >
                    <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
                    </svg>
                    {isExporting ? 'Exporting...' : `Export as ${exportFormat.toUpperCase()}`}
                  </button>
                </div>
              )}
            </div>
            
            {isLoadingTable ? (
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '200px'
              }}>
                <p>Loading table data...</p>
              </div>
            ) : error ? (
              <div>
                <div style={{
                  padding: '15px',
                  backgroundColor: '#ffebee',
                  color: '#d32f2f',
                  borderRadius: '4px',
                  marginBottom: '15px'
                }}>
                  {error}
                </div>
                
                {/* Display a table with just the selected sheet name even if there's an error */}
                {selectedSheet && (
                  <div style={{
                    overflowX: 'auto'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      border: '1px solid #ccc',
                      fontSize: '0.9rem'
                    }}>
                      <thead>
                        <tr>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            Poste
                          </th>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            DEPART HTA
                          </th>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            U<br/>(kV)
                          </th>
                          <th colSpan="2" style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            MAXIMUM
                          </th>
                          <th colSpan="2" style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            MINIMUM
                          </th>
                        </tr>
                        <tr>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5'
                          }}></th>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5'
                          }}></th>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5'
                          }}></th>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            I(A)
                          </th>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            DATE/HEURE
                          </th>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            I(A)
                          </th>
                          <th style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            backgroundColor: '#f5f5f5',
                            textAlign: 'center',
                            fontWeight: 'bold'
                          }}>
                            DATE/HEURE
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            fontWeight: 'bold'
                          }}>
                            {selectedSheet}
                          </td>
                          <td style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px'
                          }}></td>
                          <td style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            textAlign: 'center'
                          }}></td>
                          <td style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            textAlign: 'right'
                          }}></td>
                          <td style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            textAlign: 'center'
                          }}></td>
                          <td style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            textAlign: 'right'
                          }}></td>
                          <td style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            textAlign: 'center'
                          }}></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                overflowX: 'auto'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  border: '1px solid #ccc',
                  fontSize: '0.9rem'
                }}>
                  <thead>
                    <tr>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        Poste
                      </th>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        DEPART HTA
                      </th>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        U<br/>(kV)
                      </th>
                      <th colSpan="2" style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        MAXIMUM
                      </th>
                      <th colSpan="2" style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        MINIMUM
                      </th>
                    </tr>
                    <tr>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5'
                      }}></th>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5'
                      }}></th>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5'
                      }}></th>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        I(A)
                      </th>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        DATE/HEURE
                      </th>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        I(A)
                      </th>
                      <th style={{
                        border: '1px solid #ccc',
                        padding: '8px 15px',
                        backgroundColor: '#f5f5f5',
                        textAlign: 'center',
                        fontWeight: 'bold'
                      }}>
                        DATE/HEURE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableData.length > 0 ? (
                      tableData.map((row, index) => (
                        <tr key={index}>
                          {/* Use the selected sheet name for the Poste name in first row */}
                          <td style={{
                            border: '1px solid #ccc',
                            padding: '8px 15px',
                            fontWeight: index === 0 ? 'bold' : 'normal'
                          }}>
                            {index === 0 ? selectedSheet : ''}
                          </td>
                          {/* Render other cells based on table data */}
                          {tableColumns.map((col, colIndex) => (
                            <td key={colIndex} style={{
                              border: '1px solid #ccc',
                              padding: '8px 15px',
                              textAlign: ['I(A)'].includes(col) ? 'right' : 'center'
                            }}>
                              {row[col]}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : selectedSheet ? (
                      <tr>
                        <td style={{
                          border: '1px solid #ccc',
                          padding: '8px 15px',
                          fontWeight: 'bold'
                        }}>
                          {selectedSheet}
                        </td>
                        <td style={{
                          border: '1px solid #ccc',
                          padding: '8px 15px'
                        }}></td>
                        <td style={{
                          border: '1px solid #ccc',
                          padding: '8px 15px',
                          textAlign: 'center'
                        }}></td>
                        <td style={{
                          border: '1px solid #ccc',
                          padding: '8px 15px',
                          textAlign: 'right'
                        }}></td>
                        <td style={{
                          border: '1px solid #ccc',
                          padding: '8px 15px',
                          textAlign: 'center'
                        }}></td>
                        <td style={{
                          border: '1px solid #ccc',
                          padding: '8px 15px',
                          textAlign: 'right'
                        }}></td>
                        <td style={{
                          border: '1px solid #ccc',
                          padding: '8px 15px',
                          textAlign: 'center'
                        }}></td>
                      </tr>
                    ) : (
                      <tr>
                        <td style={{
                          border: '1px solid #ccc',
                          padding: '8px 15px',
                          textAlign: 'center'
                        }} colSpan={7}>
                          Upload a file and select a sheet to view data
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports; 