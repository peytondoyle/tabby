import { useState } from 'react'

export function DevHealthPage() {
  const [response, setResponse] = useState<string>('')
  const [loading, setLoading] = useState(false)

  const pingHealthCheck = async () => {
    setLoading(true)
    setResponse('')
    
    try {
      const API_BASE = import.meta.env.VITE_API_BASE || ''
      const url = `${API_BASE}/api/scan-receipt?health=1`
      
      const res = await fetch(url)
      const data = await res.json()
      
      setResponse(JSON.stringify(data, null, 2))
    } catch (error) {
      setResponse(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">API Health Check</h1>
      
      <button 
        onClick={pingHealthCheck}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded mb-4"
      >
        {loading ? 'Pinging...' : 'Ping /api/scan-receipt?health=1'}
      </button>
      
      {response && (
        <div className="mt-4">
          <h2 className="text-lg font-semibold mb-2">Response:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
            {response}
          </pre>
        </div>
      )}
    </div>
  )
}