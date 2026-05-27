const { getCollection } = require('./db');

function parseNumber(val, fallback) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/restaurants
// ─────────────────────────────────────────────────────────────────────────────
async function searchRestaurants(req, res) {
  try {
    const collection = await getCollection();
    const {
      q = '', food = '', cuisine = '', borough = '',
      min_stars, geo_mode = 'geoWithin',
      lat, lng, distance,
      highlight = 'false', sponsored = 'false',
      page = 1, limit = 20,
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    console.log('🔍 search params:', { q, food, cuisine, borough, min_stars, distance });
    const mustClauses = [];
    const filterClauses = [];
    const shouldClauses = [];

    // Restaurant name search — multi-field (portuguese + standard) para fuzzy robusto
    if (q.trim()) {
      mustClauses.push({
        compound: {
          should: [
            {
              text: {
                query: q,
                path: 'name',
                fuzzy: { maxEdits: 2, maxExpansions: 50 },
                score: { boost: { value: 2 } },
              },
            },
            {
              text: {
                query: q,
                path: 'name.standard',
                fuzzy: { maxEdits: 2, maxExpansions: 50 },
                score: { boost: { value: 2 } },
              },
            },
            {
              text: {
                query: q,
                path: 'borough',
                fuzzy: { maxEdits: 1 },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      });
    }

    // Food/menu search: compound with should — synonyms OR fuzzy (cannot mix both)
    if (food.trim()) {
      mustClauses.push({
        compound: {
          should: [
            {
              text: {
                query: food,
                path: 'menu',
                synonyms: 'MenuSynonyms',
              },
            },
            {
              text: {
                query: food,
                path: 'menu',
                fuzzy: { maxEdits: 1, maxExpansions: 50 },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      });
    }

    // Cuisine filter — uses equals with token type for exact matching
    if (cuisine) {
      const cuisines = cuisine.split(',').map(c => c.trim()).filter(Boolean);
      if (cuisines.length === 1) {
        filterClauses.push({ equals: { path: 'cuisine', value: cuisines[0] } });
      } else if (cuisines.length > 1) {
        // Multiple cuisines: OR via should
        filterClauses.push({
          compound: {
            should: cuisines.map(c => ({ equals: { path: 'cuisine', value: c } })),
            minimumShouldMatch: 1,
          },
        });
      }
    }

    // Borough filter — uses equals with token type for exact matching
    if (borough) {
      filterClauses.push({ equals: { path: 'borough', value: borough } });
    }

    // Stars filter — gte min_stars, lte 5.0 (max possible)
    if (min_stars) {
      const minVal = parseNumber(min_stars, 0);
      filterClauses.push({ range: { path: 'stars', gte: minVal, lte: 5.0 } });
    }

    // Geo filter
    if (lat && lng && distance) {
      const radiusMeters = parseNumber(distance, 1) * 1609.34;
      const center = { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] };
      if (geo_mode === 'near') {
        shouldClauses.push({ near: { origin: center, pivot: radiusMeters, path: 'location' } });
      } else {
        mustClauses.push({ geoWithin: { circle: { center, radius: radiusMeters }, path: 'location' } });
      }
    }

    // Build compound or fallback to exists
    const hasFilters = mustClauses.length || filterClauses.length || shouldClauses.length;
    const compound = hasFilters ? {
      ...(mustClauses.length && { must: mustClauses }),
      ...(filterClauses.length && { filter: filterClauses }),
      ...(shouldClauses.length && { should: shouldClauses }),
      ...(sponsored === 'true' && {
        score: { function: { multiply: [{ score: 'relevance' }, { constant: { value: 5 } }] } }
      }),
    } : null;

    const $searchStage = {
      $search: {
        index: 'default',
        ...(highlight === 'true' && { highlight: { path: ['name', 'cuisine', 'menu', 'borough'] } }),
        ...(compound ? { compound } : { exists: { path: 'name' } }),
      },
    };

    const pipeline = [
      $searchStage,
      {
        $project: {
          _id: 1, name: 1, cuisine: 1, borough: 1, description: 1,
          address: 1, location: 1, stars: 1, reviews: 1,
          price_range: 1, open_now: 1, phone: 1, website: 1, menu: 1,
          score: { $meta: 'searchScore' },
          ...(highlight === 'true' && { highlights: { $meta: 'searchHighlights' } }),
        },
      },
      { $skip: skip },
      { $limit: parseInt(limit) },
    ];

    const countPipeline = [$searchStage, { $count: 'total' }];
    const [results, countResult] = await Promise.all([
      collection.aggregate(pipeline).toArray(),
      collection.aggregate(countPipeline).toArray(),
    ]);

    const total = countResult[0]?.total ?? 0;

    // Build queryDisplay for frontend code panel
    const queryDisplay = buildQueryDisplay({ mustClauses, filterClauses, shouldClauses, sponsored });

    res.json({ results, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)), queryDisplay });
  } catch (err) {
    console.error('searchRestaurants error:', err);
    res.status(500).json({ error: err.message });
  }
}

function buildQueryDisplay({ mustClauses, filterClauses, shouldClauses, sponsored }) {
  const hasFilters = mustClauses.length || filterClauses.length || shouldClauses.length;
  if (!hasFilters) return { $search: { index: '< indexName >', exists: { path: 'name' } } };

  const compound = {
    ...(mustClauses.length && { must: mustClauses }),
    ...(filterClauses.length && { filter: filterClauses }),
    ...(shouldClauses.length && { should: shouldClauses }),
    ...(sponsored === 'true' && {
      score: { function: { multiply: [{ score: 'relevance' }, { constant: { value: 5 } }] } }
    }),
  };

  return {
    $search: {
      '// optional, defaults to "default"': '',
      'index': '< indexName >',
      compound,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/autocomplete?q=text
// ─────────────────────────────────────────────────────────────────────────────
async function autocomplete(req, res) {
  try {
    const collection = await getCollection();
    const { q = '' } = req.query;
    if (q.trim().length < 2) return res.json({ suggestions: [], queryDisplay: null });

    const pipeline = [
      {
        $search: {
          index: 'autocomplete',
          compound: {
           should: [
            { autocomplete: { query: q, path: 'name', fuzzy: { maxEdits: 1, prefixLength: 1 }, score: { boost: { value: 3 } } } },
            { autocomplete: { query: q, path: 'cuisine', fuzzy: { maxEdits: 1, prefixLength: 1 } } },
            { autocomplete: { query: q, path: 'borough', fuzzy: { maxEdits: 1, prefixLength: 1 } } },
           ],
          },
        },
      },
      { $limit: 8 },
      { $project: { _id: 1, name: 1, cuisine: 1, borough: 1, location: 1, address: 1, score: { $meta: 'searchScore' } } },
    ];

    const results = await collection.aggregate(pipeline).toArray();

    const queryDisplay = {
      $search: {
        index: 'autocomplete',
        autocomplete: { query: q, path: 'name', fuzzy: { maxEdits: 1 } },
      },
    };

    res.json({ suggestions: results, queryDisplay });
  } catch (err) {
    console.error('autocomplete error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/facets
// ─────────────────────────────────────────────────────────────────────────────
async function facets(req, res) {
  try {
    const collection = await getCollection();
    // Note: borough is intentionally excluded from facets query
    // so borough options remain visible after selection
    const { q = '', food = '', lat, lng, distance, min_stars } = req.query;

    const mustClauses = [];
    const filterClauses = [];

    if (q.trim()) mustClauses.push({ text: { query: q, path: 'name', fuzzy: { maxEdits: 2 } } });
    if (food.trim()) mustClauses.push({
      compound: {
        should: [
          { text: { query: food, path: 'menu', synonyms: 'MenuSynonyms' } },
          { text: { query: food, path: 'menu', fuzzy: { maxEdits: 1, maxExpansions: 50 } } },
        ],
        minimumShouldMatch: 1,
      },
    });
    if (min_stars) filterClauses.push({ range: { path: 'stars', gte: parseNumber(min_stars, 0) } });
    if (lat && lng && distance) {
      const radiusMeters = parseNumber(distance, 1) * 1609.34;
      mustClauses.push({
        geoWithin: {
          circle: { center: { type: 'Point', coordinates: [parseFloat(lng), parseFloat(lat)] }, radius: radiusMeters },
          path: 'location',
        },
      });
    }

    const hasFilters = mustClauses.length || filterClauses.length;
    const operator = hasFilters
      ? { compound: { ...(mustClauses.length && { must: mustClauses }), ...(filterClauses.length && { filter: filterClauses }) } }
      : { exists: { path: 'name' } };

    const pipeline = [{
      $searchMeta: {
        index: 'facets',
        facet: {
          operator,
          facets: {
            cuisineFacet: { type: 'string', path: 'cuisine', numBuckets: 20 },
            boroughFacet: { type: 'string', path: 'borough', numBuckets: 30 },
            starsFacet: { type: 'number', path: 'stars', boundaries: [1, 2, 3, 4, 5], default: 'other' },
            priceFacet: { type: 'number', path: 'price_range', boundaries: [1, 2, 3, 4, 5], default: 'other' },
          },
        },
      },
    }];

    const result = await collection.aggregate(pipeline).toArray();

    const queryDisplay = {
      $searchMeta: { index: 'facetIndex', facet: { operator, facets: { cuisineFacet: { type: 'string', path: 'cuisine' }, boroughFacet: { type: 'string', path: 'borough' } } } },
    };

    res.json({ ...(result[0] ?? {}), queryDisplay });
  } catch (err) {
    console.error('facets error:', err);
    res.status(500).json({ error: err.message });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/restaurant/:id
// ─────────────────────────────────────────────────────────────────────────────
async function getRestaurant(req, res) {
  try {
    const collection = await getCollection();
    const { ObjectId } = require('mongodb');
    const doc = await collection.findOne({ _id: new ObjectId(req.params.id) });
    if (!doc) return res.status(404).json({ error: 'Não encontrado' });
    res.json(doc);
  } catch (err) {
    console.error('getRestaurant error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { searchRestaurants, autocomplete, facets, getRestaurant };
