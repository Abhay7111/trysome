import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';
import ChatPage from './features/pages/Chat.page';
import ExplorePage from './features/pages/Explore.page';
import HomePage from './features/pages/Home.page';
import ProfilePage from './features/pages/Profile.page';
import PublicProfilePage from './features/pages/PublicProfile.page';
import SettingsPage from './features/pages/Settings.page';
import SocialLayout from './features/components/SocialLayout';
import { SocialProvider } from './features/social/SocialContext';

function AppRoutes() {
  return (
    <BrowserRouter>
        <Routes>
          <Route element={<SocialProvider><SocialLayout /></SocialProvider>}>
            <Route path="/" element={<HomePage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/chats" element={<ChatPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/users/:userId" element={<PublicProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
