import { useState, useCallback, useEffect, useRef } from 'react';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import MapView from './components/MapView';
import RestaurantCard from './components/RestaurantCard';
import CodePanel from './components/CodePanel';
import { SynonymsPage, DataIndexesPage, FunctionScorePage } from './components/TabPages';
import useSearch from './hooks/useSearch';
import './index.css';

// Food → emoji mapping for the fun floating emoji
const FOOD_EMOJI = {
  pizza:'🍕', massa:'🍝', macarrão:'🍝', spaghetti:'🍝',
  sushi:'🍣', sashimi:'🍣', ramen:'🍜', noodles:'🍜', udon:'🍜', lamen:'🍜', lamem:'🍜',
  hambúrguer:'🍔', burger:'🍔', burguers:'🍔', burgers:'🍔',
  frango:'🍗', churrasco:'🥩', picanha:'🥩', carne:'🥩',
  peixe:'🐟', salmão:'🐟', camarão:'🦐', frutos:'🦞',
  café:'☕', coffee:'☕', cappuccino:'☕',
  bolo:'🎂', brigadeiro:'🍫', doce:'🍬', sobremesa:'🍮',
  vegan:'🥗', vegano:'🥗', salada:'🥗',
  tacos:'🌮', burrito:'🌮', mexicana:'🌮',
  croissant:'🥐', pão:'🥖', padaria:'🥖',
};

function getFoodEmoji(food) {
  if (!food) return null;
  const lower = food.toLowerCase();
  for (const [key, emoji] of Object.entries(FOOD_EMOJI)) {
    if (lower.includes(key)) return emoji;
  }
  return null;
}

export default function App() {
  const [activeTab, setActiveTab] = useState('Aggregation');
  const [selected, setSelected] = useState(null);
  const headerResetRef = useRef(null);
  const [resetTrigger, setResetTrigger] = useState(0);
  const [mapCenter, setMapCenter] = useState({ lat: -23.5505, lng: -46.6333 });
  const [acQuery, setAcQuery] = useState(null);
  const [sponsored, setSponsored] = useState(false);

  const {
    filters, setFilters,
    results, facets, total, page, pages,
    loading, queryDisplay, hasSearched, error,
    search, reset, doSearch,
  } = useSearch();

  // Initial load
  useEffect(() => { doSearch({}, 1); }, []); // eslint-disable-line

  const handleSearch = useCallback((newFilters) => {
    const { focusRestaurant, ...rest } = newFilters;
    const merged = { ...filters, ...rest, sponsored };
    search(merged, 1);
    // If a restaurant was selected from autocomplete, highlight it on map
    if (focusRestaurant) {
      setSelected(focusRestaurant);
    }
  }, [filters, sponsored, search]);

  const handleFilterChange = useCallback((newFilters) => {
    const merged = { ...filters, ...newFilters, sponsored };
    setFilters(merged);
    doSearch(merged, 1);
  }, [filters, sponsored, setFilters, doSearch]);

  const handleMapClick = useCallback((lat, lng) => {
    setMapCenter({ lat, lng });
    const newFilters = { ...filters, lat, lng, sponsored };
    if (newFilters.distance) {
      setFilters(newFilters);
      doSearch(newFilters, 1);
    } else {
      setFilters(newFilters);
    }
  }, [filters, sponsored, setFilters, doSearch]);

  const handleReset = useCallback(() => {
    setSelected(null);
    setSponsored(false);
    if (headerResetRef.current) headerResetRef.current();
    reset();
    setResetTrigger(t => t + 1);
  }, [reset]);

  const foodEmoji = getFoodEmoji(filters.food);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
      <Header
        onSearch={handleSearch}
        onReset={handleReset}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        headerResetRef={headerResetRef}
      />

      {/* Tab content */}
      {activeTab !== 'Aggregation' ? (
        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--body-bg)' }}>
          {activeTab === 'Synonyms' && <SynonymsPage />}
          {activeTab === 'Data & Indexes' && <DataIndexesPage />}
          {activeTab === 'Function Score' && <FunctionScorePage />}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

          {/* Sidebar */}
          <Sidebar
            facets={facets}
            filters={filters}
            onFilterChange={handleFilterChange}
            facetQuery={facets?.queryDisplay}
          />

          {/* Map */}
          <MapView
            restaurants={results}
            selected={selected}
            onSelect={setSelected}
            onMapClick={handleMapClick}
            geoCenter={filters.lat && filters.lng ? { lat: filters.lat, lng: filters.lng } : null}
            distance={filters.distance}
            geoActive={!!(filters.distance && !filters.lat && !filters.lng)}
            resetTrigger={resetTrigger}
          />

          {/* Results column */}
          <div style={{
            width: 300, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            borderLeft: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            background: 'var(--body-bg)',
            overflowY: 'auto',
          }}>
            {/* Sponsored toggle + count */}
            <div style={{
              padding: '10px 12px', background: '#fff',
              borderBottom: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {loading ? 'Searching...' : `${total.toLocaleString('pt-BR')} results`}
              </span>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                <input type="checkbox" checked={sponsored}
                  onChange={e => {
                    setSponsored(e.target.checked);
                    doSearch({ ...filters, sponsored: e.target.checked }, 1);
                  }}
                  style={{ accentColor: 'var(--mongodb-dark-green)' }}
                />
                Sponsored
              </label>
            </div>

            {/* Error banner */}
            {error && (
              <div style={{
                margin: 8, padding: '12px 14px',
                background: '#FFF3F3', border: '1px solid #FFC2C2',
                borderRadius: 8, fontSize: 13, lineHeight: 1.6,
                color: '#8B1A1A', flexShrink: 0,
              }}>
                <strong>⚠️ Erro na busca</strong>
                <div style={{ marginTop: 4 }}>{error}</div>
              </div>
            )}

            {/* Results */}
            <div style={{ padding: '8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px', borderColor: 'rgba(0,100,74,0.3)', borderTopColor: 'var(--mongodb-dark-green)' }} />
                  Searching Atlas...
                </div>
              ) : results.length === 0 && hasSearched ? (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-muted)' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>😕</div>
                  <div style={{ fontWeight: 600 }}>No results found</div>
                  <div style={{ fontSize: 13, marginTop: 4 }}>Try adjusting your filters</div>
                </div>
              ) : results.map((r, i) => (
                <div key={r._id || i} className="fade-in">
                  <RestaurantCard
                    restaurant={r}
                    food={filters.food}
                    onClick={setSelected}
                    rank={i + 1 + (page - 1) * 20}
                    sponsored={sponsored && !!r.sponsored}
                  />
                </div>
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 6, padding: '12px 8px', flexShrink: 0 }}>
                {Array.from({ length: Math.min(pages, 8) }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => doSearch(filters, p)} style={{
                    width: 32, height: 32, borderRadius: 6, border: '1px solid',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                    borderColor: p === page ? 'var(--mongodb-dark-green)' : '#ddd',
                    background: p === page ? 'var(--mongodb-dark-green)' : '#fff',
                    color: p === page ? '#fff' : '#1C2D3F',
                  }}>{p}</button>
                ))}
              </div>
            )}
          </div>

          {/* Code panel */}
          <CodePanel queryDisplay={queryDisplay} autocompleteQuery={acQuery} />
        </div>
      )}

      {/* Floating food emoji */}
      {foodEmoji && activeTab === 'Aggregation' && (
        <div style={{
          position: 'fixed', bottom: 40, left: '50%',
          transform: 'translateX(-50%)',
          fontSize: 80, pointerEvents: 'none',
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))',
          opacity: 0.85, zIndex: 10,
        }}>
          {foodEmoji}
        </div>
      )}

      {/* Disclaimer banner */}
      {activeTab === 'Aggregation' && (
        <div style={{
          background: 'var(--mongodb-dark-green)', color: '#fff',
          textAlign: 'center', padding: '8px', fontSize: 12,
          flexShrink: 0,
        }}>
          Este dataset é parcialmente mockado. Aproveite a demo, mas não use para decisões reais sobre restaurantes.
        </div>
      )}
    </div>
  );
}
