// src/pages/MapPage.jsx
import { useNavigate } from "react-router-dom";
import "../CSS/MapPage.css";

function MapPage() {
  const navigate = useNavigate();

  const zones = [
    {
      id: "zone-rouge",
      label: "Zone rouge",
      locationId: 1,
      top: "15%",
      left: "10%",
      width: "22%",
      height: "22%",
    },
    {
      id: "le-qg",
      label: "Le QG",
      locationId: 2,
      top: "55%",
      left: "15%",
      width: "12%",
      height: "12%",
    },
    {
      id: "la-faille",
      label: "La Faille",
      locationId: 3,
      top: "75%",
      left: "13%",
      width: "16%",
      height: "12%",
    },
    {
      id: "centre-ville",
      label: "Centre-ville",
      locationId: 4,
      top: "65%",
      left: "42%",
      width: "22%",
      height: "18%",
    },
    {
      id: "enclave-silencieuse",
      label: "L'enclave silencieuse",
      locationId: 5,
      top: "25%",
      left: "65%",
      width: "24%",
      height: "18%",
    },
    {
      id: "foret-cramoisie",
      label: "Forêt cramoisie",
      locationId: 6,
      top: "65%",
      left: "70%",
      width: "20%",
      height: "18%",
    },
  ];

  const handleZoneClick = (zone) => {
    navigate(`/locations/${zone.locationId}/characters`);
  };

  return (
    <div className="map-page">
      <h1 className="map-title">Carte d'Atlanta</h1>

      <div className="map-container">
        <img
          src="/images/map.png"   // <= ton vrai fichier
          alt="Carte d'Atlanta"
          className="map-image"
        />

        {zones.map((zone) => (
          <div
            key={zone.id}
            className="map-zone"
            style={{
              top: zone.top,
              left: zone.left,
              width: zone.width,
              height: zone.height,
            }}
            onClick={() => handleZoneClick(zone)}
          >
            <span className="map-zone-label">{zone.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default MapPage;
