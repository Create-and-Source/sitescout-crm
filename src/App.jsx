import { useState, useEffect } from 'react'
import './App.css'

// ── Demo data (will be replaced by Supabase + extension sync) ──
const PIPELINE_STAGES = [
  { key: 'scraped', label: 'Scraped', color: '#888' },
  { key: 'analyzed', label: 'Analyzed', color: '#2B6CB0' },
  { key: 'site_built', label: 'Site Built', color: '#38A169' },
  { key: 'emailed', label: 'Emailed', color: '#975A16' },
  { key: 'contacted', label: 'Contacted', color: '#805AD5' },
  { key: 'converted', label: 'Converted', color: '#22543D' },
]

function App() {
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [view, setView] = useState('pipeline') // pipeline | list
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)

  // Load leads from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('sitescout_leads')
    if (saved) {
      try { setLeads(JSON.parse(saved)) } catch {}
    }
  }, [])

  // Save leads to localStorage on change
  useEffect(() => {
    if (leads.length > 0) {
      localStorage.setItem('sitescout_leads', JSON.stringify(leads))
    }
  }, [leads])

  // Import leads from extension (paste JSON)
  function handleImport() {
    try {
      const parsed = JSON.parse(importText)
      const newLeads = Array.isArray(parsed) ? parsed : [parsed]
      setLeads(prev => {
        const existing = new Set(prev.map(l => l.businessName?.toLowerCase()))
        const unique = newLeads.filter(l => !existing.has(l.businessName?.toLowerCase()))
        return [...unique, ...prev]
      })
      setImportText('')
      setShowImport(false)
    } catch {
      alert('Invalid JSON — copy leads from the extension')
    }
  }

  // Update lead status
  function updateStatus(leadId, newStatus) {
    setLeads(prev => prev.map(l =>
      l.id === leadId ? { ...l, status: newStatus } : l
    ))
    if (selectedLead?.id === leadId) {
      setSelectedLead(prev => ({ ...prev, status: newStatus }))
    }
  }

  // Copy to clipboard
  async function copyText(text, type) {
    await navigator.clipboard.writeText(text)
    if (type === 'prompt') {
      setCopiedPrompt(true)
      setTimeout(() => setCopiedPrompt(false), 2000)
    } else {
      setCopiedEmail(true)
      setTimeout(() => setCopiedEmail(false), 2000)
    }
  }

  // Group leads by status for pipeline
  const pipeline = PIPELINE_STAGES.map(stage => ({
    ...stage,
    leads: leads.filter(l => l.status === stage.key),
  }))

  return (
    <div className="app">
      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <h1>SiteScout</h1>
          <span className="header-sub">by Create & Source</span>
        </div>
        <div className="header-right">
          <div className="header-stats">
            <span className="stat">{leads.length} leads</span>
            <span className="stat">{leads.filter(l => l.status === 'analyzed').length} analyzed</span>
            <span className="stat">{leads.filter(l => l.status === 'converted').length} converted</span>
          </div>
          <div className="header-actions">
            <button
              className={`view-btn ${view === 'pipeline' ? 'active' : ''}`}
              onClick={() => setView('pipeline')}
            >Pipeline</button>
            <button
              className={`view-btn ${view === 'list' ? 'active' : ''}`}
              onClick={() => setView('list')}
            >List</button>
            <button className="import-btn" onClick={() => setShowImport(!showImport)}>
              Import from Extension
            </button>
          </div>
        </div>
      </header>

      {/* ── Import Modal ── */}
      {showImport && (
        <div className="import-modal">
          <div className="import-content">
            <h3>Import Leads from Extension</h3>
            <p>Open the extension popup → Leads tab → right-click → Inspect → Console → type: <code>chrome.storage.local.get(['leads'], r =&gt; copy(r.leads))</code> → paste below</p>
            <textarea
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder='Paste leads JSON here...'
              rows={8}
            />
            <div className="import-actions">
              <button className="btn-primary" onClick={handleImport}>Import</button>
              <button className="btn-secondary" onClick={() => setShowImport(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="main">
        {/* ── Pipeline View ── */}
        {view === 'pipeline' && !selectedLead && (
          <div className="pipeline">
            {pipeline.map(stage => (
              <div key={stage.key} className="pipeline-column">
                <div className="pipeline-header">
                  <span className="pipeline-dot" style={{ background: stage.color }}></span>
                  <span className="pipeline-title">{stage.label}</span>
                  <span className="pipeline-count">{stage.leads.length}</span>
                </div>
                <div className="pipeline-cards">
                  {stage.leads.map(lead => (
                    <div
                      key={lead.id}
                      className="lead-card"
                      onClick={() => setSelectedLead(lead)}
                    >
                      <div className="lead-card-name">{lead.businessName || 'Unknown'}</div>
                      <div className="lead-card-type">{lead.businessType || lead.industry || ''}</div>
                      {lead.googleMapsData?.rating > 0 && (
                        <div className="lead-card-rating">
                          {lead.googleMapsData.rating}/5 ({lead.googleMapsData.reviews} reviews)
                        </div>
                      )}
                      {lead.gaps?.length > 0 && (
                        <div className="lead-card-gaps">
                          {lead.gaps.slice(0, 2).map((g, i) => (
                            <span key={i} className={`gap-tag ${g.impact}`}>{g.gap}</span>
                          ))}
                        </div>
                      )}
                      {lead.currentSiteQuality && (
                        <div className={`site-quality ${lead.currentSiteQuality}`}>
                          Site: {lead.currentSiteQuality}
                        </div>
                      )}
                    </div>
                  ))}
                  {stage.leads.length === 0 && (
                    <div className="pipeline-empty">No leads</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── List View ── */}
        {view === 'list' && !selectedLead && (
          <div className="list-view">
            <table className="leads-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Industry</th>
                  <th>Site Quality</th>
                  <th>Rating</th>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Gaps</th>
                </tr>
              </thead>
              <tbody>
                {leads.map(lead => (
                  <tr key={lead.id} onClick={() => setSelectedLead(lead)}>
                    <td className="td-name">{lead.businessName || 'Unknown'}</td>
                    <td>{lead.businessType || lead.industry || ''}</td>
                    <td>
                      <span className={`site-quality ${lead.currentSiteQuality || 'none'}`}>
                        {lead.currentSiteQuality || 'unknown'}
                      </span>
                    </td>
                    <td>{lead.googleMapsData?.rating || '—'}</td>
                    <td>{lead.contact?.phone || '—'}</td>
                    <td>
                      <span className={`status-badge ${lead.status}`}>{lead.status}</span>
                    </td>
                    <td>{lead.gaps?.length || 0} gaps</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Lead Detail ── */}
        {selectedLead && (
          <div className="lead-detail">
            <button className="back-btn" onClick={() => setSelectedLead(null)}>
              &larr; Back to {view}
            </button>

            <div className="detail-header">
              <div>
                <h2>{selectedLead.businessName || 'Unknown'}</h2>
                <div className="detail-meta">
                  {selectedLead.businessType || selectedLead.industry || ''} &middot; {selectedLead.contact?.address || ''} &middot; {selectedLead.contact?.phone || ''}
                </div>
              </div>
              <div className="detail-status-group">
                <select
                  className="status-select"
                  value={selectedLead.status}
                  onChange={e => updateStatus(selectedLead.id, e.target.value)}
                >
                  {PIPELINE_STAGES.map(s => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Google Maps data */}
            {selectedLead.googleMapsData && (
              <div className="detail-section">
                <h3>Google Maps</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="detail-label">Rating</span>
                    <span className="detail-value">{selectedLead.googleMapsData.rating}/5 ({selectedLead.googleMapsData.reviews} reviews)</span>
                  </div>
                  {selectedLead.googleMapsData.unclaimed && (
                    <div className="detail-item">
                      <span className="detail-label">Listing</span>
                      <span className="detail-value red">UNCLAIMED</span>
                    </div>
                  )}
                  {selectedLead.contact?.website && (
                    <div className="detail-item">
                      <span className="detail-label">Website</span>
                      <a href={selectedLead.contact.website.startsWith('http') ? selectedLead.contact.website : `https://${selectedLead.contact.website}`} target="_blank" rel="noopener" className="detail-link">{selectedLead.contact.website}</a>
                    </div>
                  )}
                  {selectedLead.currentSiteQuality && (
                    <div className="detail-item">
                      <span className="detail-label">Site Quality</span>
                      <span className={`site-quality ${selectedLead.currentSiteQuality}`}>{selectedLead.currentSiteQuality}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Gap Analysis */}
            {selectedLead.gapSummary && (
              <div className="detail-section">
                <h3>Opportunity</h3>
                <p className="gap-summary">{selectedLead.gapSummary}</p>
                {selectedLead.estimatedRevenueImpact && (
                  <div className="revenue-impact">{selectedLead.estimatedRevenueImpact}</div>
                )}
              </div>
            )}

            {selectedLead.gaps?.length > 0 && (
              <div className="detail-section">
                <h3>Revenue Gaps</h3>
                <div className="gaps-list">
                  {selectedLead.gaps.map((gap, i) => (
                    <div key={i} className="gap-row">
                      <span className={`gap-dot ${gap.impact}`}></span>
                      <div>
                        <div className="gap-name">{gap.gap}</div>
                        <div className="gap-explain">{gap.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lovable Prompt */}
            {selectedLead.lovablePrompt && (
              <div className="detail-section">
                <h3>Lovable Prompt</h3>
                <div className="prompt-box">
                  <pre>{selectedLead.lovablePrompt}</pre>
                </div>
                <button
                  className="btn-primary copy-btn"
                  onClick={() => copyText(selectedLead.lovablePrompt, 'prompt')}
                >
                  {copiedPrompt ? 'Copied!' : 'Copy Prompt'}
                </button>
                <a
                  href="https://lovable.dev/projects"
                  target="_blank"
                  rel="noopener"
                  className="btn-secondary lovable-link"
                >
                  Open Lovable
                </a>
              </div>
            )}

            {/* Draft Email */}
            {selectedLead.emailBody && (
              <div className="detail-section">
                <h3>Draft Outreach Email</h3>
                <div className="email-notice">This is a draft. It will NOT be sent without your approval.</div>
                {selectedLead.emailSubject && (
                  <div className="email-subject">Subject: {selectedLead.emailSubject}</div>
                )}
                <div className="prompt-box">
                  <pre>{selectedLead.emailBody}</pre>
                </div>
                <button
                  className="btn-primary copy-btn"
                  onClick={() => copyText(
                    `Subject: ${selectedLead.emailSubject || ''}\n\n${selectedLead.emailBody}`,
                    'email'
                  )}
                >
                  {copiedEmail ? 'Copied!' : 'Copy Email Draft'}
                </button>
              </div>
            )}

            {/* Reviews */}
            {selectedLead.reviewsData?.reviews?.length > 0 && (
              <div className="detail-section">
                <h3>Customer Reviews</h3>
                {selectedLead.reviewsData.topics?.length > 0 && (
                  <div className="review-topics">
                    {selectedLead.reviewsData.topics.map((t, i) => (
                      <span key={i} className="topic-tag">{t.keyword} ({t.mentions})</span>
                    ))}
                  </div>
                )}
                <div className="reviews-list">
                  {selectedLead.reviewsData.reviews.slice(0, 5).map((r, i) => (
                    <div key={i} className="review-item">
                      <div className="review-rating">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</div>
                      <div className="review-text">{r.text}</div>
                      <div className="review-author">{r.author} &middot; {r.date}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Empty state */}
        {leads.length === 0 && !selectedLead && (
          <div className="empty-state">
            <h2>No leads yet</h2>
            <p>Run a hunt from the SiteScout Chrome extension, then import your leads here.</p>
            <button className="btn-primary" onClick={() => setShowImport(true)}>Import Leads</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
