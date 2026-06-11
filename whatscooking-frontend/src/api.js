// Configurável via .env do frontend (REACT_APP_API_URL=https://meu-backend/api)
// Default: backend local na porta 5000
const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

async function get(path, params = {}, signal) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString(), { signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const searchRestaurants = (params, signal) => get('/restaurants', params, signal);
export const getAutocomplete   = (q, signal)      => get('/autocomplete', { q }, signal);
export const getFacets         = (params, signal) => get('/facets', params, signal);
export const getRestaurant     = (id)             => get(`/restaurant/${id}`);
