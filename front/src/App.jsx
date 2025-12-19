// src/App.jsx
import { Routes, Route } from "react-router-dom";

import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import HomePage from "./pages/HomePage.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import RegisterPage from "./pages/RegisterPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.jsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.jsx";
import NotificationBox from "./components/NotificationBox.jsx";
import TestApiPage from "./pages/TestApiPage.jsx";
import CharactersPage from "./pages/CharactersPage.jsx";
import CharacterDetailPage from "./pages/CharacterDetailPage.jsx";
function App() {
  return (
    <div className="app">
      <Header />

      {/* Boîte de notifications globale, visible sur toutes les pages */}
      <NotificationBox />

      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/test-api" element={<TestApiPage />} />
        <Route path="/characters" element={<CharactersPage />} />
        <Route path="/characters/:id" element={<CharacterDetailPage />} />
      </Routes>

      <Footer />
    </div>
  );
}

export default App;
