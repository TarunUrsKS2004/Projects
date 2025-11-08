const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const { getMongoClient } = require('./mongoClient');

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());

// API routes
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: 'API is running' });
});

app.get('/api/databases', async (req, res) => {
  try {
    const client = await getMongoClient();
    const adminDb = client.db().admin();
    const result = await adminDb.listDatabases();
    res.json({ ok: true, databases: result.databases || [] });
  } catch (error) {
    console.error('Error listing databases:', error);
    res.status(500).json({ ok: false, error: error && error.message ? error.message : 'Failed to list databases' });
  }
});

app.get('/api/databases/:name/collections', async (req, res) => {
  const name = req.params.name;
  try {
    const client = await getMongoClient();
    const db = client.db(name);
    const collections = await db.listCollections({}, { nameOnly: true }).toArray();
    res.json({ ok: true, collections: (collections || []).map(c => ({ name: c.name })) });
  } catch (error) {
    console.error('Error listing collections:', error);
    res.status(500).json({ ok: false, error: error && error.message ? error.message : 'Failed to list collections' });
  }
});

app.get('/api/databases/:name/collections/:coll/documents', async (req, res) => {
  const dbName = req.params.name;
  const coll = req.params.coll;
  const limit = Math.max(1, Math.min(parseInt(req.query.limit || '50', 10) || 50, 200));
  try {
    const client = await getMongoClient();
    const db = client.db(dbName);
    const docs = await db.collection(coll).find({}).limit(limit).toArray();
    res.json({ ok: true, documents: docs, limit });
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ ok: false, error: error && error.message ? error.message : 'Failed to fetch documents' });
  }
});

// Static website from built frontend
const distPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(distPath));
app.use((req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});


