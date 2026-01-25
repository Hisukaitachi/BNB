// backend/middleware/multer.js - CLOUDINARY VERSION
const multer = require('multer');
const path = require('path');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

console.log('☁️ Cloudinary configured:', process.env.CLOUDINARY_CLOUD_NAME ? '✅' : '❌');

// Cloudinary storage for listings
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'staybnb/listings',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm'],
    resource_type: 'auto', // Automatically detect image/video
    transformation: [{ quality: 'auto:good' }]
  }
});

// Cloudinary storage for messages
const messageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'staybnb/messages',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'quicktime', 'avi', 'mov'],
    resource_type: 'auto',
    transformation: [{ quality: 'auto:good' }]
  }
});

// Cloudinary storage for profile pictures
const profilePictureStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'staybnb/profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'],
    resource_type: 'image',
    transformation: [
      { width: 500, height: 500, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' }
    ]
  }
});

// Cloudinary storage for customer IDs
const customerIdStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'staybnb/customer-ids',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    resource_type: 'image',
    transformation: [{ quality: 'auto:good' }]
  }
});

// File filters
const fileFilter = function (req, file, cb) {
  console.log('Multer received file:', {
    fieldname: file.fieldname,
    originalname: file.originalname,
    mimetype: file.mimetype
  });

  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/avi', 'video/mov'];
  const allAllowedTypes = [...allowedImageTypes, ...allowedVideoTypes];

  if (allAllowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} not allowed`), false);
  }
};

const profilePictureFilter = function (req, file, cb) {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff'];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Profile picture must be an image`), false);
  }
};

const customerIdFileFilter = function (req, file, cb) {
  const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedImageTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`ID must be an image (JPEG, PNG, or WebP)`), false);
  }
};

// Multer instances
const upload = multer({ 
  storage, 
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
    files: 9
  }
});

const messageUpload = multer({ 
  storage: messageStorage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
    files: 20
  }
});

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  fileFilter: profilePictureFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1
  }
});

const customerIdUpload = multer({
  storage: customerIdStorage,
  fileFilter: customerIdFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 2
  }
});

module.exports = {
  uploadSingle: upload.single('image'),
  uploadFields: upload.fields([
    { name: 'images', maxCount: 8 },
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
  uploadProfilePicture: profilePictureUpload.single('profilePicture'),
  uploadAvatar: profilePictureUpload.single('avatar'),
  uploadCustomerIds: customerIdUpload.array('images', 2),
  uploadCustomerIdsFields: customerIdUpload.fields([
    { name: 'images', maxCount: 2 }
  ]),
  cloudinary // Export cloudinary for direct usage if needed
};