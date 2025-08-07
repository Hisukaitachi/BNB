// src/components/MapPicker.jsx

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";

const LocationMarker = ({ position, setPosition, onSelect }) => {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      onSelect(e.latlng);
    },
  });

  return position ? <Marker position={position} /> : null;
};

const MapPicker = ({ onLocationSelect, initialPosition }) => {
  const [position, setPosition] = useState(initialPosition || null);

  useEffect(() => {
    if (initialPosition) {
      setPosition(initialPosition);
    }
  }, [initialPosition]);

  return (
    <MapContainer
      center={position || [14.5995, 120.9842]} // center at selected or default
      zoom={position ? 14 : 12}
      style={{
        height: "300px",
        width: "100%",
        marginTop: "1rem",
        borderRadius: "0.5rem",
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <LocationMarker
        position={position}
        setPosition={setPosition}
        onSelect={onLocationSelect}
      />
    </MapContainer>
  );
};

export default MapPicker;
