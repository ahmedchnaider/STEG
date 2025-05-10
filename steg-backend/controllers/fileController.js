const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// File filter for Excel and CSV files
const fileFilter = (req, file, cb) => {
  const allowedFileTypes = ['.xlsx', '.xls', '.csv'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedFileTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel and CSV files are allowed!'), false);
  }
};

// Initialize multer upload
const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Upload file and extract sheets
const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const filePath = req.file.path;
    const fileExt = path.extname(req.file.originalname).toLowerCase();
    
    let sheets = [];
    
    // Read file based on extension
    if (fileExt === '.csv') {
      // CSV files only have one sheet
      sheets = ['Sheet1'];
    } else {
      // For Excel files, read all sheet names
      const workbook = xlsx.readFile(filePath);
      sheets = workbook.SheetNames;
    }
    
    return res.status(200).json({
      success: true,
      data: {
        fileName: req.file.originalname,
        filePath: filePath,
        sheets: sheets,
        fileType: fileExt
      }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return res.status(500).json({
      success: false,
      message: 'Error uploading file: ' + error.message
    });
  }
};

// Get data from a specific sheet in an uploaded file
const getSheetData = async (req, res) => {
  try {
    const { filePath, sheetName } = req.body;
    
    if (!filePath || !sheetName) {
      return res.status(400).json({
        success: false,
        message: 'File path and sheet name are required'
      });
    }
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const fileExt = path.extname(filePath).toLowerCase();
    
    let data;
    let columns;
    let rows = [];
    
    // Handle CSV files
    if (fileExt === '.csv') {
      // For CSV files, use first sheet
      const workbook = xlsx.readFile(filePath, { raw: true });
      data = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
      
      if (data.length > 0) {
        columns = data[0];
        rows = data.slice(1).map(row => {
          const rowData = {};
          columns.forEach((col, index) => {
            rowData[col] = row[index] !== undefined ? row[index] : '';
          });
          return rowData;
        });
      }
    } else {
      // For Excel files, get specified sheet
      const workbook = xlsx.readFile(filePath, { raw: true });
      
      if (!workbook.SheetNames.includes(sheetName)) {
        return res.status(404).json({
          success: false,
          message: 'Sheet not found in file'
        });
      }
      
      data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      
      if (data.length > 0) {
        columns = data[0];
        rows = data.slice(1).map(row => {
          const rowData = {};
          columns.forEach((col, index) => {
            rowData[col] = row[index] !== undefined ? row[index] : '';
          });
          return rowData;
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      data: {
        columns,
        rows
      }
    });
    
  } catch (error) {
    console.error('Error getting sheet data:', error);
    return res.status(500).json({
      success: false,
      message: 'Error getting sheet data: ' + error.message
    });
  }
};

module.exports = {
  upload,
  uploadFile,
  getSheetData
}; 