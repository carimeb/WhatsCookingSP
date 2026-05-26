const { MongoClient } = require('mongodb');

let client;
let db;

async function connect() {
  if (db) return db;

  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db('whatscooking');
  console.log('✅ Connected to MongoDB Atlas');
  return db;
}

async function getCollection() {
  const database = await connect();
  return database.collection('restaurants');
}

module.exports = { connect, getCollection };
