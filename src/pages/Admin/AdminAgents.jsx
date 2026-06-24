import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAgents, updateAgent } from '../../lib/admin'
import styles from '../../components/AdminLayout/AdminLayout.module.css'

export default function AdminAgents() {
  const navigate = useNavigate()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    listAgents().then(setAgents).catch(console.error).finally(() => setLoading(false))
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

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>AI Agents</h1>
          <p className={styles.pageSubtitle}>Configure AI personalities for businesses</p>
        </div>
      </div>

      <div className={styles.tabBar}>
        <button className={styles.tab} onClick={() => navigate('/admin/dashboard')}>Dashboard</button>
        <button className={styles.tab} onClick={() => navigate('/admin/businesses')}>Businesses</button>
        <button className={styles.tab} onClick={() => navigate('/admin/pipeline')}>Pipeline</button>
        <button className={styles.tab} onClick={() => navigate('/admin/followups')}>Follow-ups</button>
        <span className={`${styles.tab} ${styles.tabActive}`}>AI Agents</span>
      </div>

      {loading ? (
        <p className={styles.emptyState}>Loading agents...</p>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {agents.map(agent => (
            <div key={agent.id} className={styles.agentCard}>
              <div className={styles.agentHeader}>
                <div>
                  <h3 className={styles.agentName}>{agent.agent_name}</h3>
                  <p className={styles.agentDescription}>{agent.personality_description}</p>
                </div>
                <span className={agent.is_active ? styles.badgeSuccess : styles.badgeDanger}>
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {editing === agent.id ? (
                <EditForm agent={agent} saving={saving}
                  onSave={(data) => handleSave(agent.id, data)} onCancel={() => setEditing(null)} />
              ) : (
                <div>
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>System Prompt</div>
                    <div className={styles.promptBlock}>
                      {agent.system_prompt?.slice(0, 500)}
                      {(agent.system_prompt?.length || 0) > 500 ? '...' : ''}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 12 }}>
                    Tags: {agent.tone_tags || 'none'}
                  </div>
                  <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setEditing(agent.id)}>
                    Edit Agent
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  )
}

function EditForm({ agent, saving, onSave, onCancel }) {
  const [name, setName] = useState(agent.agent_name || '')
  const [description, setDescription] = useState(agent.personality_description || '')
  const [prompt, setPrompt] = useState(agent.system_prompt || '')
  const [tags, setTags] = useState(agent.tone_tags || '')
  const [active, setActive] = useState(agent.is_active ?? true)

  const inputSx = {
    width: '100%', padding: '8px 10px',
    background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)', color: 'var(--color-text)',
    fontSize: '0.875rem', outline: 'none',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Name</label>
          <input style={inputSx} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Tags</label>
          <input style={inputSx} value={tags} onChange={e => setTags(e.target.value)} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>Personality Description</label>
        <input style={inputSx} value={description} onChange={e => setDescription(e.target.value)} />
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 4 }}>System Prompt</label>
        <textarea style={{ ...inputSx, minHeight: 150, resize: 'vertical' }} value={prompt} onChange={e => setPrompt(e.target.value)} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)}
          style={{ accentColor: 'var(--color-accent)' }} />
        <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>Active</span>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={() => onSave({ agent_name: name, personality_description: description, system_prompt: prompt, tone_tags: tags, is_active: active })}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          className={`${styles.btn} ${styles.btnDanger}`}
          onClick={onCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
