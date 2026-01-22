// src/App.jsx
import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import NotificationBox from "./components/NotificationBox.jsx";
import CharactersPage from "./pages/CharactersPage.jsx";
import CharacterDetailPage from "./pages/CharacterDetailPage.jsx";
import TransitionVideo from "./pages/TransitionVideo.jsx";
import TrashPanel from "./components/TrashPanel.jsx";
import LocationCharactersPage from "./pages/LocationCharactersPage.jsx";
import CharacterEditPage from "./pages/CharacterEditPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CreateCampaignPage from "./pages/CreateCampaignPage.jsx";
import CampaignPage from "./pages/CampaignPage.jsx";
import CampaignWallPage from "./pages/CampaignWallPage.jsx";
import CampaignCharactersPage from "./pages/CampaignCharactersPage.jsx";
import CampaignMapPage from "./pages/CampaignMapPage.jsx";
import CampaignEditorPage from "./pages/CampaignEditorPage.jsx";

function App() {
  const [trashOpen, setTrashOpen] = useState(false);

  return (
    <div className="app">
      <Header />

      <NotificationBox />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/:id" element={<CharacterDetailPage />} />
        <Route path="/transition-video/:id" element={<TransitionVideo />} />
        <Route path="/locations/:locationId/characters" element={<LocationCharactersPage />} />
        <Route path="/characters/:id/edit" element={<CharacterEditPage />} />

        <Route path="/campaigns/create" element={<CreateCampaignPage />} />

        <Route
          path="/campaigns/:id"
          element={<CampaignPage onOpenTrash={() => setTrashOpen(true)} />}
        >
          <Route index element={<Navigate to="wall" replace />} />
          <Route path="wall" element={<CampaignWallPage />} />
          <Route path="characters" element={<CampaignCharactersPage />} />
          <Route path="map" element={<CampaignMapPage />} />
          <Route path="editor" element={<CampaignEditorPage />} />
        </Route>
      </Routes>

      <TrashPanel />

      <Footer />
    </div>
  );
}

export default App;
