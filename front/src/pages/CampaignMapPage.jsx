// src/pages/CampaignMapPage.jsx
import { useNavigate, useOutletContext } from "react-router-dom";
import "../CSS/MapPage.css";

export default function CampaignMapPage() {
  const navigate = useNavigate();
  const { campaignId } = useOutletContext();

  // mapping aligné avec ta BDD
  const zones = [
    { id: "zone-rouge", label: "Zone rouge", locationId: 2, top: "15%", left: "10%", width: "22%", height: "22%" },
    { id: "le-qg", label: "Le QG", locationId: 1, top: "55%", left: "15%", width: "12%", height: "12%" },
    { id: "la-faille", label: "La Faille", locationId: 3, top: "75%", left: "13%", width: "16%", height: "12%" },

    { id: "centre-eglise", label: "Centre-ville : Église", locationId: 4, top: "75%", left: "44%", width: "10%", height: "9%" },
    { id: "centre-commissariat", label: "Centre-ville : Commissariat", locationId: 5, top: "85%", left: "44%", width: "10%", height: "9%" },
    { id: "centre-hopital", label: "Centre-ville : Hôpital", locationId: 6, top: "85%", left: "57%", width: "10%", height: "9%" },
    { id: "centre-mall", label: "Centre-ville : Centre commercial", locationId: 7, top: "75%", left: "57%", width: "10%", height: "9%" },

    { id: "foret-cramoisie", label: "Forêt cramoisie", locationId: 8, top: "65%", left: "70%", width: "20%", height: "18%" },
    { id: "enclave-silencieuse", label: "L'enclave silencieuse", locationId: 9, top: "25%", left: "65%", width: "24%", height: "18%" },
  ];

  const handleZoneClick = (zone) => {
    if (campaignId) {
      localStorage.setItem("activeCampaignId", String(campaignId));
    }

    // on garde la route existante, on ajoute juste le campaignId en query
    navigate(`/locations/${zone.locationId}/characters?campaignId=${encodeURIComponent(String(campaignId || ""))}`);
  };

  return (
    <div className="map-page">
      <h1 className="map-title">Carte d'Atlanta</h1>

      <div className="map-container">
        <img src="/images/map.png" alt="Carte d'Atlanta" className="map-image" />

        {zones.map((zone) => (
          <div
            key={zone.id}
            className="map-zone"
            style={{ top: zone.top, left: zone.left, width: zone.width, height: zone.height }}
            onClick={() => handleZoneClick(zone)}
          >
            <span className="map-zone-label">{zone.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
