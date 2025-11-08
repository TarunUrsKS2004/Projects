import { useEffect, useState } from 'react'

function App() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [databases, setDatabases] = useState([])
  const [query, setQuery] = useState('')
  const [selectedDb, setSelectedDb] = useState('')
  const [collections, setCollections] = useState([])
  const [collectionsLoading, setCollectionsLoading] = useState(false)
  const [collectionsError, setCollectionsError] = useState('')

  const [selectedCollection, setSelectedCollection] = useState('')
  const [docsLimit, setDocsLimit] = useState(50)
  const [docs, setDocs] = useState([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [docsError, setDocsError] = useState('')

  useEffect(() => {
    async function fetchDatabases() {
      setLoading(true)
      setError('')
      try {
        const res = await fetch('/api/databases')
        const data = await res.json()
        if (!data.ok) {
          throw new Error(data.error || 'Failed to fetch databases')
        }
        setDatabases(data.databases || [])
      } catch (err) {
        setError(err.message || 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    fetchDatabases()
  }, [])

  const filtered = query
    ? databases.filter((d) => d.name.toLowerCase().includes(query.toLowerCase()))
    : databases

  async function openDatabase(name) {
    setSelectedDb(name)
    setCollections([])
    setCollectionsError('')
    setSelectedCollection('')
    setDocs([])
    setDocsError('')
    setCollectionsLoading(true)
    try {
      const res = await fetch(`/api/databases/${encodeURIComponent(name)}/collections`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to fetch collections')
      setCollections(data.collections || [])
    } catch (e) {
      setCollectionsError(e.message || 'Unknown error')
    } finally {
      setCollectionsLoading(false)
    }
  }

  async function openCollection(coll) {
    setSelectedCollection(coll)
    setDocs([])
    setDocsError('')
    setDocsLoading(true)
    try {
      const res = await fetch(`/api/databases/${encodeURIComponent(selectedDb)}/collections/${encodeURIComponent(coll)}/documents?limit=${docsLimit}`)
      const data = await res.json()
      if (!data.ok) throw new Error(data.error || 'Failed to fetch documents')
      setDocs(data.documents || [])
    } catch (e) {
      setDocsError(e.message || 'Unknown error')
    } finally {
      setDocsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">MongoDB Atlas Databases</h1>
          <p className="text-sm text-gray-500">Lists all databases accessible by your connection string.</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-300 border-t-indigo-600" />
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        )}

        {!loading && !error && (
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-gray-800">Databases</h2>
                <span className="text-sm text-gray-500">{filtered.length} shown</span>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search databases..."
                className="w-full max-w-sm rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            {filtered.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
                No databases match your search.
              </div>
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((db) => (
                  <li key={db.name} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition-shadow">
                    <button onClick={() => openDatabase(db.name)} className="w-full text-left">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-medium text-gray-900">{db.name}</p>
                          {typeof db.sizeOnDisk === 'number' && (
                            <p className="text-sm text-gray-500">Size on disk: {(db.sizeOnDisk / (1024 * 1024)).toFixed(2)} MB</p>
                          )}
                        </div>
                        {db.empty ? (
                          <span className="rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">Empty</span>
                        ) : (
                          <span className="rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">Active</span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {selectedDb && (
              <div className="mt-8">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-800">Collections in {selectedDb}</h3>
                  <button onClick={() => { setSelectedDb(''); setCollections([]); setCollectionsError(''); setSelectedCollection(''); setDocs([]); setDocsError('') }} className="text-sm text-indigo-600 hover:underline">Clear</button>
                </div>
                {collectionsLoading && (
                  <div className="flex items-center gap-2 text-sm text-gray-600"><span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-indigo-600" /> Loading collections...</div>
                )}
                {collectionsError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 text-sm">{collectionsError}</div>
                )}
                {!collectionsLoading && !collectionsError && (
                  <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {collections.map((c) => (
                      <li key={c.name}>
                        <button onClick={() => openCollection(c.name)} className={`w-full rounded border px-3 py-2 text-left text-sm ${selectedCollection === c.name ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 bg-white'} hover:border-indigo-300`}>
                          {c.name}
                        </button>
                      </li>
                    ))}
                    {collections.length === 0 && (
                      <li className="rounded border border-gray-200 bg-white p-3 text-sm text-gray-500">No collections found.</li>
                    )}
                  </ul>
                )}

                {selectedCollection && (
                  <div className="mt-6">
                    <div className="mb-3 flex items-center justify-between">
                      <h4 className="text-base font-semibold text-gray-800">Documents in {selectedCollection}</h4>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600" htmlFor="limit">Limit</label>
                        <select id="limit" value={docsLimit} onChange={(e) => setDocsLimit(parseInt(e.target.value, 10))} className="rounded border border-gray-300 bg-white px-2 py-1 text-sm">
                          {[10,25,50,100,200].map(n => <option key={n} value={n}>{n}</option>)}
                        </select>
                        <button onClick={() => openCollection(selectedCollection)} className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700">Reload</button>
                      </div>
                    </div>
                    {docsLoading && <div className="text-sm text-gray-600">Loading documents...</div>}
                    {docsError && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{docsError}</div>}
                    {!docsLoading && !docsError && (
                      <div className="overflow-auto rounded border border-gray-200 bg-white p-3 text-sm">
                        {docs.length === 0 ? (
                          <div className="text-gray-500">No documents.</div>
                        ) : (
                          <pre className="whitespace-pre-wrap break-words text-gray-800">{JSON.stringify(docs, null, 2)}</pre>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="border-t bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-gray-500 sm:px-6 lg:px-8">
          Connected via backend at <code>/api</code>.
        </div>
      </footer>
    </div>
  )
}

export default App
