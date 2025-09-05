// backend/middleware/multer.js - FIXED FOR MESSAGES DIRECTORY
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist
const uploadDir = 'uploads';
const messagesDir = 'uploads/messages';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(messagesDir)) {
  fs.mkdirSync(messagesDir, { recursive: true });
}

// Storage configuration for regular uploads (listings)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// FIXED: Dedicated storage configuration for messages
const messageStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Message file upload - saving to uploads/messages/');
    // Ensure messages directory exists
    if (!fs.existsSync(messagesDir)) {
      fs.mkdirSync(messagesDir, { recursive: true });
      console.log('Created messages directory');
    }
    cb(null, 'uploads/messages/');
  },
  filename: function (req, file, cb) {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    console.log('Message file saved as:', uniqueName);
    cb(null, uniqueName);
  }
});

const fileFilter = function (req, file, cb) {
  console.log('Multer received file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Define allowed file types
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov'];
  const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error('File type not allowed:', file.mimetype);
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allAllowedTypes.join(', ')}`), false);
  }
};

// Regular multer instance for listings
const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 5,
    fields: 50,
    fieldNameSize: 100,
    fieldSize: 10 * 1024 * 1024
  }
});

// FIXED: Dedicated multer instance for messages
const messageUpload = multer({ 
  storage: messageStorage, // Use dedicated message storage
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size per file
    files: 20, // Maximum 20 files per request
    fields: 50,
    fieldNameSize: 100,
    fieldSize: 10 * 1024 * 1024
  }
});

// Export configurations
module.exports = {
  // For single image upload (legacy)
  uploadSingle: upload.single('image'),
  
  // For listing uploads (4 images + 1 video)
  uploadFields: upload.fields([
    { name: 'images', maxCount: 4 },
    { name: 'video', maxCount: 1 }
  ]),
  
  // FIXED: For message media uploads using dedicated message storage
  uploadMessageMedia: messageUpload.fields([
    { name: 'media', maxCount: 20 }
  ]),
  
  // For any media files in messages (alternative)
  uploadMessageAny: messageUpload.any(),
  
  // Legacy support for single image
  uploadFieldsLegacy: upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  
  // For any files (up to 20) - using regular storage
  uploadAny: upload.any(),
  
  // Export the base upload for backwards compatibility
  upload
};