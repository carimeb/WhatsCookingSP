# 🏗️ Architecture & Development Guide

Este documento descreve as decisões técnicas, o fluxo de dados e os detalhes de implementação do **WhatsCooking SP** — uma demo do MongoDB Atlas Search estilo Yelp para São Paulo.

Ideal para reproduzir o projeto do zero usando desenvolvimento guiado por especificação (SDD).

---

## 🎯 Contexto e objetivo

A demo foi construída para apresentar o **MongoDB Atlas Search** a clientes que utilizam Elasticsearch e estão insatisfeitos com performance e custo. O objetivo é mostrar, de forma visual e interativa, que todos os operadores de busca que o cliente já usa no Elastic têm equivalente no Atlas Search — em muitos casos com configuração mais simples.

---

## 🔄 Mapeamento Elastic DSL → Atlas Search

| Operador Elastic | Equivalente Atlas Search | Implementado |
|---|---|---|
| `$exists` | `exists` | ✅ |
| `$equals` | `equals` (com tipo `token`) | ✅ |
| `$phrase` | `phrase` | ✅ (via `text` com fuzzy off) |
| `$prefix` | `autocomplete` com `edgeGram` | ✅ |
| `$contain` | `text` (comportamento padrão) | ✅ |
| `$gt/$lt/$gte/$lte` | `range` | ✅ |
| `$not` | `compound` com `mustNot` | ✅ (via compound) |
| `$lookup` | `$lookup` no aggregation pipeline | ✅ (nativo MongoDB) |
| `$geo_shape` | `geoWithin` com `geometry` | ✅ |
| `$geo_bbox` | `geoWithin` com `box` | ✅ |
| `$geo_within` | `geoWithin` | ✅ |
| `$geo_radius` | `geoWithin` com `circle` | ✅ |

---

## 🗄️ Schema do documento MongoDB

**Coleção:** `whatscooking.restaurants`

```json
{
  "_id": { "$oid": "..." },
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
    "coordinates": [-46.6890, -23.5631]
  },
  "stars": 4.3,
  "reviews": 1840,
  "price_range": 2,
  "open_now": true,
  "phone": "+55 11 3456-7890",
  "website": "https://sakurasushi.com.br",
  "menu": [
    "Sushi de salmão",
    "Sashimi de atum",
    "Ramen de shoyu",
    "Udon",
    "Gyoza"
  ]
}
```

**Coleção:** `whatscooking.menu_synonyms`

```json
{
  "mappingType": "explicit",
  "input": ["massa"],
  "synonyms": ["macarrão", "spaghetti", "fettuccine", "penne", "lasanha"]
}
```

---

## 📐 Decisões de arquitetura

### Por que Node.js/Express no backend?

O frontend React não pode conectar diretamente ao MongoDB Atlas por segurança — a connection string ficaria exposta no navegador. O backend Node.js age como camada intermediária que:
- Mantém as credenciais seguras no servidor
- Executa os pipelines de aggregation
- Retorna apenas os dados necessários ao frontend

### Por que Leaflet + OpenStreetMap?

- Gratuito, sem necessidade de API key ou cartão de crédito
- Cobertura excelente de São Paulo
- Fácil integração com React via `react-leaflet`
- Google Maps exigiria billing configurado

### Por que 3 índices separados?

| Índice | Propósito | Motivo da separação |
|---|---|---|
| `default` | Busca principal, geo, range, synonyms | Índice geral com todos os campos |
| `autocomplete` | Sugestões em tempo real | Requer tipo `autocomplete` com `edgeGram` — incompatível com `string` no mesmo índice |
| `facets` | Contagens dinâmicas dos filtros | Requer tipos `stringFacet` e `numberFacet` — usa `$searchMeta` em vez de `$search` |

### Por que `lucene.standard` no campo `menu` e `name`?

O `lucene.portuguese` faz stemming agressivo — remove sufixos para encontrar a raiz da palavra. Isso é ótimo para `description` e `borough`, mas quebra palavras estrangeiras como "sushi", "ramen", "burger". Com `lucene.standard`, o fuzzy match funciona corretamente para nomes próprios e pratos de outras culinárias.

### Por que `token` em `cuisine` e `borough`?

O operador `equals` do Atlas Search requer que o campo esteja indexado como `token` (match exato, case-sensitive). Sem isso, o filtro por bairro usaria `text` que faz match parcial — "Vila Mariana" faria match com "Vila Madalena" por compartilharem o token "Vila".

### Por que `fuzzy` e `synonyms` não podem coexistir?

É uma limitação do Atlas Search — o mesmo operador `text` não aceita os dois simultaneamente. A solução foi usar um `compound` com `should`:
- Um `text` com `synonyms: "MenuSynonyms"` — para encontrar sinônimos
- Um `text` com `fuzzy` — para tolerar erros de digitação
- `minimumShouldMatch: 1` — basta um dos dois encontrar resultado

---

## 🔁 Fluxo de dados

```
Usuário digita na barra de busca
        ↓
Header.js (debounce 200ms)
        ↓
GET /api/autocomplete?q=texto
        ↓
routes.js → $search com index "autocomplete"
        ↓
Sugestões aparecem no dropdown
        ↓
Usuário clica em Find (ou seleciona sugestão)
        ↓
useSearch.js → doSearch()
        ↓
GET /api/restaurants + GET /api/facets (em paralelo)
        ↓
routes.js → $search com index "default" (compound)
routes.js → $searchMeta com index "facets"
        ↓
Results → RestaurantCard.js (com highlights)
Facets → Sidebar.js (com contagens)
QueryDisplay → CodePanel.js (query em tempo real)
Locations → MapView.js (pins no mapa)
```

---

## 🔍 Implementação dos operadores principais

### Busca por nome (fuzzy)

```js
{
  text: {
    query: q,
    path: ['name', 'borough'],
    fuzzy: { maxEdits: 2, maxExpansions: 50 }
  }
}
```

### Busca por comida (synonyms + fuzzy)

```js
{
  compound: {
    should: [
      { text: { query: food, path: 'menu', synonyms: 'MenuSynonyms' } },
      { text: { query: food, path: 'menu', fuzzy: { maxEdits: 1 } } }
    ],
    minimumShouldMatch: 1
  }
}
```

### Filtro por bairro (match exato)

```js
{ equals: { path: 'borough', value: borough } }
```

### Filtro por culinária (múltiplas)

```js
// Uma culinária
{ equals: { path: 'cuisine', value: 'Japonesa' } }

// Múltiplas culinárias (OR)
{
  compound: {
    should: cuisines.map(c => ({ equals: { path: 'cuisine', value: c } })),
    minimumShouldMatch: 1
  }
}
```

### Filtro por estrelas (range)

```js
{ range: { path: 'stars', gte: 3.5, lte: 5.0 } }
```

### Busca geoespacial (geoWithin)

```js
{
  geoWithin: {
    circle: {
      center: { type: 'Point', coordinates: [lng, lat] },
      radius: distanceKm * 1609.34
    },
    path: 'location'
  }
}
```

### Function Score (sponsored boost)

```js
{
  compound: {
    must: [...mustClauses],
    score: {
      function: {
        multiply: [
          { score: 'relevance' },
          { constant: { value: 5 } }
        ]
      }
    }
  }
}
```

### Facets com $searchMeta

```js
{
  $searchMeta: {
    index: 'facets',
    facet: {
      operator: { compound: { must: [...], filter: [...] } },
      facets: {
        cuisineFacet: { type: 'string', path: 'cuisine', numBuckets: 20 },
        boroughFacet: { type: 'string', path: 'borough', numBuckets: 30 },
        starsFacet: { type: 'number', path: 'stars', boundaries: [1,2,3,4,5] }
      }
    }
  }
}
```

---

## 📦 Dataset

Os dados foram coletados e enriquecidos em duas etapas:

**1. Coleta via OpenStreetMap (Overpass API)**
- Script: `data/coletar_restaurantes.py`
- Dados reais: nome, endereço, coordenadas GPS, tipo de culinária
- Cobertura: município de São Paulo, amenities restaurant/cafe/bar/fast_food

**2. Enriquecimento mockado**
- Campo `menu`: array de pratos típicos por culinária (8-14 itens)
- Campo `stars`: distribuição triangular entre 2.5 e 5.0 (moda 4.2)
- Campo `reviews`: aleatório entre 10 e 5000
- Campo `price_range`: 1 a 4 ($ a $$$$)

**3. Correção de bairros (opcional)**
- Script: `data/corrigir_bairros.py` (não incluído no repo — contém credenciais)
- Usa Nominatim (OSM) para geocodificação reversa
- Taxa: 1 requisição/segundo (política de uso do Nominatim)
- Tempo estimado: ~30 minutos para 1490 restaurantes

---

## 🧩 Componentes do frontend

| Componente | Responsabilidade |
|---|---|
| `App.js` | Estado global, orquestração entre componentes |
| `useSearch.js` | Hook — gerencia busca, filtros, resultados, facets |
| `Header.js` | Barra de busca dupla (restaurante + comida), autocomplete, abas |
| `Sidebar.js` | Filtros geo, estrelas, cuisine, borough com queries inline |
| `MapView.js` | Mapa Leaflet, pins responsivos, fly-to, geo center marker |
| `RestaurantCard.js` | Card do resultado com score, highlight e modal de menu |
| `CodePanel.js` | Painel preto com query `$search` em tempo real |
| `TabPages.js` | Abas educativas: Synonyms, Function Score, Data & Indexes |
| `api.js` | Funções de fetch para o backend |

---

## ⚡ Decisões de UX para a demo

- **Painel de código em tempo real** — mostra a query `$search` exata enquanto o usuário filtra, tornando tangível o que o Atlas Search executa
- **Score badge** — cada card mostra o score de relevância, demonstrando como o ranking funciona
- **Emoji temático** — emoji flutuante aparece baseado no termo buscado (🍔 para burger, 🍜 para ramen)
- **Highlight no menu** — ao clicar em "Show Menu", os pratos que correspondem à busca são destacados em amarelo, incluindo sinônimos
- **Tooltip nos botões geo** — explica o que `near` e `geoWithin` fazem antes do usuário interagir
- **Reset pelo logo** — clicar no ícone do prato limpa todos os filtros e centraliza o mapa na Praça da Sé
