// src/pages/profile/ProfilePage.jsx - Refactored and cleaner
import { useState, useEffect } from 'react';
import { User, Star } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import reviewService from '../../services/reviewService';
import ProfileTab from '../../components/profile/ProfileTab';
import ReviewsTab from '../../components/profile/ReviewsTab';
import ProfileSidebar from '../../components/profile/ProfileSidebar';

const ProfilePage = () => {
  const { user, updateProfile, switchRole } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [reviewsData, setReviewsData] = useState({
    written: [],
    received: [],
    statistics: {}
  });
  const [reviewsLoading, setReviewsLoading] = useState(false);

  // Load reviews when component mounts or user changes
  useEffect(() => {
    if (user && (activeTab === 'reviews' || activeTab === 'profile')) {
      loadReviews();
    }
  }, [user, activeTab]);

  const loadReviews = async () => {
    try {
      setReviewsLoading(true);
      const reviews = await reviewService.getMyReviews('all');
      setReviewsData(reviews);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 pt-20">
        <div className="container mx-auto px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-white">Please log in to view your profile</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pt-20">
      <div className="container mx-auto px-4 sm:px-6 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-4">My Profile</h1>
            
            {/* Tab Navigation */}
            <div className="border-b border-gray-700">
              <div className="flex space-x-8 overflow-x-auto">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'reviews', label: 'Reviews', icon: Star }
                ].map(tab => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-purple-500 text-purple-400'
                          : 'border-transparent text-gray-400 hover:text-white hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{tab.label}</span>
                      {tab.id === 'reviews' && reviewsData.received?.length > 0 && (
                        <span className="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">
                          {reviewsData.received.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-3">
              {activeTab === 'profile' && (
                <ProfileTab
                  user={user}
                  updateProfile={updateProfile}
                />
              )}
              
              {activeTab === 'reviews' && (
                <ReviewsTab
                  reviewsData={reviewsData}
                  reviewsLoading={reviewsLoading}
                  loadReviews={loadReviews}
                  user={user}
                />
              )}
            </div>

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <ProfileSidebar
                user={user}
                reviewsData={reviewsData}
                switchRole={switchRole}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;