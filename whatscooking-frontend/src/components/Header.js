import { useState, useEffect, useRef } from 'react';
import { getAutocomplete } from '../api';

export default function Header({ onSearch, onReset, activeTab, setActiveTab, headerResetRef }) {
  const [q, setQ] = useState('');
  const [food, setFood] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [acQuery, setAcQuery] = useState(null);
  const [showAcModal, setShowAcModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const suppressBlur = useRef(false);
  const skipNextSearch = useRef(false);

  // Expose reset to parent via ref
  useEffect(() => {
    if (headerResetRef) {
      headerResetRef.current = () => {
        setQ('');
        setFood('');
        setSuggestions([]);
        setShowSuggestions(false);
      };
    }
  }, [headerResetRef]);

  const TABS = ['Aggregation', 'Function Score', 'Synonyms', 'Data & Indexes'];

  useEffect(() => {
    if (q.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getAutocomplete(q);
        setSuggestions(data.suggestions || []);
        setAcQuery(data.queryDisplay || null);
        setShowSuggestions(true);
      } catch(e) {}
      setLoading(false);
    }, 200);
  }, [q]);

  const handleFind = () => {
    setShowSuggestions(false);
    onSearch({ q, food });
  };

  const handleSelect = (s) => {
    suppressBlur.current = true;
    skipNextSearch.current = true;
    setShowSuggestions(false);
    setSuggestions([]);
    setQ(s.name);
    onSearch({ q: s.name, food, focusRestaurant: s });
    setTimeout(() => { suppressBlur.current = false; }, 300);
  };

  const handleShowCode = (e) => {
    e.preventDefault();
    e.stopPropagation();
    suppressBlur.current = true;
    setShowSuggestions(false);
    setShowAcModal(true);
    setTimeout(() => { suppressBlur.current = false; }, 300);
  };

  const handleBlur = () => {
    if (suppressBlur.current) return;
    setTimeout(() => {
      if (!suppressBlur.current) setShowSuggestions(false);
    }, 150);
  };

  return (
    <header>
      {/* Top nav */}
      <div style={{
        background: '#fff',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 32px', height: 52, gap: 0,
      }}>
        <img
          src="https://www.mongodb.com/assets/images/global/leaf.png"
          alt="MongoDB"
          style={{ height: 28, marginRight: 8 }}
          onError={e => { e.target.style.display='none'; }}
        />
        <span style={{ fontWeight: 800, fontSize: 16, color: '#1C2D3F', marginRight: 48 }}>
          MongoDB.
        </span>
        {TABS.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '16px 24px', fontSize: 14, fontWeight: 500,
            color: activeTab === tab ? 'var(--mongodb-dark-green)' : '#5C6C75',
            borderBottom: activeTab === tab ? '3px solid var(--mongodb-green)' : '3px solid transparent',
            fontFamily: 'Inter, sans-serif', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{tab}</button>
        ))}
      </div>

      {/* Search bar */}
      {activeTab === 'Aggregation' && (
        <div style={{
          background: 'linear-gradient(to right, #1a3a5c 0%, #2d6a9f 35%, #4a90c4 50%, #2d6a9f 65%, #1a3a5c 100%)',
          padding: '20px 32px 24px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 4 }}>
            <div onClick={onReset} style={{
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.1)', borderRadius: '50%',
              width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24,
            }} title="Voltar ao início">🍽️</div>
            <h1 style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>
              Atlas Search Demo: Restaurant Finder
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 860 }}>
            {/* Restaurant search with autocomplete */}
            <div style={{ flex: 2, position: 'relative' }}>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                onBlur={handleBlur}
                onKeyDown={e => { if (e.key === 'Enter') handleFind(); if (e.key === 'Escape') setShowSuggestions(false); }}
                placeholder="restaurants..."
                style={inputStyle}
              />

              {showSuggestions && q.trim().length >= 2 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0,
                  background: '#fff', borderRadius: 8, zIndex: 9999,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                  overflow: 'hidden', marginTop: 4,
                }}>
                  {suggestions.length > 0 ? (
                    suggestions.map((s, i) => (
                      <div
                        key={i}
                        onMouseDown={e => { e.preventDefault(); handleSelect(s); }}
                        style={{
                          padding: '10px 16px', cursor: 'pointer',
                          borderBottom: i < suggestions.length - 1 ? '1px solid #f0f0f0' : 'none',
                          fontSize: 14,
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f5f9f6'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                      >
                        <div style={{ fontWeight: 600 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: '#5C6C75' }}>{s.cuisine} · {s.borough}</div>
                      </div>
                    ))
                  ) : (
                    <div
                      onMouseDown={e => { e.preventDefault(); handleFind(); }}
                      style={{
                        padding: '12px 16px', cursor: 'pointer',
                        fontSize: 14, color: '#5C6C75',
                        display: 'flex', alignItems: 'center', gap: 8,
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f5f9f6'}
                      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                    >
                      <span style={{ fontSize: 16 }}>🔍</span>
                      <span>
                        Sem sugestões para <strong style={{ color: '#1A1A2E' }}>"{q}"</strong>. Pressione <strong>Enter</strong> ou clique em <strong>Find</strong> para tentar a busca completa.
                      </span>
                    </div>
                  )}
                  {acQuery && suggestions.length > 0 && (
                    <div
                      onMouseDown={handleShowCode}
                      style={{
                        background: '#1C2D3F', color: '#fff',
                        padding: '10px 16px', fontSize: 12,
                        fontFamily: "'Source Code Pro', monospace",
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{'</>'}</span>
                      show code for autocomplete operator...
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Food search */}
            <input
              value={food}
              onChange={e => setFood(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleFind(); }}
              placeholder="food..."
              style={{ ...inputStyle, flex: 1.2 }}
            />

            {/* Find button */}
            <button onClick={handleFind} style={{
              background: 'var(--mongodb-dark-green)', color: '#fff',
              border: 'none', borderRadius: 6, padding: '0 28px',
              fontSize: 15, fontWeight: 700, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 8,
              fontFamily: 'Inter, sans-serif', transition: 'background 0.15s', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#005436'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--mongodb-dark-green)'}
            >
              {loading ? <span className="spinner" /> : 'Find'} 🧑‍🍳
            </button>
          </div>
        </div>
      )}

      {/* Autocomplete code modal */}
      {showAcModal && acQuery && (
        <div onClick={() => setShowAcModal(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1e2d3d', borderRadius: 12, padding: 28,
            maxWidth: 500, width: '90%',
            fontFamily: "'Source Code Pro', monospace", fontSize: 14,
            color: '#C3E88D', lineHeight: 1.7,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)', position: 'relative',
          }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16, color: '#fff' }}>
              Autocomplete Operator
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(acQuery, null, 2)}
            </pre>
            <button onClick={() => setShowAcModal(false)} style={{
              position: 'absolute', top: 12, right: 12,
              background: '#ff5370', border: 'none', borderRadius: '50%',
              width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 12,
            }}>✕</button>
          </div>
        </div>
      )}
    </header>
  );
}

const inputStyle = {
  width: '100%', padding: '12px 16px',
  background: '#fff', border: '1px solid #e0e0e0',
  borderRadius: 6, fontSize: 14,
  fontFamily: 'Inter, sans-serif', outline: 'none',
};
