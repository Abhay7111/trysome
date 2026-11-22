import { useEffect, useState } from 'react';
import { BrowserRouter, Link, Routes, Route } from 'react-router';
import { getMe } from './features/auth/services/auth.api';
import Login from './features/auth/pages/Login';
import Register from './features/auth/pages/Register';

function Home() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getMe()
      .then(setProfile)
      .catch((requestError) => {
        setError(
          requestError.response?.data?.error ??
            requestError.response?.data?.message ??
            requestError.message
        );
      });
  }, []);

  if (error) {
    return (
      <main>
        <p>{error}</p>
        <Link to="/login">Log in</Link>
      </main>
    );
  }

  if (!profile) {
    return <p>Loading profile...</p>;
  }

  return (
    <main>
      <h1>Welcome, {profile.username}</h1>
      <p>{profile.email}</p>
    </main>
  );
}

function AppRoutes() {
  return (
    <BrowserRouter>
        <Routes>
            <Route path='/' element={<Home />} />
            <Route path='/login' element={<Login/>} />
            <Route path='/register' element={<Register/>} />
        </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
