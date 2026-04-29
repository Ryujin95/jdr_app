// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import NotificationBox from "./components/NotificationBox.jsx";
import CharacterDetailPage from "./pages/CharacterDetailPage.jsx";
import TransitionVideo from "./pages/TransitionVideo.jsx";
import LocationCharactersPage from "./pages/LocationCharactersPage.jsx";
import CharacterEditPage from "./pages/CharacterEditPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";
import CreateCampaignPage from "./pages/CreateCampaignPage.jsx";
import CampaignPage from "./pages/CampaignPage.jsx";
import CampaignWallPage from "./pages/CampaignWallPage.jsx";
import CampaignCharactersPage from "./pages/characters/CampaignCharactersPage.jsx";
import CampaignMapPage from "./pages/map/CampaignMapPage.jsx";
import CampaignEditorPage from "./pages/CampaignEditorPage.jsx";
import CampaignCreateMapPage from "./pages/CampaignCreateMapPage.jsx";
import FriendProfilePage from "./pages/FriendProfilePage.jsx";

function App() {
  return (
    <Layout>
      <NotificationBox />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/characters/:id" element={<CharacterDetailPage />} />
        <Route path="/transition-video/:id" element={<TransitionVideo />} />
        <Route path="/locations/:locationId/characters" element={<LocationCharactersPage />} />
        <Route path="/characters/:id/edit" element={<CharacterEditPage />} />
        <Route path="/campaigns/create" element={<CreateCampaignPage />} />
        <Route path="/friends/:userId" element={<FriendProfilePage />} />
        <Route path="/campaigns/:id" element={<CampaignPage />}>
          <Route index element={<Navigate to="wall" replace />} />
          <Route path="wall" element={<CampaignWallPage />} />
          <Route path="characters" element={<CampaignCharactersPage />} />
          <Route path="map" element={<CampaignMapPage />} />
          <Route path="editor" element={<CampaignEditorPage />} />
          <Route path="createMap" element={<CampaignCreateMapPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;