import './App.css'

function App() {
  return (
    <main className="retired-app" aria-labelledby="retired-title">
      <section className="retired-panel">
        <p className="retired-kicker">Service retired</p>
        <h1 id="retired-title">Tabby is no longer available.</h1>
        <p className="retired-copy">
          Receipt scanning, bill links, uploads, and sharing have been shut down.
          Existing receipt URLs are no longer served.
        </p>
        <div className="retired-status" role="list" aria-label="Retirement status">
          <div role="listitem">
            <span>Scanning</span>
            <strong>Disabled</strong>
          </div>
          <div role="listitem">
            <span>Bill links</span>
            <strong>Retired</strong>
          </div>
          <div role="listitem">
            <span>Data changes</span>
            <strong>Blocked</strong>
          </div>
        </div>
      </section>
    </main>
  )
}

export default App
