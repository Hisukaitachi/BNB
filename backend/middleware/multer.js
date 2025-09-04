// backend/middleware/multer.js - UPDATED FOR MULTIPLE IMAGES
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
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
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi'];
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
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 5, // UPDATED: Maximum 5 files (4 images + 1 video)
    fields: 50,
    fieldNameSize: 100,
    fieldSize: 10 * 1024 * 1024
  }
});

// UPDATED: Export multiple upload configurations
module.exports = {
  // For single image upload (legacy)
  uploadSingle: upload.single('image'),
  
  // UPDATED: For multiple images + video
  uploadFields: upload.fields([
    { name: 'images', maxCount: 4 },   // Support up to 4 images
    { name: 'video', maxCount: 1 }     // Support 1 video
  ]),
  
  // Legacy support for single image
  uploadFieldsLegacy: upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  
  // For any files (up to 5)
  uploadAny: upload.any(),
  
  // Export the base upload for backwards compatibility
  upload
};