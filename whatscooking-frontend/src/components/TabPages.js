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
        Sinônimos no Atlas Search
      </h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32, fontSize: 16 }}>
        Você diz "lamem", eu digo "ramen"? Com sinônimos no Atlas Search, chame como quiser.
      </p>

      <div style={{ display: 'flex', gap: 24, marginBottom: 40, flexWrap: 'wrap' }}>
        {/* Equivalent doc */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
            Documento de sinônimos do tipo "equivalent"
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
            Documento de sinônimos do tipo "explicit"
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
            Adicione ao índice de busca para apontar a coleção de sinônimos
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
        🍴 Nossos sinônimos customizados
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
      <h2 style={{ fontSize: 28, marginBottom: 16, textAlign: 'center' }}>Dados & Índices</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 8, maxWidth: 600, margin: '0 auto 32px' }}>
        <strong style={{ color: 'var(--mongodb-dark-green)' }}>Atlas Search</strong> combina o poder do Apache Lucene com a produtividade, escala e resiliência do MongoDB Atlas.
        Esta aplicação <strong style={{ color: 'var(--mongodb-dark-green)' }}>What's Cooking SP</strong> usa <strong>2 coleções</strong> e apenas <strong>3 índices Atlas Search</strong>.
      </p>

      <div style={{ marginBottom: 32 }}>
        <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--text-muted)', fontSize: 13 }}>
          Documento de exemplo — whatscooking.restaurants
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
      "location": { "type": "geo" },
      "sponsored_boost": { "type": "number" }
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
        { "type": "token" },
        { "type": "string",
          "analyzer": "lucene.portuguese" }
      ],
      "borough": [
        { "type": "token" },
        { "type": "string",
          "analyzer": "lucene.portuguese" }
      ],
      "stars": { "type": "number" },
      "price_range": { "type": "number" },
      "location": { "type": "geo" },
      "menu": { "type": "string",
        "analyzer": "lucene.standard" }
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

// ── Function Score ────────────────────────────────────────────────────────────

const FS_SECTION_TITLE = {
  fontSize: 20, fontWeight: 800, marginBottom: 12,
  color: 'var(--mongodb-dark-green)',
};

const FS_PRE = {
  background: '#1C2D3F', color: '#C3E88D', borderRadius: 8,
  padding: '20px', fontSize: 12.5, lineHeight: 1.8,
  textAlign: 'left', overflow: 'auto',
};

const FS_CARD = {
  border: '1px solid var(--border)', borderRadius: 8,
  padding: '16px 20px', background: '#fff', fontSize: 14, lineHeight: 1.7,
};

export function FunctionScorePage() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 32px' }}>
      <h2 style={{ fontSize: 28, marginBottom: 8, textAlign: 'center' }}>Function Score</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 40, fontSize: 16, maxWidth: 640, margin: '0 auto 40px' }}>
        Relevância é o padrão — mas nem sempre é o suficiente. Com <strong>Function Score</strong>, o
        Atlas Search permite modificar matematicamente o ranking dos resultados, combinando o score
        de relevância com campos do próprio documento.
      </p>

      {/* 1. Relevância */}
      <div style={{ marginBottom: 40 }}>
        <div style={FS_SECTION_TITLE}>1. De onde vem o score de relevância?</div>
        <div style={FS_CARD}>
          <p style={{ marginBottom: 12 }}>
            Todo resultado do <code>$search</code> recebe um <strong>score de relevância</strong>,
            calculado pelo algoritmo <strong>BM25</strong> do Apache Lucene (o mesmo motor do
            Elasticsearch). Três fatores principais determinam o valor:
          </p>
          <ul style={{ paddingLeft: 20, margin: 0, color: 'var(--text-muted)' }}>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'inherit' }}>Frequência do termo (TF)</strong> — quantas vezes o termo buscado aparece no
              campo. Um restaurante com "pizza" em 5 itens do menu pontua mais que um com 1.
            </li>
            <li style={{ marginBottom: 8 }}>
              <strong style={{ color: 'inherit' }}>Raridade do termo (IDF)</strong> — termos raros na coleção valem mais.
              "Trufado" diferencia mais que "molho", que aparece em quase todo menu.
            </li>
            <li>
              <strong style={{ color: 'inherit' }}>Tamanho do campo</strong> — um match em um campo curto (nome) pesa mais
              que o mesmo match em um campo longo (descrição extensa).
            </li>
          </ul>
          <p style={{ marginTop: 12, marginBottom: 0 }}>
            O score aparece no canto de cada card de resultado e é retornado pelo pipeline via{' '}
            <code>{'{ $meta: "searchScore" }'}</code>. Repare: o valor é <em>relativo à busca</em>,
            não uma nota absoluta — só faz sentido comparar scores dentro do mesmo conjunto de resultados.
          </p>
        </div>
      </div>

      {/* 2. O que o function score faz */}
      <div style={{ marginBottom: 40 }}>
        <div style={FS_SECTION_TITLE}>2. O que o Function Score permite fazer</div>
        <div style={FS_CARD}>
          <p style={{ marginBottom: 12 }}>
            A opção <code>score.function</code> substitui o score final por uma <strong>expressão
            aritmética</strong> que você define. Os blocos de construção:
          </p>
          <ul style={{ paddingLeft: 20, margin: '0 0 12px', color: 'var(--text-muted)' }}>
            <li style={{ marginBottom: 6 }}><code>score: "relevance"</code> — o score BM25 original</li>
            <li style={{ marginBottom: 6 }}><code>path</code> — o valor numérico de um campo do documento (precisa estar indexado como <code>number</code>)</li>
            <li style={{ marginBottom: 6 }}><code>constant</code> — um número fixo</li>
            <li><code>multiply</code>, <code>add</code>, <code>log</code>, <code>gauss</code> — operações para combinar os blocos acima</li>
          </ul>
          <p style={{ margin: 0 }}>
            Isso transforma ranking em <strong>regra de negócio</strong>: resultados patrocinados,
            boost por avaliação, decaimento por distância ou idade — tudo declarado na própria query,
            sem pós-processamento na aplicação.
          </p>
        </div>
      </div>

      {/* 3. Nossa implementação */}
      <div style={{ marginBottom: 40 }}>
        <div style={FS_SECTION_TITLE}>3. Como esta demo implementa o boost "Sponsored"</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'stretch' }}>
          <pre style={{ ...FS_PRE, flex: '1 1 380px', margin: 0 }}>{`// query enviada quando o toggle
// "Sponsored" está ligado
{
  "compound": {
    "must": [ ... ],
    "score": {
      "function": {
        "multiply": [
          { "score": "relevance" },
          { "path": {
              "value": "sponsored_boost",
              "undefined": 1
          } }
        ]
      }
    }
  }
}`}</pre>
          <div style={{ ...FS_CARD, flex: '1 1 320px' }}>
            <p style={{ marginBottom: 12 }}>
              Alguns restaurantes da coleção carregam o campo <code>sponsored_boost: 5</code>{' '}
              (gravado pelo script <code>scripts/marcar_patrocinados.js</code>). A função multiplica
              o score de relevância pelo valor desse campo.
            </p>
            <p style={{ marginBottom: 12 }}>
              <code>"undefined": 1</code> é o fallback para documentos <em>sem</em> o campo:
              multiplicam por 1 e mantêm o score original. Sem esse fallback, a query falharia
              nos documentos não patrocinados.
            </p>
            <p style={{ margin: 0 }}>
              Para funcionar, <code>sponsored_boost</code> precisa estar mapeado como{' '}
              <code>number</code> no índice <code>default</code> (veja a aba <strong>Data &
              Indexes</strong>).
            </p>
          </div>
        </div>
      </div>

      {/* 4. Por que multiplicar */}
      <div style={{ marginBottom: 40 }}>
        <div style={FS_SECTION_TITLE}>4. Por que multiplicar, e não simplesmente fixar no topo?</div>
        <div style={FS_CARD}>
          <p style={{ marginBottom: 12 }}>
            O boost multiplicativo <strong>preserva a relevância</strong>: um patrocinado sobe na
            proporção do quanto ele já era relevante para a busca. Um restaurante patrocinado que
            mal menciona "pizza" não atropela uma pizzaria orgânica extremamente relevante —
            5 × (score baixo) ainda pode perder de 1 × (score altíssimo).
          </p>
          <p style={{ margin: 0 }}>
            Esse é um argumento de negócio importante: <em>patrocínio influencia, mas não corrompe,
            a qualidade dos resultados</em> — a experiência do usuário final continua protegida.
            Quer um boost mais agressivo? Basta aumentar o valor de <code>sponsored_boost</code>{' '}
            nos documentos, sem tocar na query.
          </p>
        </div>
      </div>

      {/* 5. Roteiro de demo */}
      <div style={{ marginBottom: 40 }}>
        <div style={FS_SECTION_TITLE}>5. Roteiro para demonstrar ao vivo</div>
        <div style={FS_CARD}>
          <ol style={{ paddingLeft: 20, margin: 0, color: 'var(--text-muted)' }}>
            <li style={{ marginBottom: 8 }}>
              Busque <strong>"pizza"</strong> com o toggle <strong>Sponsored desligado</strong> e
              anote o score e a posição de um patrocinado (ex.: <em>La Tivoli</em>).
            </li>
            <li style={{ marginBottom: 8 }}>
              Ligue o toggle e repita a busca: os patrocinados saltam no ranking, com score ~5× maior.
            </li>
            <li style={{ marginBottom: 8 }}>
              Abra o <strong>painel de código</strong> e mostre a query: a única diferença é o bloco{' '}
              <code>score.function</code> — uma linha de negócio, zero mudança na aplicação.
            </li>
            <li>
              Mostre que um orgânico muito relevante ainda pode segurar posição — relevância
              continua valendo.
            </li>
          </ol>
        </div>
      </div>

      {/* 6. Outros usos */}
      <div>
        <div style={FS_SECTION_TITLE}>6. Outros usos de Function Score</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          <div style={FS_CARD}>
            <strong>⭐ Boost por avaliação</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
              <code>multiply: [score, path: "stars"]</code> — restaurantes mais bem avaliados
              sobem naturalmente no ranking.
            </p>
          </div>
          <div style={FS_CARD}>
            <strong>🔥 Boost por popularidade</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
              <code>log</code> sobre <code>reviews</code> evita que um restaurante com 10.000
              avaliações esmague todos os outros — crescimento amortecido.
            </p>
          </div>
          <div style={FS_CARD}>
            <strong>📍 Decaimento por distância</strong>
            <p style={{ margin: '8px 0 0', color: 'var(--text-muted)' }}>
              <code>gauss</code> reduz o score suavemente conforme o restaurante se afasta de um
              ponto de origem — sem cortes bruscos como um filtro geo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
