// src/components/profile/ProfilePictureUpload.jsx
import { useState, useRef } from 'react';
import { Camera, Upload, X, User } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import profilePictureService from '../../services/profilePictureService';

const ProfilePictureUpload = ({ user, onUpdateSuccess, className = '' }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const { updateUser } = useAuth();
  const fileInputRef = useRef(null);

  const validateImageFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    if (!file) return { isValid: false, error: 'No file selected' };
    if (file.size > maxSize) return { isValid: false, error: 'Image must be smaller than 5MB' };
    if (!allowedTypes.includes(file.type)) return { isValid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    
    return { isValid: true };
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setError('');
    const validation = validateImageFile(file);
    if (!validation.isValid) {
      setError(validation.error);
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setSelectedFile(file);
  };

const handleUpload = async () => {
  if (!selectedFile) {
    setError('Please select an image first');
    return;
  }

  setIsUploading(true);
  setError('');

  try {
    const result = await profilePictureService.uploadProfilePicture(selectedFile);
    
    const updatedUser = {
      ...user,
      profile_picture: result.profilePicture
    };

    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Update AuthContext to reflect in Header immediately
    if (updateUser) {
      updateUser({ profile_picture: result.profilePicture });
    }
    
    if (onUpdateSuccess) {
      onUpdateSuccess(updatedUser);
    }

    handleCancelPreview();
    alert('Profile picture updated successfully!');
  } catch (error) {
    console.error('Upload error:', error);
    setError(error.message);
  } finally {
    setIsUploading(false);
  }
};

// Update handleDelete function:
const handleDelete = async () => {
  if (!user.profile_picture) return;

  if (!confirm('Are you sure you want to delete your profile picture?')) {
    return;
  }

  setIsUploading(true);
  setError('');

  try {
    await profilePictureService.deleteProfilePicture();

    const updatedUser = { ...user, profile_picture: null };
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Update AuthContext to reflect in Header immediately
    if (updateUser) {
      updateUser({ profile_picture: null });
    }
    
    if (onUpdateSuccess) {
      onUpdateSuccess(updatedUser);
    }

    alert('Profile picture deleted successfully!');
  } catch (error) {
    setError(error.message);
  } finally {
    setIsUploading(false);
  }
};
  const handleCancelPreview = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const currentProfilePicture = previewUrl || user.profile_picture;
  const hasProfilePicture = user.profile_picture || previewUrl;

  return (
    <div className={`bg-gray-800 rounded-xl p-4 sm:p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-4">Profile Picture</h3>
      
      {error && (
        <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
        <div className="relative">
          {currentProfilePicture ? (
            <img
              src={currentProfilePicture}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-gray-600"
            />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white font-medium text-2xl">
              {user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U'}
            </div>
          )}
          
          <button
            onClick={triggerFileSelect}
            className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
            disabled={isUploading}
          >
            <Camera className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="flex-1 space-y-3">
          {!previewUrl ? (
            <div className="space-y-3">
              <Button
                onClick={triggerFileSelect}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto border-purple-500 text-purple-400"
                disabled={isUploading}
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              
              {hasProfilePicture && (
                <Button
                  onClick={handleDelete}
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto border-red-500 text-red-400 hover:bg-red-500/10"
                  disabled={isUploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-gray-300">
                <p className="font-medium">{selectedFile?.name}</p>
                <p className="text-gray-400">
                  {selectedFile?.size ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB` : ''}
                </p>
              </div>
              
              <div className="flex space-x-2">
                <Button
                  onClick={handleUpload}
                  loading={isUploading}
                  variant="gradient"
                  size="sm"
                  className="flex-1"
                >
                  Save Photo
                </Button>
                <Button
                  onClick={handleCancelPreview}
                  variant="ghost"
                  size="sm"
                  className="text-gray-400"
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 space-y-1">
            <p>• JPEG, PNG, WebP, or GIF</p>
            <p>• Maximum 5MB file size</p>
            <p>• Square images work best</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default ProfilePictureUpload;