// src/components/listings/ImageGallery.jsx
import React, { useState } from 'react';
import { getImageUrl } from '../../services/api';
import { Home, Play, ChevronLeft, ChevronRight, X } from 'lucide-react';

const ImageGallery = ({ images, video, title }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);

  // ✅ FIXED: Parse images from JSON string or use fallback
  const imageUrls = (() => {
    if (images && Array.isArray(images)) {
      return images.map(img => getImageUrl(img)); // ✅ Use helper
    } else if (images && typeof images === 'string') {
      try {
        const parsed = JSON.parse(images);
        return Array.isArray(parsed) ? parsed.map(img => getImageUrl(img)) : []; // ✅ Use helper
      } catch (e) {
        return [];
      }
    }
    return [];
  })();

  // Combine images and video for gallery
  const mediaItems = [
    ...imageUrls.map((url, index) => ({ type: 'image', url, id: `img-${index}` })),
    ...(video ? [{ type: 'video', url: getImageUrl(video), id: 'video' }] : [])
  ];

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + mediaItems.length) % mediaItems.length);
  };

  if (mediaItems.length === 0) {
    return (
      <div className="w-full h-96 bg-gray-700 rounded-xl flex items-center justify-center">
        <div className="text-center text-gray-400">
          <Home className="w-16 h-16 mx-auto mb-4" />
          <p>No images available</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main Gallery */}
      <div className="relative mb-4">
        {/* Main Image/Video Display */}
        <div className="relative h-96 rounded-xl overflow-hidden">
          {mediaItems[currentIndex]?.type === 'video' ? (
            <div className="relative w-full h-full">
              <video
                src={mediaItems[currentIndex].url}
                className="w-full h-full object-cover"
                controls
              />
              <div className="absolute top-3 left-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                Video Tour
              </div>
            </div>
          ) : (
            <img
              src={mediaItems[currentIndex]?.url}
              alt={`${title} - Image ${currentIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => setShowLightbox(true)}
            />
          )}

          {/* Navigation Arrows */}
          {mediaItems.length > 1 && (
            <>
              <button
                onClick={prevImage}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextImage}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Image Counter */}
          <div className="absolute bottom-3 right-3 bg-black/70 text-white text-sm px-3 py-1 rounded">
            {currentIndex + 1} / {mediaItems.length}
          </div>

          {/* View All Photos Button */}
          {mediaItems.length > 1 && (
            <button
              onClick={() => setShowLightbox(true)}
              className="absolute bottom-3 left-3 bg-black/70 text-white text-sm px-3 py-1 rounded hover:bg-black/90 transition"
            >
              View all photos
            </button>
          )}
        </div>

        {/* Thumbnail Strip */}
        {mediaItems.length > 1 && (
          <div className="flex space-x-2 mt-3 overflow-x-auto">
            {mediaItems.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(index)}
                className={`flex-shrink-0 w-20 h-16 rounded-lg overflow-hidden ${
                  index === currentIndex ? 'ring-2 ring-purple-500' : 'opacity-70 hover:opacity-100'
                }`}
              >
                {item.type === 'video' ? (
                  <div className="relative w-full h-full bg-gray-700 flex items-center justify-center">
                    <Play className="w-6 h-6 text-white" />
                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs px-1 py-0.5 text-center">
                      Video
                    </div>
                  </div>
                ) : (
                  <img
                    src={item.url}
                    alt={`Thumbnail ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
          <div className="relative max-w-6xl max-h-full p-4">
            <button
              onClick={() => setShowLightbox(false)}
              className="absolute top-6 right-6 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 z-10"
            >
              <X className="w-6 h-6" />
            </button>

            {mediaItems[currentIndex]?.type === 'video' ? (
              <video
                src={mediaItems[currentIndex].url}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
              />
            ) : (
              <img
                src={mediaItems[currentIndex]?.url}
                alt={`${title} - Image ${currentIndex + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            )}

            {mediaItems.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-6 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-6 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-4 py-2 rounded">
              {currentIndex + 1} / {mediaItems.length}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageGallery;