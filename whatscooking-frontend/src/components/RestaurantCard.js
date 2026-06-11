import { useState } from 'react';

const CUISINE_EMOJI = {
  'Brasileira':'🇧🇷','Italiana':'🍝','Japonesa':'🍣','Árabe':'🧆',
  'Americana':'🍔','Mexicana':'🌮','Francesa':'🥐','Peruana':'🐟',
  'Vegana':'🥗','Frutos do Mar':'🦞','Churrasco':'🥩','Pizza':'🍕',
  'Contemporânea':'👨‍🍳','Padaria':'🥖','Café':'☕','Asiática':'🥡',
};

const PRICE = {1:'$',2:'$$',3:'$$$',4:'$$$$'};

function HighlightText({ highlights, field, fallback }) {
  if (!highlights) return <span>{fallback}</span>;
  const h = highlights.find(x => x.path === field);
  if (!h) return <span>{fallback}</span>;
  return (
    <span>
      {h.texts.map((t, i) =>
        t.type === 'hit'
          ? <mark key={i}>{t.value}</mark>
          : <span key={i}>{t.value}</span>
      )}
    </span>
  );
}

// Synonym map for client-side highlight in menu modal
const SYNONYMS = {
  massa:    ['macarrão','spaghetti','espaguete','fettuccine','penne','tagliatelle','linguine','gnocchi','ravioli','tortellini','lasanha'],
  noodles:  ['macarrão','ramen','udon','soba','yakisoba','lamem','lamen','lámen'],
  lamen:    ['ramen','udon','soba','yakisoba','noodles','macarrão'],
  lamem:    ['ramen','udon','soba','yakisoba','noodles','macarrão'],
  ramen:    ['udon','soba','yakisoba','lamen','lamem','noodles','macarrão'],
  frango:   ['chicken','galinha','peito de frango','coxa de frango'],
  carne:    ['bife','picanha','filé','alcatra','fraldinha','maminha','costela','beef','steak'],
  peixe:    ['salmão','atum','tilápia','bacalhau','robalo','fish'],
  doce:     ['sobremesa','dessert','brigadeiro','pudim','mousse','sorvete','torta','bolo'],
  lanche:   ['hambúrguer','burger','sanduíche','sandwich','wrap','hot dog'],
  churrasco:['bbq','barbecue','grelhado','assado','espeto','picanha','costela'],
  hambúrguer:['burger','hamburger','burguer','burgers'],
  burger:   ['hambúrguer','hamburger','burguer'],
  sushi:    ['sashimi','temaki','japonês'],
  café:     ['coffee','espresso','cafezinho'],
  shawarma: ['gyros','kebab'],
  pão:      ['bread','baguette','ciabatta','focaccia'],
  vegetariano:['vegano','vegan','plant based','orgânico'],
};

function getHighlightTerms(food) {
  if (!food) return [];
  const lower = food.toLowerCase().trim();
  const terms = new Set([lower]);
  // Add synonyms
  if (SYNONYMS[lower]) SYNONYMS[lower].forEach(s => terms.add(s.toLowerCase()));
  // Check if food is a value in synonyms (reverse lookup)
  Object.entries(SYNONYMS).forEach(([key, vals]) => {
    if (vals.some(v => v.toLowerCase() === lower)) terms.add(key);
  });
  return Array.from(terms);
}

// Normalize string removing accents for accent-insensitive matching
function normalize(str) {
  return str.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function highlightItem(item, terms) {
  if (!terms.length) return <span>{item}</span>;
  const normItem = normalize(item);
  const match = terms.find(t => normItem.includes(normalize(t)));
  if (!match) return <span>{item}</span>;
  const normMatch = normalize(match);
  const idx = normItem.indexOf(normMatch);
  return (
    <span>
      {item.slice(0, idx)}
      <mark>{item.slice(idx, idx + normMatch.length)}</mark>
      {item.slice(idx + normMatch.length)}
    </span>
  );
}

function MenuModal({ restaurant, food, onClose }) {
  // Constrói um Set com os textos do menu que o Atlas marcou como match
  // (cobre fuzzy: "arros"→"arroz" e sinônimos: "noodles"→"ramen")
  const menuHits = new Set();
  (restaurant.highlights || [])
    .filter(h => h.path === 'menu')
    .forEach(h => {
      const text = (h.texts || [])
        .filter(t => t.type === 'hit')
        .map(t => t.value.toLowerCase())
        .join(' ');
      if (text) menuHits.add(text.trim());
    });

  // Fallback client-side: caso o highlight do Atlas não retorne, usa .includes literal
  const lowerFood = (food || '').toLowerCase().trim();

  function isHit(item) {
    const lowerItem = item.toLowerCase();
    // 1. Match via highlights do Atlas (cobre fuzzy + sinônimos)
    for (const hit of menuHits) {
      if (lowerItem.includes(hit)) return true;
    }
    // 2. Fallback: match literal
    if (lowerFood && lowerItem.includes(lowerFood)) return true;
    return false;
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 12, maxWidth: 600, width: '100%',
        padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
        display: 'flex', gap: 32,
      }}>
        {/* Illustration */}
        <div style={{ fontSize: 80, display: 'flex', alignItems: 'center' }}>
          {CUISINE_EMOJI[restaurant.cuisine] || '🍴'}
        </div>
        {/* Menu items */}
        <div style={{ flex: 1 }}>
          <h2 style={{ marginBottom: 16, fontSize: 20 }}>{restaurant.name} Menu</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {(restaurant.menu || []).map((item, i) => (
              <div key={i} style={{ fontSize: 14 }}>
                {isHit(item) ? <mark>{item}</mark> : item}
              </div>
            ))}
          </div>
        </div>
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12,
          background: 'none', border: 'none', fontSize: 20,
          cursor: 'pointer', color: '#999',
        }}>✕</button>
      </div>
    </div>
  );
}

export default function RestaurantCard({ restaurant, food, onClick, rank, sponsored }) {
  const [showMenu, setShowMenu] = useState(false);

  const stars = restaurant.stars || 0;
  const fullStars = Math.round(stars);

  return (
    <>
      <div style={{
        background: '#fff', borderRadius: 8,
        border: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex', gap: 16, alignItems: 'flex-start',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s',
      }}
        onClick={() => onClick && onClick(restaurant)}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      >
        {/* Score badge */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            background: sponsored ? 'var(--sponsored-bg)' : 'var(--score-bg)',
            color: sponsored ? '#1C2D3F' : '#fff',
            borderRadius: 6, padding: '4px 10px',
            fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap',
          }}>
            score: {restaurant.score?.toFixed(1)}
            {sponsored && <span style={{ marginLeft: 6, fontSize: 10 }}>SPONSORED ▶</span>}
          </div>
          {/* Cuisine emoji image */}
          <div style={{ fontSize: 36, marginTop: 4 }}>
            {CUISINE_EMOJI[restaurant.cuisine] || '🍴'}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>
            <HighlightText highlights={restaurant.highlights} field="name" fallback={restaurant.name} />
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>
            {restaurant.cuisine}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 2 }}>
            {restaurant.address?.street}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 6 }}>
            {restaurant.borough}
          </div>

          {/* Stars + price + reviews */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span className="stars">
              {'★'.repeat(fullStars)}
              <span className="empty">{'★'.repeat(5 - fullStars)}</span>
            </span>
            {[1,2,3,4].slice(0, restaurant.price_range).map(i => (
              <span key={i} style={{ fontSize: 13, color: '#00684A', fontWeight: 700 }}>$</span>
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {restaurant.reviews?.toLocaleString('pt-BR')} reviews
            </span>
          </div>

          {/* Show Menu button */}
          <button
            onClick={e => { e.stopPropagation(); setShowMenu(true); }}
            style={{
              marginTop: 8, background: 'none',
              border: '1px solid #ddd', borderRadius: 4,
              padding: '4px 10px', fontSize: 12, cursor: 'pointer',
              fontFamily: 'Inter, sans-serif',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            Show Menu 🍴
          </button>
        </div>
      </div>

      {showMenu && (
        <MenuModal
          restaurant={restaurant}
          food={food}
          onClose={() => setShowMenu(false)}
        />
      )}
    </>
  );
}
