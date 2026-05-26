import { useState } from 'react';

function JsonModal({ title, data, onClose }) {
  const json = JSON.stringify(data, null, 2);
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1e2d3d', borderRadius: 12, padding: 28,
        maxWidth: 600, width: '90%', maxHeight: '80vh', overflow: 'auto',
        fontFamily: "'Source Code Pro', monospace", fontSize: 12,
        color: '#C3E88D', lineHeight: 1.7,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        position: 'relative',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#fff' }}>{title}</div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{json}</pre>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12,
          background: '#ff5370', border: 'none', borderRadius: '50%',
          width: 24, height: 24, color: '#fff', cursor: 'pointer',
          fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>
    </div>
  );
}

const PRICE_LABELS = { 1: '$', 2: '$$', 3: '$$$', 4: '$$$$' };

// Map star clicks to sensible thresholds
// Half of star N = N - 0.7, Full star N = N - 0.2
// So 5 full = 4.8, 4.5 = 4.3, 4 full = 3.8 etc — always returns results
function getThreshold(n, isHalf) {
  if (isHalf) return Math.max(0.5, n - 0.7);
  return Math.max(1, n - 0.2);
}

function HalfStar({ n, value, onChange }) {
  const full = getThreshold(n, false);
  const half = getThreshold(n, true);
  const isFull = value !== null && value !== undefined && value >= full;
  const isHalf = value !== null && value !== undefined && value >= half && value < full;
  const SIZE = 28;
  const handleLeft  = () => onChange(value === half ? null : half);
  const handleRight = () => onChange(value === full ? null : full);
  const leftColor  = isFull || isHalf ? '#FFD700' : '#ccc';
  const rightColor = isFull ? '#FFD700' : '#ccc';

  return (
    <svg width={SIZE} height={SIZE} viewBox="0 0 24 24" style={{ cursor: 'pointer', flexShrink: 0 }}>
      <defs>
        <linearGradient id={`g${n}`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="50%" stopColor={leftColor} />
          <stop offset="50%" stopColor={rightColor} />
        </linearGradient>
      </defs>
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        fill={`url(#g${n})`}
        stroke="#e0e0e0"
        strokeWidth="0.5"
      />
      <rect x="0" y="0" width="12" height="24" fill="transparent" onClick={handleLeft} />
      <rect x="12" y="0" width="12" height="24" fill="transparent" onClick={handleRight} />
    </svg>
  );
}

function Stars({ value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
      {[1,2,3,4,5].map(n => (
        <HalfStar key={n} n={n} value={value} onChange={onChange} />
      ))}
      {value !== null && value !== undefined && (
        <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 4 }}>{value}+</span>
      )}
    </div>
  );
}

export default function Sidebar({ facets, filters, onFilterChange, geoCode, setGeoCode, facetQuery }) {
  const [showFacetModal, setShowFacetModal] = useState(false);
  const [geoTooltip, setGeoTooltip] = useState(null);
  const cuisines = facets?.facet?.cuisineFacet?.buckets || [];
  const facetBoroughs = facets?.facet?.boroughFacet?.buckets || [];
  const total = facets?.count?.lowerBound;

  // Always show selected borough even if it disappears from facet results
  const selectedBorough = filters.borough || '';
  const boroughs = selectedBorough && !facetBoroughs.find(b => b._id === selectedBorough)
    ? [{ _id: selectedBorough, count: '?' }, ...facetBoroughs]
    : facetBoroughs;

  const toggleCuisine = (c) => {
    const current = filters.cuisine || [];
    const next = current.includes(c)
      ? current.filter(x => x !== c)
      : [...current, c];
    onFilterChange({ cuisine: next });
  };

  return (
    <aside style={{
      width: 200, flexShrink: 0,
      background: '#fff',
      borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      overflowY: 'auto',
      padding: '16px 0',
      position: 'relative',
      zIndex: 200,
    }}>

      {/* Geospatial options */}
      <div style={{ padding: '0 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10, color: 'var(--text)' }}>
          Geospatial Search Options
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {[
            {
              mode: 'near',
              title: 'near',
              description: 'Boost results por proximidade. Restaurantes mais próximos ao ponto selecionado recebem score maior, mas todos os resultados aparecem.',
              steps: ['1. Digite a distância (pivot em km)', '2. Clique no mapa para definir o centro'],
            },
            {
              mode: 'geoWithin',
              title: 'geoWithin',
              description: 'Filtra resultados dentro de um raio fixo. Apenas restaurantes dentro do círculo aparecem.',
              steps: ['1. Digite o raio em km', '2. Clique no mapa para definir o centro'],
            },
          ].map(({ mode, title, description, steps }) => (
            <div key={mode} style={{ flex: 1, position: 'relative' }}>
              <button
                onClick={() => {
                  onFilterChange({ geo_mode: mode });
                  setGeoTooltip(geoTooltip === mode ? null : mode);
                }}
                style={{
                  width: '100%', padding: '6px 0', borderRadius: 4,
                  border: '1px solid #ddd', cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif', fontSize: 13, fontWeight: 600,
                  background: filters.geo_mode === mode ? '#1C2D3F' : '#fff',
                  color: filters.geo_mode === mode ? '#fff' : '#1C2D3F',
                  transition: 'all 0.15s',
                }}
              >{title}</button>

              {geoTooltip === mode && geoTooltip !== null && (
                <div
                  onClick={() => setGeoTooltip(null)}
                  style={{
                    position: 'fixed', inset: 0,
                    zIndex: 99999, pointerEvents: 'all',
                  }}
                >
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      position: 'fixed', top: 200, left: 210,
                      width: 240,
                      background: '#1C2D3F', color: '#fff', borderRadius: 8,
                      padding: '14px', fontSize: 12, lineHeight: 1.6,
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div style={{ fontWeight: 700, marginBottom: 6, color: '#00ED64' }}>
                      {title}
                    </div>
                    <div style={{ marginBottom: 8, color: '#ccc' }}>{description}</div>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 8 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, color: '#FFD700' }}>Como usar:</div>
                      {steps.map((s, i) => (
                        <div key={i} style={{ color: '#aaa' }}>{s}</div>
                      ))}
                    </div>
                    <button
                      onClick={() => setGeoTooltip(null)}
                      style={{
                        marginTop: 8, background: 'none', border: '1px solid rgba(255,255,255,0.2)',
                        color: '#fff', borderRadius: 4, padding: '3px 8px',
                        cursor: 'pointer', fontSize: 11, fontFamily: 'Inter, sans-serif',
                      }}
                    >Fechar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Distance:</div>
        <input
          value={filters.distance || ''}
          onChange={e => onFilterChange({ distance: e.target.value })}
          placeholder="e.g. 1"
          style={{
            width: '100%', padding: '6px 10px', borderRadius: 4,
            border: '1px solid #ddd', fontSize: 13,
            fontFamily: 'Inter, sans-serif',
          }}
        />

        {/* Geo query code box */}
        {filters.distance && filters.lat && (
          <div style={{
            marginTop: 10, background: '#1C2D3F', borderRadius: 6,
            padding: '10px 12px', fontSize: 11,
            fontFamily: "'Source Code Pro', monospace",
            color: '#C3E88D', lineHeight: 1.6,
          }}>
            <div style={{ color: '#fff' }}>{'"geoWithin": {'}</div>
            <div style={{ paddingLeft: 12 }}>{`"circle": {`}</div>
            <div style={{ paddingLeft: 24 }}>{`"center": {`}</div>
            <div style={{ paddingLeft: 36, color: '#F78C6C' }}>{`"type": "Point",`}</div>
            <div style={{ paddingLeft: 36, color: '#F78C6C' }}>{`"coordinates": [`}</div>
            <div style={{ paddingLeft: 48, color: '#FF5370' }}>{parseFloat(filters.lng||0).toFixed(5)},</div>
            <div style={{ paddingLeft: 48, color: '#FF5370' }}>{parseFloat(filters.lat||0).toFixed(5)}</div>
            <div style={{ paddingLeft: 36, color: '#F78C6C' }}>{`]`}</div>
            <div style={{ paddingLeft: 24 }}>{`}`}</div>
            <div style={{ paddingLeft: 12 }}>{`},`}</div>
            <div style={{ paddingLeft: 12, color: '#FF5370' }}>{`"radius": ${Math.round(parseFloat(filters.distance||1)*1609)}`}</div>
            <div style={{ paddingLeft: 12 }}>{`}`}</div>
          </div>
        )}
      </div>

      {/* Stars */}
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 10 }}>Average Star Rating:</div>
        <Stars value={filters.min_stars} onChange={v => onFilterChange({ min_stars: v })} />

        {/* Stars range code */}
        {filters.min_stars && (
          <div style={{
            marginTop: 10, background: '#1C2D3F', borderRadius: 6,
            padding: '10px 12px', fontSize: 11,
            fontFamily: "'Source Code Pro', monospace",
            color: '#C3E88D', lineHeight: 1.6,
          }}>
            <div style={{ color: '#fff' }}>{'"range": {'}</div>
            <div style={{ paddingLeft: 12, color: '#FF5370' }}>{`"gte": ${filters.min_stars},`}</div>
            <div style={{ paddingLeft: 12, color: '#F78C6C' }}>{`"path": "stars"`}</div>
            <div style={{ color: '#fff' }}>{'}'}</div>
          </div>
        )}
      </div>

      {/* Overall count */}
      {total !== undefined && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ color: 'var(--mongodb-dark-green)', fontWeight: 700, fontSize: 13 }}>
            Overall Count: {total?.toLocaleString('pt-BR')}
          </span>
        </div>
      )}

      {/* Cuisine facets */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        {cuisines.map(c => (
          <label key={c._id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 0', cursor: 'pointer', fontSize: 13,
          }}>
            <input type="checkbox"
              checked={(filters.cuisine || []).includes(c._id)}
              onChange={() => toggleCuisine(c._id)}
              style={{ accentColor: 'var(--mongodb-dark-green)', width: 14, height: 14 }}
            />
            <span style={{ flex: 1 }}>{c._id}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({c.count})</span>
          </label>
        ))}

        {/* Cuisine code */}
        {(filters.cuisine || []).length > 0 && (
          <div style={{
            marginTop: 10, background: '#1C2D3F', borderRadius: 6,
            padding: '10px 12px', fontSize: 11,
            fontFamily: "'Source Code Pro', monospace",
            color: '#C3E88D', lineHeight: 1.6,
          }}>
            <div style={{ color: '#fff' }}>{'"text": {'}</div>
            <div style={{ paddingLeft: 12, color: '#F78C6C' }}>{`"query": [`}</div>
            {(filters.cuisine || []).map((c, i) => (
              <div key={i} style={{ paddingLeft: 24, color: '#FF5370' }}>{`"${c}"${i < filters.cuisine.length-1 ? ',' : ''}`}</div>
            ))}
            <div style={{ paddingLeft: 12, color: '#F78C6C' }}>{`],`}</div>
            <div style={{ paddingLeft: 12, color: '#F78C6C' }}>{`"path": "cuisine"`}</div>
            <div style={{ color: '#fff' }}>{'}'}</div>
          </div>
        )}
      </div>

      {/* Borough facets */}
      <div style={{ padding: '12px 16px' }}>
        {boroughs.slice(0, 15).map(b => (
          <label key={b._id} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '4px 0', cursor: 'pointer', fontSize: 13,
          }}>
            <input type="radio"
              name="borough"
              checked={filters.borough === b._id}
              onChange={() => onFilterChange({ borough: filters.borough === b._id ? '' : b._id })}
              style={{ accentColor: 'var(--mongodb-dark-green)', width: 14, height: 14 }}
            />
            <span style={{ flex: 1 }}>{b._id}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>({b.count})</span>
          </label>
        ))}
        {boroughs.length > 15 && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', cursor: 'pointer', fontSize: 13 }}>
            <input type="radio" name="borough"
              checked={filters.borough === ''}
              onChange={() => onFilterChange({ borough: '' })}
              style={{ accentColor: 'var(--mongodb-dark-green)' }}
            />
            <span>All</span>
          </label>
        )}
      </div>

      {/* Facet code button */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
        <button onClick={() => setShowFacetModal(true)} style={{
          background: 'var(--mongodb-dark-green)', color: '#fff',
          border: 'none', borderRadius: 6, padding: '8px 12px',
          fontSize: 12, cursor: 'pointer', width: '100%',
          fontFamily: 'Inter, sans-serif', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
        }}>
          <span>⚗️</span> facet {'</>'}
        </button>
      </div>

      {showFacetModal && facetQuery && (
        <JsonModal
          title="Facet Code"
          data={facetQuery}
          onClose={() => setShowFacetModal(false)}
        />
      )}
    </aside>
  );
}
