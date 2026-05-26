require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { connect } = require('./src/db');
const { searchRestaurants, autocomplete, facets, getRestaurant } = require('./src/routes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/api/restaurants',    searchRestaurants);
app.get('/api/autocomplete',   autocomplete);
app.get('/api/facets',         facets);
app.get('/api/restaurant/:id', getRestaurant);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Backend rodando em http://localhost:${PORT}`);
      console.log(`   GET /api/restaurants?q=sushi&food=ramen&cuisine=Japonesa`);
      console.log(`   GET /api/autocomplete?q=texto`);
      console.log(`   GET /api/facets`);
      console.log(`   GET /api/restaurant/:id`);
    });
  })
  .catch((err) => {
    console.error('❌ Falha ao conectar no Atlas:', err.message);
    process.exit(1);
  });