import { useState, useEffect, useRef } from 'react'
import { supabase } from './supabase'
import './App.css'

const PIPELINE_STAGES = [
  { key: 'scraped', label: 'Scraped', color: '#888' },
  { key: 'analyzed', label: 'Analyzed', color: '#2B6CB0' },
  { key: 'site_built', label: 'Site Built', color: '#38A169' },
  { key: 'emailed', label: 'Emailed', color: '#975A16' },
  { key: 'contacted', label: 'Contacted', color: '#805AD5' },
  { key: 'converted', label: 'Converted', color: '#22543D' },
]

// Convert extension lead format → Supabase row
function toRow(lead) {
  return {
    business_name: lead.businessName || lead.business_name || 'Unknown',
    business_type: lead.businessType || lead.business_type || '',
    industry: lead.industry || '',
    location: lead.location || '',
    status: lead.status || 'scraped',
    current_site_quality: lead.currentSiteQuality || lead.current_site_quality || '',
    contact: lead.contact || {},
    google_maps_data: lead.googleMapsData || lead.google_maps_data || {},
    reviews_data: lead.reviewsData || lead.reviews_data || null,
    scraped_data: lead.scrapedData || lead.scraped_data || null,
    gaps: lead.gaps || [],
    gap_summary: lead.gapSummary || lead.gap_summary || '',
    estimated_revenue_impact: lead.estimatedRevenueImpact || lead.estimated_revenue_impact || '',
    recommended_features: lead.recommendedFeatures || lead.recommended_features || [],
    lovable_prompt: lead.lovablePrompt || lead.lovable_prompt || '',
    email_subject: lead.emailSubject || lead.email_subject || '',
    email_body: lead.emailBody || lead.email_body || '',
  }
}

// Convert Supabase row → display format
function fromRow(row) {
  return {
    id: row.id,
    businessName: row.business_name,
    businessType: row.business_type,
    industry: row.industry,
    location: row.location,
    status: row.status,
    currentSiteQuality: row.current_site_quality,
    contact: row.contact || {},
    googleMapsData: row.google_maps_data || {},
    reviewsData: row.reviews_data,
    scrapedData: row.scraped_data,
    gaps: row.gaps || [],
    gapSummary: row.gap_summary,
    estimatedRevenueImpact: row.estimated_revenue_impact,
    recommendedFeatures: row.recommended_features || [],
    lovablePrompt: row.lovable_prompt,
    emailSubject: row.email_subject,
    emailBody: row.email_body,
    savedAt: row.saved_at,
  }
}

// ── Lead-specific Chat Widget ──
function ChatWidget({ lead }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Reset chat when lead changes
  useEffect(() => {
    setMessages([])
    setInput('')
    setLoading(false)
  }, [lead?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Focus input when opened
  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  async function sendMessage(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text || loading) return

    const userMsg = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          lead,
        }),
      })

      const data = await res.json()
      if (data.error) {
        setMessages([...newMessages, { role: 'assistant', content: `Error: ${data.error}` }])
      } else {
        setMessages([...newMessages, { role: 'assistant', content: data.text }])
      }
    } catch (err) {
      setMessages([...newMessages, { role: 'assistant', content: `Failed to connect: ${err.message}` }])
    }
    setLoading(false)
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        className={`chat-fab ${open ? 'chat-fab-open' : ''}`}
        onClick={() => setOpen(!open)}
        title={`Chat about ${lead.businessName}`}
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        )}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div className="chat-panel-title">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <span>{lead.businessName}</span>
            </div>
            <button className="chat-panel-close" onClick={() => setOpen(false)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>

          <div className="chat-messages">
            {messages.length === 0 && (
              <div className="chat-empty">
                <p className="chat-empty-title">Ask me about {lead.businessName}</p>
                <p className="chat-empty-sub">I know their gaps, reviews, the Lovable prompt, and the draft email. Ask me anything.</p>
                <div className="chat-suggestions">
                  <button onClick={() => { setInput('Is the Lovable prompt accurate for this business?'); }}>Review the Lovable prompt</button>
                  <button onClick={() => { setInput('How can I improve the outreach email?'); }}>Improve the email</button>
                  <button onClick={() => { setInput('What should I know before calling them?'); }}>Prep me for a call</button>
                </div>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg ${msg.role}`}>
                <div className="chat-msg-bubble">
                  {msg.content.split('\n').map((line, j) => (
                    <span key={j}>{line}{j < msg.content.split('\n').length - 1 && <br/>}</span>
                  ))}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-msg assistant">
                <div className="chat-msg-bubble chat-typing">
                  <span className="dot"></span><span className="dot"></span><span className="dot"></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form className="chat-input-bar" onSubmit={sendMessage}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask about this lead..."
              disabled={loading}
            />
            <button type="submit" disabled={!input.trim() || loading}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </form>
        </div>
      )}
    </>
  )
}

function App() {
  const [leads, setLeads] = useState([])
  const [selectedLead, setSelectedLead] = useState(null)
  const [view, setView] = useState('pipeline')
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [importText, setImportText] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load leads from Supabase on mount
  useEffect(() => {
    loadLeads()

    // Also check localStorage for extension injections and migrate to Supabase
    const onStorage = () => migrateFromLocalStorage()
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  async function loadLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('saved_at', { ascending: false })

    if (!error && data) {
      setLeads(data.map(fromRow))
    }
    setLoading(false)
  }

  // Migrate leads from localStorage (extension injection) to Supabase
  async function migrateFromLocalStorage() {
    const saved = localStorage.getItem('sitescout_leads')
    if (!saved) return

    try {
      const localLeads = JSON.parse(saved)
      if (!Array.isArray(localLeads) || localLeads.length === 0) return

      // Get existing business names from Supabase
      const { data: existing } = await supabase
        .from('leads')
        .select('business_name')

      const existingNames = new Set((existing || []).map(l => l.business_name?.toLowerCase()))

      // Only insert new leads
      const newLeads = localLeads
        .filter(l => {
          const name = (l.businessName || l.business_name || '').toLowerCase()
          return name && !existingNames.has(name)
        })
        .map(toRow)

      if (newLeads.length > 0) {
        await supabase.from('leads').insert(newLeads)
      }

      // Update existing leads with newer data
      for (const lead of localLeads) {
        const name = (lead.businessName || lead.business_name || '').toLowerCase()
        if (existingNames.has(name)) {
          const row = toRow(lead)
          // Only update if we have new data (like lovable_prompt)
          if (row.lovable_prompt || row.gap_summary || row.gaps?.length > 0) {
            await supabase
              .from('leads')
              .update(row)
              .ilike('business_name', name)
          }
        }
      }

      // Clear localStorage after migration
      localStorage.removeItem('sitescout_leads')

      // Reload from Supabase
      await loadLeads()
    } catch {
      // Silent fail
    }
  }

  // Import leads from extension (paste JSON)
  async function handleImport() {
    try {
      const parsed = JSON.parse(importText)
      const newLeads = (Array.isArray(parsed) ? parsed : [parsed]).map(toRow)

      // Get existing names
      const { data: existing } = await supabase
        .from('leads')
        .select('business_name')

      const existingNames = new Set((existing || []).map(l => l.business_name?.toLowerCase()))
      const unique = newLeads.filter(l => !existingNames.has(l.business_name?.toLowerCase()))

      if (unique.length > 0) {
        await supabase.from('leads').insert(unique)
      }

      setImportText('')
      setShowImport(false)
      await loadLeads()
    } catch {
      alert('Invalid JSON — use "Copy All as JSON" button in the extension')
    }
  }

  // Update lead status
  async function updateStatus(leadId, newStatus) {
    await supabase
      .from('leads')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', leadId)

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

  if (loading) {
    return (
      <div className="app">
        <header className="header">
          <div className="header-left">
            <h1>SiteScout</h1>
            <span className="header-sub">by Create & Source</span>
          </div>
        </header>
        <div className="main">
          <div className="empty-state">
            <p>Loading...</p>
          </div>
        </div>
      </div>
    )
  }

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
            <p>In the extension popup, go to Leads tab and click <strong>"Copy All as JSON"</strong>, then paste below. Or click <strong>"Send to CRM"</strong> in the extension to auto-import.</p>
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
                    <td className="td-name" data-label="Business">{lead.businessName || 'Unknown'}</td>
                    <td data-label="Industry">{lead.businessType || lead.industry || ''}</td>
                    <td data-label="Site Quality">
                      <span className={`site-quality ${lead.currentSiteQuality || 'none'}`}>
                        {lead.currentSiteQuality || 'unknown'}
                      </span>
                    </td>
                    <td data-label="Rating">{lead.googleMapsData?.rating || '—'}</td>
                    <td data-label="Phone">{lead.contact?.phone || '—'}</td>
                    <td data-label="Status">
                      <span className={`status-badge ${lead.status}`}>{lead.status}</span>
                    </td>
                    <td data-label="Gaps">{lead.gaps?.length || 0} gaps</td>
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

        {/* Chat Widget — only on lead detail */}
        {selectedLead && <ChatWidget lead={selectedLead} />}

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
