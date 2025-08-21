// src/components/ListingMap.jsx

import { MapContainer, TileLayer, Marker } from "react-leaflet";

const ListingMap = ({ latitude, longitude }) => {
  if (!latitude || !longitude) return <p>No map available.</p>;

  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={14}
      style={{ height: "300px", width: "100%", marginTop: "1rem", borderRadius: "0.5rem" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[latitude, longitude]} />
    </MapContainer>
  );
};

export default ListingMap;
