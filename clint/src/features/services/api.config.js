const isLocalDevelopment = import.meta.env.DEV
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export const API_ORIGIN = isLocalDevelopment
  ? 'http://localhost:3000'
  : 'https://tweet-n853.onrender.com';

export const API_BASE_URL = `${API_ORIGIN}/api`;
