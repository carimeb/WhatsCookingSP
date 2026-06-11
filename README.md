# 🍔 WhatsCooking SP

Demo de busca de restaurantes em São Paulo usando **MongoDB Atlas Search** como engine de full-text search: uma alternativa moderna ao Elastic, totalmente integrada ao MongoDB.

Inspirada na [demo original do time de devrel da MongoDB](https://github.com/mongodb-developer/WhatsCooking), reconstruída com dados reais de São Paulo e uma stack atualizada.

---

## ✨ Funcionalidades

- **Full-text search** com fuzzy matching, autocomplete e highlights
- **Sinônimos** explícitos e equivalentes (massa → macarrão, sushi ↔ sashimi…)
- **Function score** para boost de resultados patrocinados (campo `sponsored_boost` no documento, badge SPONSORED no card)
- **Painel de código fiel**: exibe exatamente o stage `$search` executado, sem versões simplificadas
- **Busca geoespacial** com `near` e `geoWithin`
- **Facets** para filtros por culinária, bairro e nota
- **Mapa interativo** com marcadores dos restaurantes (Leaflet)

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
│   ├── .env.example                # Template de variáveis de ambiente
│   ├── .env                        # Credenciais reais (não commitar!)
│   ├── scripts/
│   │   └── marcar_patrocinados.js  # Marca restaurantes patrocinados (function score)
│   └── src/
│       ├── db.js                   # Conexão MongoDB
│       └── routes.js               # Todos os endpoints de busca
│
└── data/                           # Scripts e dados
    ├── coletar_restaurantes.py     # Gera o dataset via OpenStreetMap
    ├── menu_synonyms.json          # Coleção de sinônimos (versionada)
    └── restaurants_sp_enriched.json # Dataset gerado (NÃO versionado)
```

> 💡 **Sobre o `restaurants_sp_enriched.json`:** esse arquivo não está no repositório porque é gerado dinamicamente pelo script `coletar_restaurantes.py`, que busca os dados em tempo real no OpenStreetMap. Você vai gerá-lo no passo 2 abaixo.

---

## ⚙️ Pré-requisitos

- **Node.js** v18+
- **Python** 3.9+ (para gerar o dataset)
- **MongoDB Atlas**: cluster M10+ com MongoDB 8.0
- **mongoimport** (MongoDB Database Tools)

---

## 🚀 Como rodar

### 1. Clone o repositório

```bash
git clone https://github.com/carimeb/WhatsCookingSP.git
cd WhatsCookingSP
```

### 2. Gere o dataset de restaurantes

O dataset é coletado em tempo real do OpenStreetMap (Overpass API):

```bash
cd data
pip3 install requests
python3 coletar_restaurantes.py
```

O script leva ~1 minuto e gera o arquivo `restaurants_sp_enriched.json` com cerca de 1490 restaurantes reais de São Paulo (nome, endereço, coordenadas) enriquecidos com dados mockados (menu, stars, reviews, price_range).

### 3. Importe os dados no Atlas

No seu cluster Atlas, crie o banco `whatscooking` e importe as duas coleções:

```bash
# Restaurantes (gerado no passo anterior)
mongoimport \
  --uri "mongodb+srv://<user>:<senha>@<cluster>.mongodb.net/whatscooking" \
  --collection restaurants \
  --file data/restaurants_sp_enriched.json \
  --jsonArray --drop

# Sinônimos (já vem no repo)
mongoimport \
  --uri "mongodb+srv://<user>:<senha>@<cluster>.mongodb.net/whatscooking" \
  --collection menu_synonyms \
  --file data/menu_synonyms.json \
  --jsonArray --drop
```

> ⚠️ **Atenção ao formato da URI:** o nome do banco (`/whatscooking`) vai no caminho, **antes** do `?` de eventuais parâmetros. Se a URI terminar em `/?appName=...`, os dados vão parar no banco `test`.

> ⚠️ **Reimportando depois dos índices criados?** O `--drop` derruba a coleção inteira, e os índices Atlas Search morrem junto com ela. Para reimportar preservando os índices, limpe apenas os documentos:
>
> ```bash
> mongosh "mongodb+srv://<user>:<senha>@<cluster>.mongodb.net/whatscooking" \
>   --eval "db.restaurants.deleteMany({})"
> mongoimport \
>   --uri "mongodb+srv://<user>:<senha>@<cluster>.mongodb.net/whatscooking" \
>   --collection restaurants \
>   --file data/restaurants_sp_enriched.json \
>   --jsonArray
> ```
>
> Em qualquer reimportação da coleção `restaurants`, rode o passo 6 (`marcar_patrocinados.js`) novamente, pois as marcações de patrocínio são apagadas junto com os documentos.

### 4. Crie os índices de busca no Atlas

No Atlas UI → Search Indexes → na coleção `restaurants`, crie **3 índices** com os nomes e definições JSON abaixo (as definições completas também estão na aba "Data & Indexes" do app rodando):

- **Índice 1 (criar com o nome `default`):** busca principal com sinônimos no campo `menu`, multi-analyzer em `name` (português + standard) e `sponsored_boost` como `number` (necessário para o function score)

```bash
{
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
}
```
 
- **Índice 2 (criar com o nome `autocomplete`):** sugestões em tempo real (edgeGram) nos campos `name`, `cuisine`, `borough`

```bash
{
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
        "maxGrams": 10,
        "foldDiacritics": true
      }],
      "borough": [{
        "type": "autocomplete",
        "tokenization": "edgeGram",
        "minGrams": 2,
        "maxGrams": 10,
        "foldDiacritics": true
      }]
    }
  }
}
```

- **Índice 3 (criar com o nome `facets`):** contagens para os filtros laterais (`token` em cuisine/borough, `number` em stars/price_range), com os mesmos mapeamentos de `name` e sinônimos do índice `default` para as contagens baterem com os resultados

```bash
{
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
}
```

> ⚠️ Os nomes dos índices precisam ser **exatamente** `default`, `autocomplete` e `facets`, pois o backend faz referência a eles por nome.

### 5. Backend

```bash
cd whatscooking-backend
npm install
cp .env.example .env   # depois edite com suas credenciais do Atlas
npm run dev
```

O backend sobe em `http://localhost:5000`.

### 6. Marque os restaurantes patrocinados

Para a feature de **Function Score** (toggle "Sponsored" na interface) funcionar, rode uma única vez:

```bash
cd whatscooking-backend
node scripts/marcar_patrocinados.js
```

O script grava `sponsored: true` e `sponsored_boost: 5` em 15 restaurantes. É idempotente (pode rodar de novo sem efeitos colaterais) e determinístico: qualquer pessoa que clonar o repo marca os mesmos restaurantes. Requer o `.env` configurado no passo anterior.

### 7. Frontend

Em outro terminal:

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

## 📦 Sobre o dataset

- **~1490 restaurantes reais** de São Paulo coletados via OpenStreetMap (Overpass API)
- Dados reais: nome, endereço, coordenadas, tipo de culinária
- Dados enriquecidos (mockados): menu por culinária, stars, reviews, price_range
- **16 culinárias**: Brasileira, Italiana, Japonesa, Asiática, Pizza, Americana, Churrasco, Árabe, Francesa, Vegana, Contemporânea, Frutos do Mar, Mexicana, Padaria, Café, Peruana
- **30 bairros** de SP

---

## 🗺️ Sinônimos configurados

**Explicit** (unidirecional):
- `massa` → macarrão, spaghetti, fettuccine, penne, lasanha…
- `noodles` → ramen, udon, soba, yakisoba, lamen…
- `frango` → chicken, galinha, peito de frango…
- `churrasco` → bbq, barbecue, grelhado, picanha…
- `frutos do mar` → camarão, peixe, lula, polvo, lagosta…

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
