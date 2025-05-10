import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { app } from '../firebase/firebase';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import Sidebar from './Sidebar';

const Users = ({ onLogout }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('Operator');
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const db = getFirestore(app);
  const auth = getAuth(app);

  // Fetch users from Firebase
  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, orderBy('lastActive', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setUsers(usersData);
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again later.');
      setIsLoading(false);
    }
  };

  // Initialize data on component mount
  useEffect(() => {
    fetchUsers();
  }, []);

  const filteredUsers = searchQuery 
    ? users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.role?.toLowerCase().includes(searchQuery.toLowerCase())
      ) 
    : users;

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      alert('Name, email, and password are required');
      return;
    }

    try {
      setIsSubmitting(true);
      
      // First create the user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        newUserEmail,
        newUserPassword
      );
      
      const uid = userCredential.user.uid;
      
      // Create new user object for Firestore
      const newUser = {
        uid: uid,
        name: newUserName,
        email: newUserEmail,
        role: newUserRole,
        lastActive: new Date().toISOString(),
        status: 'Active',
        createdAt: serverTimestamp()
      };
      
      // Add to Firestore (without storing the password)
      const docRef = await addDoc(collection(db, 'users'), newUser);
      
      // Update local state with the new user
      setUsers(prevUsers => [
        {
          id: docRef.id,
          ...newUser
        },
        ...prevUsers
      ]);
      
      // Reset form
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('Operator');
      
      // Show success message
      setSuccessMessage('User added successfully to both Authentication and Database!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
      setIsSubmitting(false);
    } catch (err) {
      console.error('Error adding user:', err);
      let errorMessage = 'Failed to save user. Please try again.';
      
      // Handle specific Firebase Auth errors
      if (err.code === 'auth/email-already-in-use') {
        errorMessage = 'Email already in use. Please use a different email.';
      } else if (err.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use a stronger password.';
      }
      
      alert(errorMessage);
      setIsSubmitting(false);
    }
  };

  // Function to update user status
  const handleStatusChange = async (userId, newStatus) => {
    try {
      // Update in Firestore
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { 
        status: newStatus 
      });
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId ? { ...user, status: newStatus } : user
        )
      );
      
      setSuccessMessage(`User status updated to ${newStatus}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Failed to update user status. Please try again.');
    }
  };

  // Function to delete user
  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      try {
        // Delete from Firestore
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
        
        // Update local state
        setUsers(prevUsers => 
          prevUsers.filter(user => user.id !== userId)
        );
        
        setSuccessMessage('User deleted successfully');
        setTimeout(() => setSuccessMessage(''), 3000);
      } catch (err) {
        console.error('Error deleting user:', err);
        alert('Failed to delete user. Please try again.');
      }
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

        {/* Users Content */}
        <div style={{
          padding: '20px',
          flexGrow: 1,
          overflowY: 'auto'
        }}>
          {/* User Management Panel */}
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
                color: '#333',
                margin: 0,
                fontWeight: 500
              }}>User Management</h2>
              
              <div style={{
                display: 'flex',
                gap: '10px'
              }}>
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    width: '250px'
                  }}
                />
                
                <button style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '8px 15px',
                  backgroundColor: '#1976d2',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }} onClick={fetchUsers}>
                  <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
                    <path d="M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.97-.7 2.8l1.46 1.46C19.54 15.03 20 13.57 20 12c0-4.42-3.58-8-8-8zm0 14c-3.31 0-6-2.69-6-6 0-1.01.25-1.97.7-2.8L5.24 7.74C4.46 8.97 4 10.43 4 12c0 4.42 3.58 8 8 8v3l4-4-4-4v3z"/>
                  </svg>
                  REFRESH
                </button>
              </div>
            </div>

            {/* Add User Form */}
            <div style={{
              marginBottom: '20px',
              borderTop: '1px solid #eee',
              paddingTop: '20px'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: 500,
                marginBottom: '15px'
              }}>Add New User</h3>
              
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
              
              <form onSubmit={handleAddUser} style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '15px',
                marginBottom: '20px'
              }}>
                <div style={{ flex: '1 1 250px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    color: '#666',
                    marginBottom: '5px'
                  }}>Full Name *</label>
                  <input 
                    type="text" 
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    required
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                  />
                </div>
                
                <div style={{ flex: '1 1 250px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    color: '#666',
                    marginBottom: '5px'
                  }}>Email Address *</label>
                  <input 
                    type="email" 
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    required
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                  />
                </div>

                <div style={{ flex: '1 1 250px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    color: '#666',
                    marginBottom: '5px'
                  }}>Password *</label>
                  <input 
                    type="password" 
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    required
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%'
                    }}
                  />
                </div>
                
                <div style={{ flex: '1 1 200px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '0.9rem',
                    color: '#666',
                    marginBottom: '5px'
                  }}>Role *</label>
                  <select 
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      width: '100%',
                      backgroundColor: 'white'
                    }}
                  >
                    <option>Administrator</option>
                    <option>Supervisor</option>
                    <option>Operator</option>
                    <option>Technician</option>
                  </select>
                </div>
                
                <div style={{ 
                  flex: '0 0 auto', 
                  display: 'flex', 
                  alignItems: 'flex-end'
                }}>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: isSubmitting ? '#a5d6a7' : '#4caf50',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: isSubmitting ? 'default' : 'pointer',
                      fontSize: '14px'
                    }}
                  >
                    {isSubmitting ? 'Saving...' : 'Save User'}
                  </button>
                </div>
              </form>
            </div>

            {/* Users Table */}
            <div style={{
              overflowX: 'auto'
            }}>
              {isLoading ? (
                <div style={{
                  textAlign: 'center',
                  padding: '20px'
                }}>
                  Loading users...
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
                      }}>User ID</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Name</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Email</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Role</th>
                      <th style={{
                        padding: '10px 15px',
                        textAlign: 'left',
                        borderBottom: '1px solid #eee',
                        color: '#666',
                        fontWeight: '500'
                      }}>Last Active</th>
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
                      }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="7" style={{
                          padding: '20px',
                          textAlign: 'center',
                          color: '#666'
                        }}>
                          No users found. Add a new user using the form above.
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.id}>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{user.id.substring(0, 6)}...</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee',
                            fontWeight: 500
                          }}>{user.name}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{user.email}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              backgroundColor: user.role === 'Administrator' ? '#e3f2fd' : 
                                             user.role === 'Supervisor' ? '#fff8e1' : 
                                             user.role === 'Operator' ? '#e8f5e9' : '#f1f8e9',
                              color: user.role === 'Administrator' ? '#1976d2' : 
                                    user.role === 'Supervisor' ? '#ff8f00' : 
                                    user.role === 'Operator' ? '#388e3c' : '#558b2f'
                            }}>
                              {user.role}
                            </span>
                          </td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>{user.lastActive}</td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>
                            <select
                              value={user.status || 'Active'}
                              onChange={(e) => handleStatusChange(user.id, e.target.value)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '12px',
                                fontSize: '12px',
                                border: 'none',
                                backgroundColor: user.status === 'Active' ? '#e8f5e9' : '#ffebee',
                                color: user.status === 'Active' ? '#388e3c' : '#d32f2f'
                              }}
                            >
                              <option value="Active">Active</option>
                              <option value="Inactive">Inactive</option>
                            </select>
                          </td>
                          <td style={{
                            padding: '10px 15px',
                            borderBottom: '1px solid #eee'
                          }}>
                            <div style={{
                              display: 'flex',
                              gap: '5px'
                            }}>
                              <button style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#f5f5f5',
                                color: '#666',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}>
                                <svg width="16" height="16" fill="#666" viewBox="0 0 24 24">
                                  <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                                </svg>
                              </button>
                              <button style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#f5f5f5',
                                color: '#666',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}>
                                <svg width="16" height="16" fill="#666" viewBox="0 0 24 24">
                                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                              </button>
                              <button 
                                onClick={() => handleDeleteUser(user.id)}
                                style={{
                                width: '30px',
                                height: '30px',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#ffebee',
                                color: '#d32f2f',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer'
                              }}>
                                <svg width="16" height="16" fill="#d32f2f" viewBox="0 0 24 24">
                                  <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                              </button>
                            </div>
                          </td>
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

export default Users; 