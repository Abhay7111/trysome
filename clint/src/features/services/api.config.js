const isLocalDevelopment = import.meta.env.DEV
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isNetlifyProduction = import.meta.env.PROD
  && window.location.hostname === 'abhay7111-tweeter.netlify.app';

export const API_ORIGIN = isLocalDevelopment
  ? 'http://localhost:3000'
  : 'https://tweet-n853.onrender.com';

export const API_BASE_URL = isNetlifyProduction
  ? '/api'
  : `${API_ORIGIN}/api`;
