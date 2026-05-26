const BASE = 'http://localhost:5000/api';

async function get(path, params = {}) {
  const url = new URL(`${BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export const searchRestaurants = (params) => get('/restaurants', params);
export const getAutocomplete   = (q)      => get('/autocomplete', { q });
export const getFacets         = (params) => get('/facets', params);
export const getRestaurant     = (id)     => get(`/restaurant/${id}`);
