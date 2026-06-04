import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { getMessages, sendMessage } from '../../lib/api'
import styles from './CustomerProfile.module.css'

function getInitials(name) {
  return name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function toIST(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

function timeAgo(ts) {
  if (!ts) return ''
  const diff = Date.now() - new Date(ts).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export default function CustomerProfile() {
  const navigate = useNavigate()
  const { id } = useParams()
  const { customers, updateCustomer, deleteCustomer } = useApp()
  const customer = customers.find(c => c.id === Number(id))
  const [tab, setTab] = useState('overview')
  const [notes, setNotes] = useState('')
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({})
  const [messages, setMessages] = useState([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)

  useEffect(() => {
    if (id) {
      setMessagesLoading(true)
      getMessages(Number(id))
        .then(data => setMessages(data || []))
        .catch(() => setMessages([]))
        .finally(() => setMessagesLoading(false))
    }
  }, [id])

  const handleSendReply = async () => {
    if (!replyText.trim() || !id) return
    setSendingMessage(true)
    try {
      const msg = await sendMessage(Number(id), replyText.trim())
      setMessages(prev => [...prev, msg])
      setReplyText('')
    } catch (err) {
      console.error('Send failed:', err)
    } finally {
      setSendingMessage(false)
    }
  }

  if (!customer) {
    return <div className={styles.notFound}>
      <h2>Customer not found</h2>
      <button className={styles.backLink} onClick={() => navigate('/customers')}>← Back to Customers</button>
    </div>
  }

  const openEdit = () => {
    setForm({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      gender: customer.gender || 'Unknown',
      dob: customer.dob || '',
      city: customer.city || '',
      product: customer.product || '',
      purchase_date: customer.purchase_date || '',
      next_booking: customer.next_booking ? customer.next_booking.slice(0, 16) : '',
      order_value: customer.order_value || '',
      order_id: customer.order_id || '',
      notes: customer.notes || '',
    })
    setShowEdit(true)
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.product.trim()) return
    setSaving(true)
    try {
      await updateCustomer(customer.id, {
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        gender: form.gender,
        dob: form.dob || null,
        city: form.city.trim() || null,
        product: form.product.trim(),
        purchase_date: form.purchase_date || null,
        next_booking: form.next_booking ? new Date(form.next_booking).toISOString() : null,
        order_value: form.order_value ? Number(form.order_value) : null,
        order_id: form.order_id.trim() || null,
        notes: form.notes.trim() || null,
      })
      setShowEdit(false)
    } catch (err) {
      console.error('Update failed:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    try {
      await deleteCustomer(customer.id)
      navigate('/customers')
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  const purchaseDate = customer.purchase_date || customer.purchaseDate
  const createdAt = customer.created_at
    ? new Date(customer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : purchaseDate || '—'

  const sentCount = messages.filter(m => m.direction === 'sent').length
  const receivedCount = messages.filter(m => m.direction === 'received').length
  const responseRate = sentCount > 0 ? Math.round((receivedCount / sentCount) * 100) : 0

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <button className={styles.backLink} onClick={() => navigate('/customers')}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Back to Customers
      </button>

      <div className={styles.profileLayout}>
        <div className={styles.leftColumn}>
          <div className={styles.profileCard}>
            <div className={styles.avatarLarge}>{getInitials(customer.name)}</div>
            <div className={styles.profileName}>{customer.name}</div>
            <div className={styles.profilePhone}>{customer.phone}</div>
            {customer.email && <div className={styles.profileEmail}>{customer.email}</div>}
            <div className={styles.profileMeta}>
              Added on {createdAt}
              {customer.gender && customer.gender !== 'Unknown' ? ` · ${customer.gender}` : ''}
              {customer.city ? ` · ${customer.city}` : ''}
            </div>
          </div>
          <div className={styles.quickActions}>
            <button className={styles.quickActionBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              Send Message
            </button>
            <button className={styles.quickActionBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
              Call
            </button>
            <button className={styles.quickActionBtn} onClick={openEdit}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              Edit
            </button>
            <button className={styles.quickActionBtn}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/></svg>
              Pause Follow-ups
            </button>
            <button className={`${styles.quickActionBtn} ${styles.quickActionDanger}`} onClick={() => setShowDelete(true)}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              Delete
            </button>
          </div>
        </div>

        <div>
          <div className={styles.tabs}>
            {['overview', 'conversations', 'analytics', 'notes'].map(t => (
              <button key={t} className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`} onClick={() => setTab(t)}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className={styles.tabContent}>
            {tab === 'overview' && (
              <div>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: 12 }}>Purchase History</h4>
                <table style={{ width: '100%', fontSize: '0.75rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ color: 'var(--color-text-secondary)' }}>
                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>Product</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '6px 8px' }}>Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '6px 8px' }}>{customer.product}</td>
                      <td style={{ padding: '6px 8px', color: 'var(--color-text-secondary)' }}>{purchaseDate || '—'}</td>
                      <td style={{ padding: '6px 8px' }}>{customer.order_value ? `₹${Number(customer.order_value).toLocaleString()}` : '—'}</td>
                    </tr>
                  </tbody>
                </table>

                <div style={{ display: 'flex', gap: 24, margin: '16px 0', fontSize: '0.75rem' }}>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Last Contact: </span>
                    <span style={{ fontWeight: 600 }}>{toIST(customer.last_contact)}</span>
                  </div>
                  <div>
                    <span style={{ color: 'var(--color-text-secondary)' }}>Next Booking: </span>
                    <span style={{ fontWeight: 600, color: 'var(--color-success)' }}>{toIST(customer.next_booking)}</span>
                  </div>
                </div>

                <h4 style={{ fontSize: '0.875rem', fontWeight: 600, margin: '20px 0 12px' }}>Follow-up Sequence Progress</h4>
                <div className={styles.timeline}>
                  {['Day 1', 'Day 3', 'Day 15', 'Day 30'].map((day, i) => {
                    const dayNum = [1, 3, 15, 30][i]
                    const dayMessages = messages.filter(m => {
                      if (!m.timestamp) return false
                      const daysSinceMsg = (Date.now() - new Date(m.timestamp).getTime()) / 86400000
                      return m.direction === 'sent' && daysSinceMsg < dayNum + 3
                    })
                    const isDone = dayMessages.length > 0
                    const isCurrent = !isDone && i === 0
                    return (
                      <div key={day} className={styles.timelineItem}>
                        <div className={`${styles.timelineDot} ${isDone ? styles.timelineDone : isCurrent ? styles.timelineCurrent : styles.timelinePending}`}>
                          {isDone ? '✓' : isCurrent ? '◉' : '○'}
                        </div>
                        <div className={styles.timelineInfo}>
                          <div className={styles.timelineLabel}>{day}</div>
                          <div className={styles.timelineDesc}>
                            {isDone ? 'Completed' : isCurrent ? 'In progress' : 'Pending'}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {tab === 'conversations' && (
              <div>
                <div className={styles.messageThread}>
                  {messagesLoading ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>No messages yet</p>
                  ) : (
                    messages.map((msg, i) => (
                      <div key={i} className={`${styles.message} ${msg.direction === 'sent' ? styles.messageVi : styles.messageCustomer}`}>
                        {msg.content}
                        <div className={styles.messageTime}>{timeAgo(msg.timestamp)}</div>
                      </div>
                    ))
                  )}
                </div>
                <div className={styles.replyBox}>
                  <input
                    className={styles.replyInput}
                    placeholder="Type a reply and send via WhatsApp..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendReply()}
                  />
                  <button
                    className={styles.sendBtn}
                    onClick={handleSendReply}
                    disabled={sendingMessage || !replyText.trim()}
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            )}

            {tab === 'analytics' && (
              <div>
                <div className={styles.statGrid}>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{responseRate}%</div>
                    <div className={styles.statLabel}>Response Rate</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{sentCount}</div>
                    <div className={styles.statLabel}>Messages Sent</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{receivedCount}</div>
                    <div className={styles.statLabel}>Replies Received</div>
                  </div>
                  <div className={styles.statBox}>
                    <div className={styles.statNumber}>{customer.response_count || 0}</div>
                    <div className={styles.statLabel}>Total Responses</div>
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 4 }}>
                    <span>Response Rate</span>
                    <span style={{ fontWeight: 600 }}>{responseRate}/100</span>
                  </div>
                  <div className={styles.engagementMeter}>
                    <div className={styles.engagementFill} style={{
                      width: `${responseRate}%`,
                      background: responseRate > 50 ? 'var(--color-success)' : responseRate > 20 ? 'var(--color-accent)' : 'var(--color-danger)',
                    }} />
                  </div>
                </div>
              </div>
            )}

            {tab === 'notes' && (
              <div>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 12 }}>
                  Internal notes are never shared with the customer.
                </p>
                <textarea className={styles.notesArea} placeholder="Add internal notes about this customer..." value={notes} onChange={e => setNotes(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {showEdit && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowEdit(false)}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>Edit Customer</div>
            <div className={styles.modalGrid}>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Full Name *</label>
                <input className={styles.modalInput} placeholder="Customer name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Phone / WhatsApp *</label>
                <input className={styles.modalInput} placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Email</label>
                <input className={styles.modalInput} type="email" placeholder="customer@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Gender</label>
                <select className={styles.modalSelect} value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
                  <option>Unknown</option>
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other</option>
                </select>
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Date of Birth</label>
                <input className={styles.modalInput} type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>City</label>
                <input className={styles.modalInput} placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Product / Service *</label>
                <input className={styles.modalInput} placeholder="e.g. Dental Cleaning" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Purchase Date</label>
                <input className={styles.modalInput} type="date" value={form.purchase_date} onChange={e => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Next Booking</label>
                <input className={styles.modalInput} type="datetime-local" value={form.next_booking} onChange={e => setForm(f => ({ ...f, next_booking: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Order Value ₹</label>
                <input className={styles.modalInput} type="number" placeholder="Amount" value={form.order_value} onChange={e => setForm(f => ({ ...f, order_value: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Order ID</label>
                <input className={styles.modalInput} placeholder="Order ID" value={form.order_id} onChange={e => setForm(f => ({ ...f, order_id: e.target.value }))} />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Notes</label>
                <textarea className={styles.modalTextarea} placeholder="Any notes about this customer..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowEdit(false)}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowDelete(false)}>
          <div className={`${styles.modal} ${styles.deleteModal}`}>
            <div className={styles.modalTitle}>Delete Customer</div>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              Are you sure you want to delete <strong>{customer.name}</strong>? This action cannot be undone.
            </p>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setShowDelete(false)}>Cancel</button>
              <button className={styles.deleteBtn} onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
