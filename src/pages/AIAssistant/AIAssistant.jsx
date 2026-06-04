import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { assignAgent } from '../../lib/api'
import styles from './AIAssistant.module.css'

export default function AIAssistant() {
  const { viPaused, setViPaused, autoRefresh, agents, business, refreshDashboard } = useApp()
  const [editModal, setEditModal] = useState(null)
  const [editDay, setEditDay] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [tone, setTone] = useState('auto')
  const [includeEmoji, setIncludeEmoji] = useState(true)
  const [smartTiming, setSmartTiming] = useState(true)
  const [mirroring, setMirroring] = useState(true)
  const [showAgentPicker, setShowAgentPicker] = useState(false)
  const [agentLoading, setAgentLoading] = useState(false)

  const activeAgent = agents.find(a => a.id === business?.active_agent_id)

  const handleAssignAgent = async (agentId) => {
    if (!business?.id || !agentId) return
    setAgentLoading(true)
    try {
      await assignAgent(business.id, agentId)
      await refreshDashboard()
      setShowAgentPicker(false)
    } catch (err) {
      console.error('Assign agent failed:', err)
    } finally {
      setAgentLoading(false)
    }
  }

  const daysSincePurchase = business?.created_at
    ? Math.floor((Date.now() - new Date(business.created_at).getTime()) / 86400000)
    : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>Your AI Assistant</div>
      <div className={styles.pageSubtitle}>Manage how Vi communicates with your customers</div>

      <div className={styles.agentHero}>
        <div className={styles.agentAvatar}>
          {activeAgent?.agent_name?.[0] || 'A'}
        </div>
        <div className={styles.agentInfo}>
          <div className={styles.agentName}>{activeAgent?.agent_name || 'No agent selected'}</div>
          <div className={styles.agentDesc}>{activeAgent?.personality_description || 'Configure an AI agent to handle your customer follow-ups'}</div>
          {activeAgent?.tone_tags && (
            <div className={styles.agentTags}>
              {activeAgent.tone_tags.split(',').map((tag, i) => (
                <span key={i} className={styles.agentTag}>{tag.trim()}</span>
              ))}
            </div>
          )}
        </div>
        <div className={styles.agentActions}>
          <button className={styles.changeBtn} onClick={() => setShowAgentPicker(true)}>
            Change Agent
          </button>
          <div className={styles.toggleRow}>
            <span>Personality auto-adapt</span>
            <label className={styles.toggle}>
              <input type="checkbox" checked={!viPaused} onChange={() => setViPaused(!viPaused)} />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        </div>
      </div>

      <div className={styles.sectionTitle}>Available Agents</div>
      <div className={styles.sectionSubtitle}>Choose the personality that fits your brand</div>

      <div className={styles.sequenceGrid}>
        {agents.map(agent => (
          <div key={agent.id} className={`${styles.sequenceCard} ${agent.id === business?.active_agent_id ? styles.activeCard : ''}`}>
            <div className={styles.sequenceDay}>{agent.agent_name}</div>
            <div className={styles.sequenceDesc}>
              <p>{agent.personality_description}</p>
            </div>
            <div className={styles.sequenceToggle}>
              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                {agent.tone_tags?.split(',').map(t => t.trim()).join(' · ') || ''}
              </span>
            </div>
            <div className={styles.sequenceActions}>
              {agent.id === business?.active_agent_id ? (
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-accent)' }}>Active</span>
              ) : (
                <button
                  className={styles.sequenceActionBtn}
                  onClick={() => handleAssignAgent(agent.id)}
                  disabled={agentLoading}
                >
                  {agentLoading ? 'Switching...' : 'Select'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <div className={styles.toggleTitle}>Smart Timing</div>
            <div className={styles.toggleDesc}>
              When ON, Vi analyzes each customer's response patterns and automatically sends messages when they are most likely to reply.
            </div>
          </div>
          <label className={styles.toggle}>
            <input type="checkbox" checked={smartTiming} onChange={() => setSmartTiming(!smartTiming)} />
            <span className={styles.toggleSlider} />
          </label>
        </div>
      </div>

      <div className={styles.sectionCard}>
        <div className={styles.toggleRow}>
          <div className={styles.toggleInfo}>
            <div className={styles.toggleTitle}>Personality Mirroring</div>
            <div className={styles.toggleDesc}>
              Vi analyzes each customer's messages and automatically mirrors their tone — casual, formal, funny, or professional.
            </div>
          </div>
          <label className={styles.toggle}>
            <input type="checkbox" checked={mirroring} onChange={() => setMirroring(!mirroring)} />
            <span className={styles.toggleSlider} />
          </label>
        </div>
      </div>

      {showAgentPicker && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowAgentPicker(false)}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>Choose AI Agent</div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginBottom: 16 }}>
              Select the personality that best represents your brand
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {agents.map(agent => (
                <button
                  key={agent.id}
                  className={`${styles.agentPickerCard} ${agent.id === business?.active_agent_id ? styles.agentPickerActive : ''}`}
                  onClick={() => handleAssignAgent(agent.id)}
                  disabled={agentLoading}
                >
                  <div style={{ fontWeight: 600 }}>{agent.agent_name}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                    {agent.personality_description}
                  </div>
                </button>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowAgentPicker(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {editModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setEditModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>Edit {editDay} Message</div>

            <label className={styles.label}>Message Template</label>
            <textarea className={styles.textarea} value={messageText} onChange={e => setMessageText(e.target.value)} />

            <div className={styles.variablePills}>
              {['Customer Name', 'Product Name', 'Purchase Date', 'Business Name', 'Owner Name'].map(v => (
                <button key={v} className={styles.variablePill} onClick={() => setMessageText(prev => prev + ` [${v}] `)}>
                  {`[${v}]`}
                </button>
              ))}
            </div>

            <label className={styles.label}>Tone</label>
            <div className={styles.toneGroup}>
              {['Auto-detect', 'Formal', 'Casual', 'Funny', 'Empathetic'].map(t => (
                <button key={t} className={`${styles.tonePill} ${tone === t ? styles.toneActive : ''}`} onClick={() => setTone(t)}>
                  {t}
                </button>
              ))}
            </div>

            <div className={styles.toggleRow} style={{ padding: '8px 0' }}>
              <span style={{ fontSize: '0.8125rem' }}>Include emoji</span>
              <label className={styles.toggle}>
                <input type="checkbox" checked={includeEmoji} onChange={() => setIncludeEmoji(!includeEmoji)} />
                <span className={styles.toggleSlider} />
              </label>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditModal(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={() => setEditModal(false)}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
