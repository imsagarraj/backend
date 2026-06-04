import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { listAgents, updateAgent } from '../lib/api'

export default function Agents() {
  const navigate = useNavigate()
  const { signOut } = useAdminAuth()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listAgents()
      .then(setAgents)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(agentId, data) {
    setSaving(true)
    try {
      await updateAgent(agentId, data)
      const fresh = await listAgents()
      setAgents(fresh)
      setEditing(null)
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const navLinkStyle = {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    fontSize: '0.875rem',
    padding: '4px 0',
    cursor: 'pointer',
  }

  const cardStyle = {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 12,
    padding: 24,
  }

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ fontSize: '1.5rem' }}>AI Agents</h1>
        <button style={{ ...navLinkStyle, color: 'var(--danger)' }} onClick={signOut}>
          Sign out
        </button>
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 32, borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        <button style={navLinkStyle} onClick={() => navigate('/')}>Dashboard</button>
        <button style={navLinkStyle} onClick={() => navigate('/businesses')}>Businesses</button>
        <button style={navLinkStyle} onClick={() => navigate('/pipeline')}>Pipeline</button>
        <span style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '0.875rem' }}>AI Agents</span>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-secondary)' }}>Loading agents...</p>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {agents.map(agent => (
            <div key={agent.id} style={cardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: '1.125rem' }}>{agent.agent_name}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {agent.personality_description}
                  </p>
                </div>
                <span style={{
                  fontSize: '0.7rem',
                  padding: '3px 8px',
                  borderRadius: 6,
                  background: agent.is_active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.1)',
                  color: agent.is_active ? 'var(--success)' : 'var(--danger)',
                }}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {editing === agent.id ? (
                <EditForm
                  agent={agent}
                  saving={saving}
                  onSave={(data) => handleSave(agent.id, data)}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>System Prompt</div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      padding: 12,
                      borderRadius: 8,
                      maxHeight: 120,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      lineHeight: 1.5,
                    }}>
                      {agent.system_prompt?.slice(0, 500)}
                      {(agent.system_prompt?.length || 0) > 500 ? '...' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Tags: {agent.tone_tags || 'none'}
                  </div>
                  <button
                    onClick={() => setEditing(agent.id)}
                    style={{
                      marginTop: 12,
                      background: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 14px',
                      borderRadius: 8,
                      fontSize: '0.8rem',
                      fontWeight: 600,
                    }}
                  >
                    Edit Agent
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EditForm({ agent, saving, onSave, onCancel }) {
  const [name, setName] = useState(agent.agent_name || '')
  const [description, setDescription] = useState(agent.personality_description || '')
  const [prompt, setPrompt] = useState(agent.system_prompt || '')
  const [tags, setTags] = useState(agent.tone_tags || '')
  const [active, setActive] = useState(agent.is_active ?? true)

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--text-primary)',
    fontSize: '0.875rem',
    outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Name</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Tags</label>
          <input style={inputStyle} value={tags} onChange={e => setTags(e.target.value)} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Personality Description</label>
        <input style={inputStyle} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>System Prompt</label>
        <textarea
          style={{ ...inputStyle, minHeight: 150, resize: 'vertical' }}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
        />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
        <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Active</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => onSave({ agent_name: name, personality_description: description, system_prompt: prompt, tone_tags: tags, is_active: active })}
          disabled={saving}
          style={{
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: '0.875rem',
            fontWeight: 600,
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={onCancel}
          style={{
            background: 'transparent',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border)',
            padding: '8px 16px',
            borderRadius: 8,
            fontSize: '0.875rem',
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
