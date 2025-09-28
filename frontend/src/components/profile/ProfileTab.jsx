// src/components/profile/ProfileTab.jsx - Complete version with Profile Picture
import { useState, useEffect } from 'react';
import { Edit, Save, X } from 'lucide-react';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { Textarea } from '../ui/Input';
import SecuritySection from './SecuritySection';
import ProfilePictureUpload from './ProfilePictureUpload';

const ProfileTab = ({ user, updateProfile }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(user); // Local user state for updates
  const [profileData, setProfileData] = useState({
    name: '',
    phone: '',
    bio: '',
    location: ''
  });
  const [errors, setErrors] = useState({});

  // Update profile data when user changes
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      setProfileData({
        name: user.name || '',
        phone: user.phone || '',
        bio: user.bio || '',
        location: user.location || ''
      });
    }
  }, [user]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateProfile = () => {
    const newErrors = {};
    
    if (!profileData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (profileData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (profileData.bio && profileData.bio.length > 500) {
      newErrors.bio = 'Bio cannot exceed 500 characters';
    }
    
    return newErrors;
  };

  const handleSaveProfile = async () => {
    const formErrors = validateProfile();
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }

    setIsLoading(true);
    try {
      await updateProfile(profileData);
      setIsEditing(false);
      setErrors({});
    } catch (error) {
      setErrors({ submit: error.message || 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setProfileData({
      name: currentUser.name || '',
      phone: currentUser.phone || '',
      bio: currentUser.bio || '',
      location: currentUser.location || ''
    });
    setErrors({});
  };

  // Handle profile picture update
  const handleProfilePictureUpdate = (updatedUser) => {
    setCurrentUser(updatedUser);
    // Force parent component to refresh user data
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      {/* Profile Picture Section */}
      <ProfilePictureUpload 
        user={currentUser} 
        onUpdateSuccess={handleProfilePictureUpdate}
      />

      {/* Profile Information */}
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
          <h2 className="text-xl font-semibold text-white">Profile Information</h2>
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              size="sm"
              className="border-purple-500 text-purple-400 w-full sm:w-auto"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
              <Button
                onClick={handleSaveProfile}
                loading={isLoading}
                variant="gradient"
                size="sm"
                className="w-full sm:w-auto"
              >
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button
                onClick={cancelEdit}
                variant="ghost"
                size="sm"
                className="text-gray-300 w-full sm:w-auto"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          )}
        </div>

        {errors.submit && (
          <div className="mb-4 bg-red-900/20 border border-red-500 text-red-400 rounded-lg p-3 text-sm">
            {errors.submit}
          </div>
        )}

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Full Name</label>
              {isEditing ? (
                <Input
                  name="name"
                  value={profileData.name}
                  onChange={handleProfileChange}
                  error={errors.name}
                  className="bg-white/10 border-gray-600 text-white"
                />
              ) : (
                <p className="text-white bg-gray-700 px-4 py-3 rounded-lg">{currentUser.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Email</label>
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
                <p className="flex-1 text-white bg-gray-700 px-4 py-3 rounded-lg text-sm break-all">{currentUser.email}</p>
                {currentUser.isVerified ? (
                  <span className="text-green-400 text-sm whitespace-nowrap">✓ Verified</span>
                ) : (
                  <span className="text-yellow-400 text-sm whitespace-nowrap">⚠ Unverified</span>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-gray-300 mb-2">Phone</label>
              {isEditing ? (
                <Input
                  name="phone"
                  type="tel"
                  value={profileData.phone}
                  onChange={handleProfileChange}
                  placeholder="Enter phone number"
                  className="bg-white/10 border-gray-600 text-white"
                />
              ) : (
                <p className="text-white bg-gray-700 px-4 py-3 rounded-lg">
                  {currentUser.phone || 'Not provided'}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">Location</label>
              {isEditing ? (
                <Input
                  name="location"
                  value={profileData.location}
                  onChange={handleProfileChange}
                  placeholder="Enter your location"
                  className="bg-white/10 border-gray-600 text-white"
                />
              ) : (
                <p className="text-white bg-gray-700 px-4 py-3 rounded-lg">
                  {currentUser.location || 'Not provided'}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-300 mb-2">Bio</label>
            {isEditing ? (
              <Textarea
                name="bio"
                value={profileData.bio}
                onChange={handleProfileChange}
                error={errors.bio}
                placeholder="Tell us about yourself..."
                rows={4}
                className="bg-white/10 border-gray-600 text-white"
              />
            ) : (
              <p className="text-white bg-gray-700 px-4 py-3 rounded-lg min-h-24">
                {currentUser.bio || 'No bio provided'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Security Section */}
      <SecuritySection />
    </div>
  );
};

export default ProfileTab;