// backend/middleware/multer.js - FIXED FOR MESSAGES DIRECTORY
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directories exist
const uploadDir = 'uploads';
const messagesDir = 'uploads/messages';
const profilePicturesDir = 'uploads/profile-pictures';
const idsDir = 'uploads/ids';
if (!fs.existsSync(idsDir)) {
  fs.mkdirSync(idsDir, { recursive: true });
  console.log('✅ Created uploads/ids directory');
}

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(messagesDir)) {
  fs.mkdirSync(messagesDir, { recursive: true });
}
if (!fs.existsSync(profilePicturesDir)) {
  fs.mkdirSync(profilePicturesDir, { recursive: true });
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

const profilePictureStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('Profile picture upload - saving to uploads/profile-pictures/');
    // Ensure profile pictures directory exists
    if (!fs.existsSync(profilePicturesDir)) {
      fs.mkdirSync(profilePicturesDir, { recursive: true });
      console.log('Created profile-pictures directory');
    }
    cb(null, 'uploads/profile-pictures/');
  },
  filename: function (req, file, cb) {
    // Use user ID in filename for easy identification
    const userId = req.user ? req.user.id : 'unknown';
    const uniqueName = `profile-${userId}-${Date.now()}${path.extname(file.originalname)}`;
    console.log('Profile picture saved as:', uniqueName);
    cb(null, uniqueName);
  }
});

// Storage configuration for customer ID documents
const customerIdStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    console.log('📁 Customer ID upload - saving to uploads/ids/');
    // Ensure IDs directory exists
    if (!fs.existsSync(idsDir)) {
      fs.mkdirSync(idsDir, { recursive: true });
      console.log('Created ids directory');
    }
    cb(null, 'uploads/ids/');
  },
  filename: function (req, file, cb) {
    const bookingId = req.params.bookingId || 'unknown';
    const side = req.body.side || 'document';
    const uniqueName = `id-${bookingId}-${side}-${Date.now()}${path.extname(file.originalname)}`;
    console.log('Customer ID saved as:', uniqueName);
    cb(null, uniqueName);
  }
});

// File filter for customer IDs (images only)
const customerIdFileFilter = function (req, file, cb) {
  console.log('Customer ID multer received file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error('ID file type not allowed:', file.mimetype);
    cb(new Error(`ID must be an image (JPEG, PNG, or WebP)`), false);
  }
};

// Multer instance for customer IDs
const customerIdUpload = multer({
  storage: customerIdStorage,
  fileFilter: customerIdFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 2, // Max 2 files (front and back)
    fields: 20,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024
  }
});

// File filter specifically for profile pictures (only images)
const profilePictureFilter = function (req, file, cb) {
  console.log('Profile picture multer received file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  // Only allow image types for profile pictures (Sharp will convert them all to JPEG)
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];

  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    console.error('Profile picture file type not allowed:', file.mimetype);
    cb(new Error(`Profile picture must be an image. Allowed types: ${allowedImageTypes.join(', ')}`), false);
  }
};

// Multer instance for profile pictures
const profilePictureUpload = multer({
  storage: profilePictureStorage,
  fileFilter: profilePictureFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size for profile pictures
    files: 1, // Only 1 profile picture at a time
    fields: 10,
    fieldNameSize: 100,
    fieldSize: 1024 * 1024
  }
});

// Add to your exports at the bottom of the file:
module.exports = {
  // Existing exports...
  uploadSingle: upload.single('image'),
  uploadFields: upload.fields([
    { name: 'images', maxCount: 4 },
    { name: 'video', maxCount: 1 }
  ]),
  uploadMessageMedia: messageUpload.fields([
    { name: 'media', maxCount: 20 }
  ]),
  uploadMessageAny: messageUpload.any(),
  uploadFieldsLegacy: upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
  ]),
  uploadAny: upload.any(),
  upload,

  // NEW: Profile picture upload
  uploadProfilePicture: profilePictureUpload.single('profilePicture'),
  
  // Alternative: if you want to use 'avatar' as field name
  uploadAvatar: profilePictureUpload.single('avatar'),

  uploadCustomerIds: customerIdUpload.array('images', 2),
  uploadCustomerIdsFields: customerIdUpload.fields([
    { name: 'images', maxCount: 2 }
  ])
};