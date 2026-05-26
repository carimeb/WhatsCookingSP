import { useState } from 'react';

function JsonModal({ title, data, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      zIndex: 99999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#1e2d3d', borderRadius: 12, padding: 28,
        maxWidth: 560, width: '90%', maxHeight: '80vh', overflow: 'auto',
        fontFamily: "'Source Code Pro', monospace", fontSize: 13,
        color: '#C3E88D', lineHeight: 1.7,
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)', position: 'relative',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: '#fff' }}>{title}</div>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {JSON.stringify(data, null, 2)}
        </pre>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12,
          background: '#ff5370', border: 'none', borderRadius: '50%',
          width: 24, height: 24, color: '#fff', cursor: 'pointer', fontSize: 12,
        }}>✕</button>
      </div>
    </div>
  );
}

// Simple syntax colorizer for JSON strings
function ColorizedJson({ data }) {
  if (!data) return null;

  const json = JSON.stringify(data, null, 2);

  // Colorize line by line
  const lines = json.split('\n').map((line, i) => {
    // Keys
    let parts = [];
    let remaining = line;

    // Match key: value patterns
    const keyMatch = remaining.match(/^(\s*)("[\w\s$<>./]+")(\s*:\s*)(.*)/);
    if (keyMatch) {
      const [, indent, key, colon, rest] = keyMatch;
      parts.push(<span key="indent">{indent}</span>);
      parts.push(<span key="key" style={{ color: '#C3E88D' }}>{key}</span>);
      parts.push(<span key="colon">{colon}</span>);
      // Value
      if (rest.startsWith('"')) {
        parts.push(<span key="val" style={{ color: '#F78C6C' }}>{rest}</span>);
      } else if (/^-?\d/.test(rest) || rest === 'true' || rest === 'false') {
        parts.push(<span key="val" style={{ color: '#FF5370' }}>{rest}</span>);
      } else {
        parts.push(<span key="val">{rest}</span>);
      }
    } else if (line.trim().startsWith('//')) {
      parts.push(<span key="comment" style={{ color: '#546E7A', fontStyle: 'italic' }}>{line}</span>);
    } else {
      parts.push(<span key="plain">{line}</span>);
    }

    return <div key={i}>{parts}</div>;
  });

  return <>{lines}</>;
}

export default function CodePanel({ queryDisplay, autocompleteQuery }) {
  const [modal, setModal] = useState(null);

  // Extract just the search operator part for display
  const searchContent = queryDisplay?.$search
    ? Object.fromEntries(
        Object.entries(queryDisplay.$search).filter(([k]) => k !== 'index')
      )
    : null;

  return (
    <div style={{
      width: 320, flexShrink: 0,
      background: '#1C2D3F',
      color: '#fff',
      fontFamily: "'Source Code Pro', monospace",
      fontSize: 13,
      display: 'flex', flexDirection: 'column',
      minHeight: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <span style={{ color: '#00ED64', fontWeight: 700, fontSize: 15 }}>
          {'{ $search :'}
        </span>
      </div>

      {/* Query content */}
      <div style={{
        padding: '12px 16px', flex: 1, overflowY: 'auto',
        lineHeight: 1.7, fontSize: 13,
      }}>
        {queryDisplay ? (
          <>
            <div style={{ color: '#546E7A', fontStyle: 'italic', marginBottom: 4 }}>
              {'// optional, defaults to "default"'}
            </div>
            <div style={{ marginBottom: 8 }}>
              <span style={{ color: '#C3E88D' }}>index</span>
              {': '}
              <span style={{ color: '#F78C6C' }}>{'< indexName >'}</span>
            </div>
            <pre style={{
              whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              fontFamily: "'Source Code Pro', monospace",
              fontSize: 13, lineHeight: 1.7, margin: 0,
            }}>
              {JSON.stringify(searchContent, null, 2)
                .split('\n')
                .map((line, i) => {
                  // Color keys green, strings orange, numbers/booleans red
                  const keyValMatch = line.match(/^(\s*)("[\w\s$<>./]+")(:\s*)(.*)$/);
                  if (keyValMatch) {
                    const [, indent, key, colon, val] = keyValMatch;
                    let valEl;
                    if (val.startsWith('"')) valEl = <span style={{ color: '#F78C6C' }}>{val}</span>;
                    else if (/^-?\d|true|false/.test(val.trim())) valEl = <span style={{ color: '#FF5370' }}>{val}</span>;
                    else valEl = <span>{val}</span>;
                    return (
                      <div key={i}>
                        {indent}
                        <span style={{ color: '#C3E88D' }}>{key}</span>
                        {colon}
                        {valEl}
                      </div>
                    );
                  }
                  return <div key={i}>{line}</div>;
                })
              }
            </pre>
            <div style={{ color: '#00ED64', marginTop: 8 }}>{'}'}</div>
          </>
        ) : (
          <div style={{ color: '#546E7A', fontStyle: 'italic', marginTop: 8, lineHeight: 1.8 }}>
            Your query will appear here after selecting the filters on facets or typing the name of the restaurant you're searching
          </div>
        )}
      </div>

      {/* Footer — show code buttons */}
      {autocompleteQuery && (
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: 12 }}>
          <button onClick={() => setModal('autocomplete')} style={{
            background: '#111', border: '1px solid rgba(255,255,255,0.15)',
            color: '#fff', padding: '8px 12px', borderRadius: 6,
            cursor: 'pointer', fontSize: 11,
            fontFamily: "'Source Code Pro', monospace",
            textAlign: 'left', width: '100%',
          }}>
            {'</>'} show code for autocomplete operator...
          </button>
        </div>
      )}

      {/* Modal */}
      {modal === 'autocomplete' && autocompleteQuery && (
        <JsonModal
          title="Autocomplete Operator"
          data={autocompleteQuery}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
