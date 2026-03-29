// EXACT code that MUST be used
const PRODUCTION_BACKEND_URL = 'https://loveconnect-backend-dvou.onrender.com';
const DEVELOPMENT_BACKEND_URL = 'http://localhost:3001';

export const BACKEND_URL = import.meta.env.DEV
  ? DEVELOPMENT_BACKEND_URL
  : PRODUCTION_BACKEND_URL;
