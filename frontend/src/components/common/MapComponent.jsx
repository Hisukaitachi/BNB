// src/components/common/MapComponent.jsx - Leaflet version
import React from 'react';
import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons in Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div style="
    width: 25px; 
    height: 25px; 
    border-radius: 50%; 
    background: linear-gradient(135deg, #8b5cf6, #ec4899); 
    border: 3px solid white;
    box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <span style="color: white; font-size: 12px; font-weight: bold;">₱</span>
  </div>`,
  iconSize: [25, 25],
  iconAnchor: [12, 12]
});

L.Marker.prototype.options.icon = DefaultIcon;

const MapComponent = ({ 
  listings = [], 
  center = { lat: 10.3157, lng: 123.8854 }, // Cebu City default
  zoom = 12,
  height = '400px',
  showSingleMarker = false,
  onMarkerClick = null,
  className = ''
}) => {
  // Custom CSS for dark theme
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .leaflet-container {
        background: #374151;
        font-family: inherit;
      }
      .leaflet-popup-content-wrapper {
        background: #1f2937;
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
      }
      .leaflet-popup-tip {
        background: #1f2937;
      }
      .leaflet-control-zoom a {
        background: #374151;
        color: white;
        border: 1px solid #4b5563;
      }
      .leaflet-control-zoom a:hover {
        background: #4b5563;
      }
      .leaflet-control-attribution {
        background: rgba(31, 41, 55, 0.8);
        color: #9ca3af;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className={className} style={{ height }}>
      <MapContainer 
        center={[Number(center.lat), Number(center.lng)]} 
        zoom={zoom} 
        style={{ height: '100%', width: '100%' }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Multiple markers for listings */}
        {listings && listings.length > 0 && listings.map((listing) => (
          listing.latitude && listing.longitude && (
            <Marker 
              key={listing.id}
              position={[Number(listing.latitude), Number(listing.longitude)]}
              eventHandlers={{
                click: () => {
                  if (onMarkerClick) {
                    onMarkerClick(listing);
                  }
                }
              }}
            >
              <Popup>
                <div className="text-gray-900 max-w-xs">
                  <h4 className="font-bold mb-2">{listing.title}</h4>
                  <p className="text-sm mb-2">{listing.location}</p>
                  <p className="font-bold text-purple-600">
                    ₱{Number(listing.price_per_night).toLocaleString()}/night
                  </p>
                  {listing.average_rating && (
                    <p className="text-sm mt-1">
                      ⭐ {Number(listing.average_rating).toFixed(1)} rating
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          )
        ))}

        {/* Single marker for detail page */}
        {showSingleMarker && center.lat && center.lng && (
          <Marker position={[center.lat, center.lng]}>
            <Popup>
              <div className="text-gray-900">
                <p className="font-bold">Property Location</p>
                <p className="text-sm">
                  {Number(center.lat).toFixed(6)}, {Number(center.lng).toFixed(6)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
};

export default MapComponent;