// backend/middleware/multer.js - ENHANCED FOR MESSAGING
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists with subdirectories
const uploadDir = 'uploads';
const messagesDir = 'uploads/messages';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(messagesDir)) {
  fs.mkdirSync(messagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Separate storage for messages vs listings
    if (req.route && req.route.path.includes('messages')) {
      cb(null, 'uploads/messages/');
    } else {
      cb(null, 'uploads/');
    }
  },
  filename: function (req, file, cb) {
    // Create unique filename with timestamp and original extension
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = function (req, file, cb) {
  console.log('📁 Multer received file:', {
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
    console.error('❌ File type not allowed:', file.mimetype);
    cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: ${allAllowedTypes.join(', ')}`), false);
  }
};

// Create multer instance with enhanced configuration
const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size per file
    files: 20, // Maximum 20 files per request
    fields: 50,
    fieldNameSize: 100,
    fieldSize: 10 * 1024 * 1024
  }
});

// ENHANCED: Export multiple upload configurations
module.exports = {
  // For single image upload (legacy)
  uploadSingle: upload.single('image'),
  
  // For listing uploads (4 images + 1 video)
  uploadFields: upload.fields([
    { name: 'images', maxCount: 4 },   // Support up to 4 images for listings
    { name: 'video', maxCount: 1 }     // Support 1 video for listings
  ]),
  
  // NEW: For message media uploads (unlimited files)
  uploadMessageMedia: upload.fields([
    { name: 'media', maxCount: 20 }    // Up to 20 media files per message
  ]),
  
  // NEW: For any media files in messages
  uploadMessageAny: upload.any(),
  
  // Legacy support for single image
  uploadFieldsLegacy: upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  
  // For any files (up to 20)
  uploadAny: upload.any(),
  
  // Export the base upload for backwards compatibility
  upload
};