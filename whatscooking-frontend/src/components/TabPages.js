const SYNONYMS_DATA = [
  { type: 'explicit', input: 'massa', synonyms: 'macarrão, spaghetti, espaguete, fettuccine, penne, tagliatelle, linguine, gnocchi, ravioli' },
  { type: 'explicit', input: 'noodles', synonyms: 'macarrão, ramen, udon, soba, yakisoba, lamem, lamen, lámen' },
  { type: 'explicit', input: 'frango', synonyms: 'galinha, chicken, peito de frango, coxa de frango, frango grelhado' },
  { type: 'explicit', input: 'carne', synonyms: 'bife, picanha, filé, alcatra, fraldinha, maminha, costela, beef, steak' },
  { type: 'explicit', input: 'peixe', synonyms: 'salmão, atum, tilápia, bacalhau, saint peter, robalo, fish' },
  { type: 'explicit', input: 'doce', synonyms: 'sobremesa, dessert, brigadeiro, pudim, mousse, sorvete, torta, bolo' },
  { type: 'explicit', input: 'vegetariano', synonyms: 'vegano, vegan, plant based, sem carne, orgânico, natural' },
  { type: 'explicit', input: 'lanche', synonyms: 'hambúrguer, burger, sanduíche, sandwich, wrap, hot dog' },
  { type: 'explicit', input: 'frutos do mar', synonyms: 'camarão, peixe, lula, polvo, siri, lagosta, vieira, ostra, seafood' },
  { type: 'explicit', input: 'churrasco', synonyms: 'bbq, barbecue, grelhado, assado, espeto, picanha, costela' },
  { type: 'equivalent', synonyms: 'hambúrguer, hamburger, burger, burguer' },
  { type: 'equivalent', synonyms: 'sushi, sashimi, temaki, japonês' },
  { type: 'equivalent', synonyms: 'café, coffee, espresso, cafezinho' },
  { type: 'equivalent', synonyms: 'shawarma, gyros, kebab' },
  { type: 'equivalent', synonyms: 'ramen, lámen, lamen, lamem, ramem' },
];

function SynonymCard({ item }) {
  return (
    <div style={{
      border: '1px solid var(--border)', borderRadius: 8,
      padding: '16px 20px', background: '#fff',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>{item.type === 'explicit' ? '⊙' : '⚖️'}</span>
        {item.input && (
          <span style={{ fontWeight: 800, fontSize: 16, color: 'var(--mongodb-dark-green)' }}>
            {item.input}
          </span>
        )}
        <span style={{
          fontSize: 11, fontWeight: 700, color: '#fff',
          background: item.type === 'explicit' ? '#1C2D3F' : '#00684A',
          padding: '2px 8px', borderRadius: 20,
        }}>{item.type === 'explicit' ? 'Explicit' : 'Equivalent'}</span>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
        {item.synonyms}
      </div>
    </div>
  );
}

export function SynonymsPage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
      <h2 style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>
        Synonyms in Atlas Search
      </h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32, fontSize: 16 }}>
        You say "lamem," and I say "ramen?" With synonyms in Atlas Search, call it what you will.
      </p>

      <div style={{ display: 'flex', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
        {/* Equivalent doc */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            Equivalent Synonym Document
          </div>
          <pre style={{
            background: '#1C2D3F', color: '#C3E88D', borderRadius: 8,
            padding: '16px', fontSize: 12, lineHeight: 1.7, overflow: 'auto',
          }}>{`{
  "mappingType": "equivalent",
  "synonyms": [
    "pie",
    "cobbler",
    "tart"
  ]
}`}</pre>
        </div>

        {/* Explicit doc */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            Explicit Synonym Document
          </div>
          <pre style={{
            background: '#1C2D3F', color: '#C3E88D', borderRadius: 8,
            padding: '16px', fontSize: 12, lineHeight: 1.7, overflow: 'auto',
          }}>{`{
  "mappingType": "explicit",
  "input": ["baked goods"],
  "synonyms": [
    "bread",
    "cake",
    "cookies",
    "rolls"
  ]
}`}</pre>
        </div>

        {/* Add to index */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            Add to Search Index to Specify Synonyms Source Collection
          </div>
          <pre style={{
            background: '#1C2D3F', color: '#C3E88D', borderRadius: 8,
            padding: '16px', fontSize: 12, lineHeight: 1.7, overflow: 'auto',
          }}>{`{
  "synonyms": [{
    "analyzer": "lucene.standard",
    "name": "MenuSynonyms",
    "source": {
      "collection": "menu_synonyms"
    }
  }]
}`}</pre>
        </div>
      </div>

      {/* Our custom synonyms */}
      <div style={{
        background: 'var(--mongodb-dark-green)', color: '#fff',
        borderRadius: 10, padding: '16px 24px', textAlign: 'center',
        fontSize: 18, fontWeight: 700, marginBottom: 32,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        🍴 Our Custom Synonyms
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        {SYNONYMS_DATA.map((item, i) => <SynonymCard key={i} item={item} />)}
      </div>
    </div>
  );
}

export function DataIndexesPage() {
  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 32px' }}>
      <h2 style={{ fontSize: 28, marginBottom: 16, textAlign: 'center' }}>Data & Indexes</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 8, maxWidth: 600, margin: '0 auto 32px' }}>
        <strong style={{ color: 'var(--mongodb-dark-green)' }}>Atlas Search</strong> combines the power of Apache Lucene with the developer productivity, scale, and resilience of MongoDB Atlas.
        This <strong style={{ color: 'var(--mongodb-dark-green)' }}>What's Cooking SP</strong> application uses <strong>2 collections</strong> and only <strong>3 Atlas Search indexes</strong>.
      </p>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          Sample Document — whatscooking.restaurants
        </div>
        <pre style={{
          background: '#1C2D3F', color: '#C3E88D', borderRadius: 8,
          padding: '16px', fontSize: 12, lineHeight: 1.7,
          overflow: 'auto', maxHeight: 320,
        }}>{`{
  "_id": { "$oid": "6a12621da09da40616618c6b" },
  "name": "Sakura Sushi",
  "cuisine": "Japonesa",
  "borough": "Vila Madalena",
  "description": "Ambiente aconchegante com cardápio variado.",
  "address": {
    "street": "Rua Wisard, 312",
    "zipcode": "05434-080",
    "city": "São Paulo",
    "state": "SP"
  },
  "location": {
    "type": "Point",
    "coordinates": [ -46.6890, -23.5631 ]
  },
  "stars": 4.3,
  "reviews": 1840,
  "price_range": 2,
  "open_now": true,
  "phone": "+55 11 3456-7890",
  "menu": [
    "Sushi de salmão",
    "Sashimi de atum",
    "Temaki de camarão",
    "Ramen de shoyu",
    "Udon",
    "Gyoza"
  ]
}`}</pre>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
        {[
          {
            title: 'Índice 1 (criar com o nome `default`):',
            code: `{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": {
        "type": "string",
        "analyzer": "lucene.portuguese",
        "multi": {
          "standard": {
            "type": "string",
            "analyzer": "lucene.standard"
          }
        }
      },
      "cuisine": [
        { "type": "string",
          "analyzer": "lucene.portuguese" },
        { "type": "token" }
      ],
      "borough": [
        { "type": "string",
          "analyzer": "lucene.portuguese" },
        { "type": "token" }
      ],
      "description": { "type": "string",
        "analyzer": "lucene.portuguese" },
      "menu": { "type": "string",
        "analyzer": "lucene.standard" },
      "stars": { "type": "number" },
      "reviews": { "type": "number" },
      "price_range": { "type": "number" },
      "open_now": { "type": "boolean" },
      "location": { "type": "geo" }
    }
  },
  "synonyms": [{
    "analyzer": "lucene.standard",
    "name": "MenuSynonyms",
    "source": {
      "collection": "menu_synonyms"
    }
  }]
}`,
          },
          {
            title: 'Índice 2 (criar com o nome `autocomplete`):',
            code: `{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": [{
        "type": "autocomplete",
        "tokenization": "edgeGram",
        "minGrams": 2,
        "maxGrams": 10,
        "foldDiacritics": true
      }],
      "cuisine": [{
        "type": "autocomplete",
        "tokenization": "edgeGram",
        "minGrams": 2,
        "maxGrams": 10
      }]
    }
  }
}`,
          },
          {
            title: 'Índice 3 (criar com o nome `facets`):',
            code: `{
  "mappings": {
    "dynamic": false,
    "fields": {
      "cuisine": [
        { "type": "stringFacet" },
        { "type": "string" }
      ],
      "borough": [
        { "type": "stringFacet" },
        { "type": "string" }
      ],
      "stars": [
        { "type": "numberFacet" },
        { "type": "number" }
      ],
      "location": { "type": "geo" },
      "menu": { "type": "string" }
    }
  }
}`,
          },
        ].map(({ title, code }) => (
          <div key={title}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
              {title}
            </div>
            <pre style={{
              background: '#1C2D3F', color: '#C3E88D', borderRadius: 8,
              padding: '16px', fontSize: 11, lineHeight: 1.7,
              overflow: 'auto', maxHeight: 380,
            }}>{code}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FunctionScorePage() {
  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '40px 32px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 28, marginBottom: 16 }}>Function Score</h2>
      <p style={{ color: 'var(--text-muted)', fontSize: 16, lineHeight: 1.8, marginBottom: 32 }}>
        Use <strong>Function Score</strong> to customize result ranking beyond simple relevance.
        Enable the <strong>Sponsored</strong> toggle in the search bar to boost certain results
        and see the <span style={{ color: 'var(--sponsored-bg)', background: '#333', padding: '2px 8px', borderRadius: 4, fontSize: 13 }}>SPONSORED</span> badge appear on promoted listings.
      </p>
      <pre style={{
        background: '#1C2D3F', color: '#C3E88D', borderRadius: 8,
        padding: '24px', fontSize: 13, lineHeight: 1.8,
        textAlign: 'left', display: 'inline-block',
      }}>{`{
  "compound": {
    "must": [ ... ],
    "score": {
      "function": {
        "multiply": [
          { "score": "relevance" },
          { "constant": { "value": 5 } }
        ]
      }
    }
  }
}`}</pre>
    </div>
  );
}
