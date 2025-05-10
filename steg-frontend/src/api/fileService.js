const API_URL = 'http://localhost:5000/api';

/**
 * Upload a file and get sheet names
 * @param {File} file - The file to upload
 * @returns {Promise<Object>} - Response with file info and sheet names
 */
export const uploadFile = async (file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await fetch(`${API_URL}/files/upload`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Error uploading file');
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Upload error:', error);
    throw error;
  }
}; 