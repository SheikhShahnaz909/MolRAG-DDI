
// Backend addresses
// Authentication runs on the same Render service as the frontend.
export const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? "";

// Python prediction API will be connected through the same public URL later.
export const API_URL = import.meta.env.VITE_API_URL ?? "/api";
