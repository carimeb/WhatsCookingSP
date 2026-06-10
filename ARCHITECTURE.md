# 🏗️ Architecture & Development Guide

Este documento descreve as decisões técnicas, o fluxo de dados e os detalhes de implementação do **WhatsCooking SP**, uma demo do MongoDB Atlas Search estilo Yelp para São Paulo.

Ideal para reproduzir o projeto do zero usando desenvolvimento guiado por especificação (SDD).

---

## 🎯 Contexto e objetivo

A demo foi construída para apresentar o **MongoDB Atlas Search** a clientes que utilizam Elasticsearch e estão insatisfeitos com performance e custo. O objetivo é mostrar, de forma visual e interativa, que todos os operadores de busca que o cliente já usa no Elastic têm equivalente no Atlas Search, em muitos casos com configuração mais simples.

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
  ],
  "sponsored": true,
  "sponsored_boost": 5
}
```

> Os campos `sponsored` e `sponsored_boost` existem apenas nos restaurantes marcados pelo script `marcar_patrocinados.js` (15 documentos). Nos demais, são ausentes.

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

O frontend React não pode conectar diretamente ao MongoDB Atlas por segurança: a connection string ficaria exposta no navegador. O backend Node.js age como camada intermediária que:
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
| `autocomplete` | Sugestões em tempo real | Requer tipo `autocomplete` com `edgeGram`, incompatível com `string` no mesmo índice |
| `facets` | Contagens dinâmicas dos filtros | Usa tipos `token` e `number` para facetar (os antigos `stringFacet`/`numberFacet` foram deprecados), consultado via `$searchMeta` |

### Por que `name` é multi-field (portuguese + standard)?

O `lucene.portuguese` faz stemming agressivo: remove sufixos para encontrar a raiz da palavra. Isso é ótimo para palavras portuguesas (`description`, `borough`), mas quebra:
- **Palavras estrangeiras** como "sushi", "ramen", "burger": o stemmer português não sabe lidar com elas
- **Buscas fuzzy em palavras portuguesas**: o fuzzy compara o termo digitado contra a versão *stemada* no índice. Por exemplo, "choperia" pode ser stemada para "chop", então buscar "choparia" (que stema para outra coisa) não casa.

A solução foi indexar o campo `name` **duas vezes**:

```json
"name": {
  "type": "string",
  "analyzer": "lucene.portuguese",
  "multi": {
    "standard": {
      "type": "string",
      "analyzer": "lucene.standard"
    }
  }
}
```

No backend, a busca por nome usa `compound.should` com os dois caminhos (`name` e `name.standard`), garantindo que palavras portuguesas (via stemming) e estrangeiras (via standard) sejam encontradas.

### Por que `lucene.standard` no campo `menu`?

Mesma motivação acima: o menu contém muitos pratos estrangeiros ("ramen", "burger", "fettuccine"). `lucene.standard` evita o stemming agressivo e mantém fuzzy match preciso para esses termos.

### Por que `token` em `cuisine` e `borough`?

O operador `equals` do Atlas Search requer que o campo esteja indexado como `token` (match exato, case-sensitive). Sem isso, o filtro por bairro usaria `text` que faz match parcial: "Vila Mariana" faria match com "Vila Madalena" por compartilharem o token "Vila".

### Por que `sponsored_boost` precisa estar no índice?

O operador de function score com `path` lê o valor numérico diretamente do índice Lucene, não do documento em disco. Por isso o índice `default` mapeia explicitamente:

```json
"sponsored_boost": { "type": "number" }
```

Sem esse mapeamento, o boost falha silenciosamente: a query executa, mas todos os documentos caem no fallback `undefined: 1` e nada muda no ranking.

### Por que o índice `facets` espelha os mapeamentos do `default`?

O backend usa as mesmas cláusulas de busca (`buildNameClause`, `buildFoodClause`) tanto em `/api/restaurants` (índice `default`) quanto em `/api/facets` (índice `facets`). Cláusulas idênticas executadas contra mapeamentos diferentes produzem matches diferentes: numa versão anterior, o índice `facets` não tinha o multi-field `name.standard`, e buscas fuzzy como "pizaria" retornavam 73 resultados com contagem de 71 nos facets (os 2 documentos que só casavam via `name.standard` escapavam da contagem).

A regra geral: **índices que compartilham cláusulas precisam compartilhar mapeamentos**. Por isso o `facets` replica do `default` o multi-field em `name`, os analyzers de `cuisine`/`borough` e o bloco `synonyms` (sinônimos são configurados por índice).

### Nota sobre a depreciação de `stringFacet` e `numberFacet`

O Atlas deprecou os tipos dedicados de facet. Os tipos normais absorveram a função: `token` agora serve para facetar, ordenar e fazer match exato (`equals`, `in`, `range`), e `number` serve para facetar e para `range`. A sintaxe da query no `$searchMeta` não muda (o facet continua declarando `type: 'string'` ou `type: 'number'`); apenas o tipo do campo na definição do índice. As definições completas dos 3 índices estão na aba "Data & Indexes" do app.

### Por que `fuzzy` e `synonyms` não podem coexistir?

É uma limitação do Atlas Search: o mesmo operador `text` não aceita os dois simultaneamente. A solução foi usar um `compound` com `should`:
- Um `text` com `synonyms: "MenuSynonyms"` para encontrar sinônimos
- Um `text` com `fuzzy` para tolerar erros de digitação
- `minimumShouldMatch: 1`: basta um dos dois encontrar resultado

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

### Fonte única para o painel de código

O campo `queryDisplay` retornado pelos endpoints não é uma representação reconstruída da query: é o **próprio stage executado** (`$searchStage` na busca principal, `pipeline[0]` no autocomplete e nos facets). Isso torna estruturalmente impossível o painel divergir do que o Atlas Search realmente recebeu, incluindo `index`, `highlight` e o bloco de function score. Versões anteriores montavam o display em paralelo (função `buildQueryDisplay`), o que permitia drift entre exibição e execução.

```

---

## 🔍 Implementação dos operadores principais

### Busca por nome (fuzzy com multi-field)

```js
{
  compound: {
    should: [
      // versão com stemming português (matches semânticos: "pizzaria"→"pizza")
      { text: { query: q, path: 'name', fuzzy: { maxEdits: 2, maxExpansions: 50 } } },
      // versão sem stemming (fuzzy preciso: "choparia"→"choperia", "suxi"→"sushi")
      { text: { query: q, path: 'name.standard', fuzzy: { maxEdits: 2, maxExpansions: 50 } } },
      // busca também em borough com tolerância menor
      { text: { query: q, path: 'borough', fuzzy: { maxEdits: 1 } } }
    ],
    minimumShouldMatch: 1
  }
}
```

A busca em `name.standard` é o que permite fuzzy funcionar para palavras como "choparia" (sem o standard, o stemmer português transforma "choperia" indexada em um token irreconhecível pelo fuzzy).

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

### Autocomplete (com fuzzy)

```js
{
  $search: {
    index: 'autocomplete',
    compound: {
      should: [
        { autocomplete: { query: q, path: 'name', fuzzy: { maxEdits: 1, prefixLength: 1 }, score: { boost: { value: 3 } } } },
        { autocomplete: { query: q, path: 'cuisine', fuzzy: { maxEdits: 1, prefixLength: 1 } } },
        { autocomplete: { query: q, path: 'borough', fuzzy: { maxEdits: 1, prefixLength: 1 } } }
      ]
    }
  }
}
```

O `fuzzy: { maxEdits: 1 }` no autocomplete permite que erros simples de digitação ("choparia" → "Choperia") apareçam nas sugestões. O `prefixLength: 1` garante que a primeira letra precisa bater exata, evitando ruído.

> ⚠️ **Limitação do Atlas:** `maxEdits` no autocomplete é máximo 1 (diferente da busca normal que aceita 2). Para erros maiores, o frontend mostra uma mensagem de fallback no dropdown vazio incentivando o usuário a usar "Find" e cair na busca completa (que aceita `maxEdits: 2`).

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
          { path: { value: 'sponsored_boost', undefined: 1 } }
        ]
      }
    }
  }
}
```

O score de relevância (BM25) é multiplicado pelo valor do campo `sponsored_boost` do próprio documento. Documentos sem o campo caem no fallback `undefined: 1` e mantêm o score original. Isso garante duas propriedades importantes para a demo:

1. **O ranking muda de verdade**: apenas os documentos patrocinados sobem. Uma versão anterior usava `constant: { value: 5 }`, que multiplicava todos os scores igualmente e, portanto, não alterava ordem nenhuma.
2. **Relevância é preservada**: o boost é proporcional. Um patrocinado pouco relevante ainda pode perder de um orgânico muito relevante, o que protege a experiência de busca.

**Requisitos para funcionar:**
- O campo `sponsored_boost` precisa estar mapeado como `number` no índice `default`
- Os documentos patrocinados são marcados pelo script `whatscooking-backend/scripts/marcar_patrocinados.js`, que grava `sponsored: true` (flag usada pelo frontend para exibir o badge SPONSORED) e `sponsored_boost: 5` em 15 restaurantes. O script é idempotente e determinístico (mesma amostra em qualquer clone do repo)
- O `$project` da busca retorna o campo `sponsored`, e o frontend só exibe o badge em documentos que realmente o possuem (`sponsored={sponsored && !!r.sponsored}` no `App.js`)

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

**3. Marcação de patrocinados**
- Script: `whatscooking-backend/scripts/marcar_patrocinados.js`
- Grava `sponsored: true` e `sponsored_boost: 5` em 15 restaurantes
- Idempotente (limpa marcações anteriores) e determinístico (mesma amostra em qualquer clone)

---

## 🧩 Componentes do frontend

| Componente | Responsabilidade |
|---|---|
| `App.js` | Estado global, orquestração entre componentes |
| `useSearch.js` | Hook que gerencia busca, filtros, resultados, facets |
| `Header.js` | Barra de busca dupla (restaurante + comida), autocomplete, abas |
| `Sidebar.js` | Filtros geo, estrelas, cuisine, borough com queries inline |
| `MapView.js` | Mapa Leaflet, pins responsivos, fly-to, geo center marker |
| `RestaurantCard.js` | Card do resultado com score, highlight e modal de menu |
| `CodePanel.js` | Painel preto com query `$search` em tempo real |
| `TabPages.js` | Abas educativas: Synonyms, Function Score, Data & Indexes |
| `api.js` | Funções de fetch para o backend |

---

## ⚡ Decisões de UX para a demo

- **Painel de código em tempo real**: exibe o stage `$search` exatamente como executado (mesma referência de objeto enviada ao driver), tornando tangível o que o Atlas Search recebe
- **Score badge**: cada card mostra o score de relevância, demonstrando como o ranking funciona
- **Emoji temático**: emoji flutuante aparece baseado no termo buscado (🍔 para burger, 🍜 para ramen)
- **Highlight no menu**: ao clicar em "Show Menu", os pratos que correspondem à busca são destacados em amarelo. O destaque usa os `highlights[]` retornados pelo próprio Atlas Search, então funciona consistentemente com buscas fuzzy (`"arros"` destaca `"arroz"`) e sinônimos (`"noodles"` destaca `"ramen"`)
- **Mensagem de fallback no autocomplete**: quando o autocomplete não retorna sugestões (ex: erro de digitação além do limite de 1 edição), o dropdown mostra uma mensagem clicável incentivando o usuário a executar a busca completa via "Find"
- **Tooltip nos botões geo**: explica o que `near` e `geoWithin` fazem antes do usuário interagir
- **Reset pelo logo**: clicar no ícone do prato limpa todos os filtros e centraliza o mapa na Praça da Sé
