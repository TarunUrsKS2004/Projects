# MongoDB Atlas Databases Viewer

A simple full-stack app that connects to MongoDB Atlas and lists all databases accessible via your connection string. Backend is Express; frontend is React + Vite + Tailwind.

## Setup

1. Create `.env` in the project root with:

```
MONGODB_URI=your_mongodb_atlas_connection_string
PORT=5000
```

2. Install dependencies (already done by the script):
```
npm i
```

## Run

- Start backend (port 5000):
```
npm run dev
```

- In a new terminal, start frontend (port 5173 by default):
```
npm run frontend
```

Visit http://localhost:5173. The frontend proxies API requests to http://localhost:5000 via Vite proxy.

## Build frontend
```
npm run build
```

## Notes
- Ensure your MongoDB user has permissions to list databases.
- Your connection string should include admin access to call `listDatabases`.


