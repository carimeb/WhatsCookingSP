import { useState, useCallback, useRef } from 'react';
import { searchRestaurants, getFacets } from '../api';

const INITIAL_FILTERS = {
  q: '', food: '', cuisine: [], borough: '',
  min_stars: null, geo_mode: 'geoWithin',
  lat: null, lng: null, distance: '',
  sponsored: false,
};

// Praça da Sé — SP default center
export const SP_CENTER = { lat: -23.5505, lng: -46.6333 };

export default function useSearch() {
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [queryDisplay, setQueryDisplay] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const doSearch = useCallback(async (f, pg = 1) => {
    // Cancela a busca anterior em andamento: sem isso, uma resposta lenta
    // pode chegar DEPOIS de uma mais nova e sobrescrever o resultado correto
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const params = {
        q: f.q || '',
        food: f.food || '',
        cuisine: f.cuisine?.join(',') || '',
        borough: f.borough || '',
        min_stars: f.min_stars || '',
        geo_mode: f.geo_mode,
        lat: f.lat || '',
        lng: f.lng || '',
        distance: f.distance || '',
        sponsored: f.sponsored ? 'true' : 'false',
        highlight: 'true',
        page: pg,
        limit: 20,
      };

      const [searchData, facetsData] = await Promise.all([
        searchRestaurants(params, controller.signal),
        getFacets({
          q: f.q || '',
          food: f.food || '',
          lat: f.lat || '',
          lng: f.lng || '',
          distance: f.distance || '',
          min_stars: f.min_stars || '',
          geo_mode: f.geo_mode,
        }, controller.signal),
      ]);

      setResults(searchData.results || []);
      setTotal(searchData.total || 0);
      setPages(searchData.pages || 1);
      setPage(pg);
      setQueryDisplay(searchData.queryDisplay || null);
      setFacets(facetsData);
      setHasSearched(true);
    } catch (e) {
      // Abort não é erro: significa que uma busca mais nova assumiu.
      // A nova busca cuida do loading, então saímos sem mexer em nada.
      if (e.name === 'AbortError') return;
      console.error('search error', e);
      setError(
        'Não foi possível conectar ao backend. Verifique se ele está rodando ' +
        '(porta 5000) e se o cluster Atlas está ativo. Clusters pausam após ' +
        'períodos de inatividade e precisam ser retomados no Atlas UI.'
      );
    }
    setLoading(false);
  }, []);

  const search = useCallback((newFilters, pg = 1) => {
    const merged = { ...filters, ...newFilters };
    setFilters(merged);
    doSearch(merged, pg);
  }, [filters, doSearch]);

  const reset = useCallback(() => {
    setFilters({ ...INITIAL_FILTERS });
    setResults([]);
    setTotal(0);
    setQueryDisplay(null);
    setHasSearched(false);
    setError(null);
    // Keep facets visible but reload them without filters
    getFacets({}).then(setFacets).catch(() => {});
  }, []);

  return {
    filters, setFilters,
    results, facets, total, page, pages,
    loading, queryDisplay, hasSearched, error,
    search, reset,
    doSearch,
  };
}
