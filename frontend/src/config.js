// Backend addresses in one place. Override them in a .env file (see .env.example)
// when you deploy; the defaults match your local setup.
export const API_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000"; // prediction / drug data server
export const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? "http://localhost:5000"; // login / OTP server