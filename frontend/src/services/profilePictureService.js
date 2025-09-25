// frontend/src/services/profilePictureService.js
import api from './api';

export const PROFILE_PICTURE_SIZES = {
  THUMBNAIL: 'thumbnail',
  SMALL: 'small',
  MEDIUM: 'medium'
};

class ProfilePictureService {
  /**
   * Upload profile picture
   * @param {File} file - Image file to upload
   * @returns {Promise<object>} Upload result
   */
  async uploadProfilePicture(file) {
    try {
      if (!file) {
        throw new Error('Please select an image file');
      }

      // Validate file
      const validation = this.validateImageFile(file);
      if (!validation.isValid) {
        throw new Error(validation.error);
      }

      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      return {
        success: true,
        data: response.data.data,
        profilePicture: response.data.data?.profilePicture,
        allSizes: response.data.data?.profilePictures
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to upload profile picture');
    }
  }

  /**
   * Delete profile picture
   * @returns {Promise<object>} Delete result
   */
  async deleteProfilePicture() {
    try {
      const response = await api.delete('/users/profile-picture');
      
      return {
        success: true,
        message: response.data.message || 'Profile picture deleted successfully'
      };
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Failed to delete profile picture');
    }
  }

  /**
   * Get profile picture URL with size
   * @param {string} profilePictureUrl - Base profile picture URL
   * @param {string} size - Size (thumbnail, small, medium)
   * @returns {string} Sized profile picture URL
   */
  getProfilePictureUrl(profilePictureUrl, size = PROFILE_PICTURE_SIZES.MEDIUM) {
    if (!profilePictureUrl) return null;

    // If URL already has size suffix, return as-is
    if (profilePictureUrl.includes('-medium.') || 
        profilePictureUrl.includes('-small.') || 
        profilePictureUrl.includes('-thumbnail.')) {
      return profilePictureUrl;
    }

    // Add size suffix to URL
    const urlParts = profilePictureUrl.split('-medium.');
    if (urlParts.length === 2) {
      return `${urlParts[0]}-${size}.${urlParts[1]}`;
    }

    // Fallback to original URL
    return profilePictureUrl;
  }

  /**
   * Validate image file
   * @param {File} file - File to validate
   * @returns {object} Validation result
   */
  validateImageFile(file) {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

    if (!file) {
      return { isValid: false, error: 'No file selected' };
    }

    if (file.size > maxSize) {
      return { isValid: false, error: 'Image must be smaller than 5MB' };
    }

    if (!allowedTypes.includes(file.type)) {
      return { isValid: false, error: 'Only JPEG, PNG, WebP, and GIF images are allowed' };
    }

    return { isValid: true };
  }

  /**
   * Create image preview URL
   * @param {File} file - Image file
   * @returns {string} Preview URL
   */
  createPreviewUrl(file) {
    return URL.createObjectURL(file);
  }

  /**
   * Cleanup preview URL
   * @param {string} url - Preview URL to cleanup
   */
  cleanupPreviewUrl(url) {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Generate profile picture placeholder
   * @param {string} name - User name for initials
   * @param {string} size - Size class
   * @returns {object} Placeholder config
   */
  generatePlaceholder(name, size = 'medium') {
    const initials = name
      ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
      : 'U';

    const sizeClasses = {
      thumbnail: 'w-6 h-6 text-xs',
      small: 'w-8 h-8 text-sm',
      medium: 'w-10 h-10 text-base',
      large: 'w-16 h-16 text-xl',
      xl: 'w-24 h-24 text-2xl'
    };

    return {
      initials,
      className: `${sizeClasses[size] || sizeClasses.medium} bg-gradient-to-r from-purple-400 to-pink-600 rounded-full flex items-center justify-center text-white font-medium`
    };
  }

  /**
   * Format file size for display
   * @param {number} bytes - File size in bytes
   * @returns {string} Formatted size
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Check if URL is a profile picture
   * @param {string} url - URL to check
   * @returns {boolean} Is profile picture URL
   */
  isProfilePictureUrl(url) {
    if (!url) return false;
    return url.includes('/uploads/profile-pictures/') || 
           url.includes('profile-') || 
           url.startsWith('blob:');
  }

  /**
   * Get default avatar component props
   * @param {object} user - User object
   * @param {string} size - Avatar size
   * @returns {object} Avatar props
   */
  getAvatarProps(user, size = 'medium') {
    const hasProfilePicture = user?.profile_picture || user?.profilePicture;
    
    if (hasProfilePicture) {
      return {
        type: 'image',
        src: this.getProfilePictureUrl(hasProfilePicture, size),
        alt: `${user.name || 'User'}'s profile picture`
      };
    }

    return {
      type: 'placeholder',
      ...this.generatePlaceholder(user?.name || 'User', size)
    };
  }

  /**
   * Handle profile picture error (fallback to placeholder)
   * @param {Event} event - Image error event
   * @param {object} user - User object
   */
  handleImageError(event, user) {
    const img = event.target;
    const placeholder = this.generatePlaceholder(user?.name || 'User');
    
    // Replace image with placeholder div
    const placeholderDiv = document.createElement('div');
    placeholderDiv.className = placeholder.className;
    placeholderDiv.textContent = placeholder.initials;
    
    img.parentNode.replaceChild(placeholderDiv, img);
  }

  /**
   * Compress image before upload (optional)
   * @param {File} file - Original image file
   * @param {number} maxWidth - Max width
   * @param {number} quality - JPEG quality (0.1-1.0)
   * @returns {Promise<File>} Compressed file
   */
  async compressImage(file, maxWidth = 800, quality = 0.8) {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob(
          (blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  }
}

export default new ProfilePictureService();