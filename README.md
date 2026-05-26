# 🍽️ WhatsCooking SP

Demo interativa do **MongoDB Atlas Search** usando restaurantes reais de São Paulo. Inspirada na demo original [WhatsCooking](https://github.com/mongodb-developer/WhatsCooking) da MongoDB, adaptada para SP e modernizada com backend Node.js/Express.

Desenvolvida como material de apresentação para demonstrar as capacidades do Atlas Search para clientes que usam Elasticsearch.

---

## 📸 O que a demo mostra

- **Busca textual com fuzzy match** — tolera erros de digitação ("piza" → "pizza")
- **Autocomplete** — sugestões em tempo real enquanto digita
- **Sinônimos** — "massa" encontra "spaghetti", "macarrão", "fettuccine" etc.
- **Highlight** — destaca o termo buscado nos resultados e no menu do restaurante
- **Facets** — filtros dinâmicos por culinária e bairro com contagens
- **Geospatial** — busca por proximidade (`near`) ou dentro de um raio (`geoWithin`)
- **Compound operator** — combina múltiplos operadores em uma única query
- **Function Score** — boost em resultados patrocinados
- **Painel de código** — exibe a query `$search` em tempo real enquanto o usuário interage
- **Abas educativas** — Synonyms, Function Score e Data & Indexes explicam cada feature

---

## 🏗️ Arquitetura

```
Browser (React)  →  Node.js/Express API  →  MongoDB Atlas (cloud)
  porta 3000           porta 5000
```

Tudo roda localmente exceto o banco, que fica no Atlas.

---

## 📁 Estrutura do projeto

```
WhatsCookingSP/
├── whatscooking-frontend/          # React app
│   └── src/
│       ├── App.js                  # Componente principal
│       ├── api.js                  # Chamadas ao backend
│       ├── index.css               # Estilos globais
│       ├── hooks/
│       │   └── useSearch.js        # Hook de busca e estado
│       └── components/
│           ├── Header.js           # Barra de busca + autocomplete + abas
│           ├── Sidebar.js          # Filtros: geo, stars, cuisine, borough
│           ├── MapView.js          # Mapa Leaflet + marcadores
│           ├── RestaurantCard.js   # Card do restaurante + modal de menu
│           ├── CodePanel.js        # Painel preto com query $search
│           └── TabPages.js         # Abas: Synonyms, Function Score, Data & Indexes
│
├── whatscooking-backend/           # Node.js + Express API
│   ├── server.js                   # Entry point + rotas
│   ├── .env                        # Credenciais (não commitar!)
│   └── src/
│       ├── db.js                   # Conexão MongoDB
│       └── routes.js               # Todos os endpoints de busca
│
└── data/                           # Scripts e dados
    ├── coletar_restaurantes.py     # Coleta restaurantes reais via OSM
    ├── menu_synonyms.json          # Coleção de sinônimos
    └── restaurants_sp_enriched.json # Dataset de restaurantes (gerado)
```

---

## ⚙️ Pré-requisitos

- **Node.js** v18+
- **Python** 3.9+ (apenas para scripts de dados)
- **MongoDB Atlas** — cluster M10+ com MongoDB 8.0
- **mongoimport** (MongoDB Database Tools)

---

## 🚀 Como rodar

### 1. Clone o repositório

```bash
git clone https://github.com/<seu-usuario>/whatscooking-sp.git
cd whatscooking-sp
```

### 2. Configure o Atlas

No seu cluster Atlas, crie o banco `whatscooking` e importe os dados:

```bash
# Restaurantes
mongoimport \
  --uri "mongodb+srv://<user>:<senha>@<cluster>.mongodb.net/whatscooking" \
  --collection restaurants \
  --file data/restaurants_sp_enriched.json \
  --jsonArray --drop

# Sinônimos
mongoimport \
  --uri "mongodb+srv://<user>:<senha>@<cluster>.mongodb.net/whatscooking" \
  --collection menu_synonyms \
  --file data/menu_synonyms.json \
  --jsonArray --drop
```

### 3. Crie os índices de Search

No Atlas UI: **seu cluster → Search Indexes → Create Search Index → JSON Editor**

**Índice `default`:**
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": { "type": "string", "analyzer": "lucene.standard" },
      "cuisine": [
        { "type": "string", "analyzer": "lucene.portuguese" },
        { "type": "token" }
      ],
      "borough": [
        { "type": "string", "analyzer": "lucene.portuguese" },
        { "type": "token" }
      ],
      "description": { "type": "string", "analyzer": "lucene.portuguese" },
      "menu": { "type": "string", "analyzer": "lucene.standard" },
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
    "source": { "collection": "menu_synonyms" }
  }]
}
```

**Índice `autocomplete`:**
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": [{ "type": "autocomplete", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 10, "foldDiacritics": true }],
      "cuisine": [{ "type": "autocomplete", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 10, "foldDiacritics": true }],
      "borough": [{ "type": "autocomplete", "tokenization": "edgeGram", "minGrams": 2, "maxGrams": 10, "foldDiacritics": true }]
    }
  }
}
```

**Índice `facets`:**
```json
{
  "mappings": {
    "dynamic": false,
    "fields": {
      "name": { "type": "string", "analyzer": "lucene.portuguese" },
      "cuisine": [
        { "type": "string", "analyzer": "lucene.standard" },
        { "type": "stringFacet" }
      ],
      "borough": [
        { "type": "string", "analyzer": "lucene.standard" },
        { "type": "stringFacet" }
      ],
      "menu": { "type": "string", "analyzer": "lucene.standard" },
      "stars": [{ "type": "number" }, { "type": "numberFacet" }],
      "price_range": [{ "type": "number" }, { "type": "numberFacet" }],
      "open_now": { "type": "boolean" },
      "location": { "type": "geo" }
    }
  },
  "synonyms": [{
    "analyzer": "lucene.standard",
    "name": "MenuSynonyms",
    "source": { "collection": "menu_synonyms" }
  }]
}
```

Aguarde os 3 índices ficarem com status **Active**.

### 4. Backend

```bash
cd whatscooking-backend
npm install
cp .env.example .env   # edite com suas credenciais
npm run dev
```

O backend sobe em `http://localhost:5000`.

### 5. Frontend

```bash
cd whatscooking-frontend
npm install
npm start
```

Abre automaticamente em `http://localhost:3000`.

---

## 🔌 Endpoints da API

| Endpoint | Descrição |
|---|---|
| `GET /api/restaurants` | Busca principal com todos os operadores |
| `GET /api/autocomplete?q=texto` | Sugestões em tempo real |
| `GET /api/facets` | Contagens para os filtros laterais |
| `GET /api/restaurant/:id` | Detalhe de um restaurante |
| `GET /api/health` | Health check |

**Parâmetros de `/api/restaurants`:**

| Parâmetro | Descrição |
|---|---|
| `q` | Busca por nome do restaurante (fuzzy) |
| `food` | Busca por prato/ingrediente no menu (com sinônimos) |
| `cuisine` | Filtro por culinária (múltiplas separadas por vírgula) |
| `borough` | Filtro por bairro (match exato) |
| `min_stars` | Nota mínima (ex: `3.5`) |
| `geo_mode` | `near` ou `geoWithin` |
| `lat`, `lng` | Coordenadas do centro da busca geo |
| `distance` | Raio em km |
| `sponsored` | `true` para ativar function score boost |
| `highlight` | `true` para retornar highlights |

---

## 📦 Dataset

- **1490 restaurantes reais** de São Paulo coletados via OpenStreetMap (Overpass API)
- Dados reais: nome, endereço, coordenadas, tipo de culinária
- Dados enriquecidos: menu (mockado por culinária), stars, reviews, price_range
- **15 culinárias**: Brasileira, Italiana, Japonesa, Pizza, Americana, Churrasco, Árabe, Francesa, Vegana, Contemporânea, Frutos do Mar, Mexicana, Padaria, Café, Peruana
- **30 bairros** de SP

---

## 🔄 Scripts de dados

**Recriar o dataset do zero:**
```bash
cd data
python3 -m venv venv
source venv/bin/activate
pip install requests
python3 coletar_restaurantes.py
```


---

## 🗺️ Sinônimos configurados

**Explicit** (unidirecional):
- `massa` → macarrão, spaghetti, fettuccine, penne, lasanha...
- `noodles` → ramen, udon, soba, yakisoba, lamen...
- `frango` → chicken, galinha, peito de frango...
- `churrasco` → bbq, barbecue, grelhado, picanha...
- `frutos do mar` → camarão, peixe, lula, polvo, lagosta...

**Equivalent** (bidirecional):
- hambúrguer ↔ burger ↔ hamburger
- sushi ↔ sashimi ↔ temaki
- ramen ↔ lámen ↔ lamen ↔ lamem
- café ↔ coffee ↔ espresso
- shawarma ↔ gyros ↔ kebab

---

## ⚠️ .gitignore recomendado

```
node_modules/
.env
data/venv/
data/restaurants_sp_enriched.json
```

---

## 📝 Créditos

- Demo original: [mongodb-developer/WhatsCooking](https://github.com/mongodb-developer/WhatsCooking)
- Dados: [OpenStreetMap](https://www.openstreetmap.org/) contributors
- Mapa: [Leaflet](https://leafletjs.com/) + OpenStreetMap
