import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { importCustomersCSV } from '../../lib/api'
import styles from './Customers.module.css'

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
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

function stageDisplay(c) {
  if (c.status === 'completed' || c.current_sequence_day >= 30) return 'Done'
  if (c.current_sequence_day > 0 && c.current_sequence_day <= 5) return `Touch ${c.current_sequence_day}/5`
  return c.stage || 'Active'
}

const stageColors = {
  'Touch 1/5': 'stageDay1', 'Touch 2/5': 'stageDay3',
  'Touch 3/5': 'stageDay15', 'Touch 4/5': 'stageDay30',
  'Touch 5/5': 'stageDone', 'Done': 'stageDone',
}

const statusColors = {
  active: 'statusActive', paused: 'statusPaused', completed: 'statusCompleted',
  Replied: 'statusReplied', 'No Reply': 'statusNoReply', Pending: 'statusPending',
}

const PAGE_SIZE = 20

const emptyForm = {
  name: '',
  phone: '',
  email: '',
  gender: 'Unknown',
  dob: '',
  city: '',
  product: '',
  purchaseDate: '',
  orderValue: '',
  orderId: '',
  nextBooking: '',
  notes: '',
  startSequence: true,
}

export default function Customers() {
  const navigate = useNavigate()
  const { customers, addCustomer } = useApp()
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ gender: '', stage: '', status: '', dateAdded: '', product: '' })
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const fileInputRef = useRef(null)

  const handleExport = () => {
    const headers = ['name', 'phone', 'email', 'gender', 'product', 'purchase_date', 'order_value', 'order_id', 'notes', 'status', 'stage']
    const rows = customers.map(c => headers.map(h => {
      const val = c[h] ?? ''
      const str = String(val)
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }).join(','))
    const bom = '\uFEFF'
    const csv = bom + headers.join(',') + '\n' + rows.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'customers.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await importCustomersCSV(file)
      window.location.reload()
    } catch (err) {
      alert('Import failed: ' + err.message)
    }
    e.target.value = ''
  }

  const filtered = useMemo(() => {
    let result = [...customers]
    if (search) {
      const s = search.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(s) ||
        c.phone.includes(s) ||
        c.product.toLowerCase().includes(s)
      )
    }
    if (filters.stage) result = result.filter(c => stageDisplay(c) === filters.stage)
    if (filters.status) result = result.filter(c => c.status === filters.status)
    if (filters.product) result = result.filter(c => c.product.toLowerCase().includes(filters.product.toLowerCase()))
    return result
  }, [customers, search, filters])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSelect = id => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const toggleAll = () => {
    if (selected.length === paged.length) setSelected([])
    else setSelected(paged.map(c => c.id))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.phone.trim() || !form.product.trim()) {
      setFormError('Name, Phone, and Product are required')
      return
    }
    setSaving(true)
    setFormError('')
    try {
      await addCustomer({
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        gender: form.gender,
        dob: form.dob || null,
        city: form.city.trim() || null,
        product: form.product.trim(),
        purchase_date: form.purchaseDate || null,
        next_booking: form.nextBooking ? new Date(form.nextBooking).toISOString() : null,
        order_value: form.orderValue ? Number(form.orderValue) : null,
        order_id: form.orderId.trim() || null,
        notes: form.notes.trim() || null,
        start_sequence: form.startSequence,
        stage: 'Active',
        status: 'active',
      })
      setShowAddModal(false)
      setForm(emptyForm)
      setPage(1)
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>Customers</div>
      <div className={styles.pageSubtitle}>Manage and track all your customer relationships</div>

      {/* Top Bar */}
      <div className={styles.topBar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input className={styles.searchInput} placeholder="Search by name, phone, or product..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className={styles.topActions}>
          <button className={styles.filterBtn} onClick={() => setShowFilters(!showFilters)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>
            Filters
          </button>
          <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Customer
          </button>
          <button className={styles.outlineBtn} onClick={() => fileInputRef.current?.click()}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            Import CSV
          </button>
          <input ref={fileInputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleImport} />
          <button className={styles.outlineBtn} onClick={handleExport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
            Export
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className={styles.filterPanel}>
          <div>
            <label className={styles.filterLabel}>Gender</label>
            <select className={styles.filterSelect} value={filters.gender} onChange={e => setFilters(f => ({ ...f, gender: e.target.value }))}>
              <option value="">All</option>
              <option>Male</option>
              <option>Female</option>
            </select>
          </div>
          <div>
            <label className={styles.filterLabel}>Follow-up Stage</label>
            <select className={styles.filterSelect} value={filters.stage} onChange={e => setFilters(f => ({ ...f, stage: e.target.value }))}>
              <option value="">All</option>
              <option>Touch 1/5</option>
              <option>Touch 2/5</option>
              <option>Touch 3/5</option>
              <option>Touch 4/5</option>
              <option>Touch 5/5</option>
              <option>Done</option>
            </select>
          </div>
          <div>
            <label className={styles.filterLabel}>Status</label>
            <select className={styles.filterSelect} value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All</option>
              <option>active</option>
              <option>paused</option>
              <option>completed</option>
            </select>
          </div>
          <div>
            <label className={styles.filterLabel}>Date Added</label>
            <select className={styles.filterSelect} value={filters.dateAdded} onChange={e => setFilters(f => ({ ...f, dateAdded: e.target.value }))}>
              <option value="">All</option>
              <option>This week</option>
              <option>This month</option>
            </select>
          </div>
          <div>
            <label className={styles.filterLabel}>Product/Service</label>
            <input className={styles.filterInput} placeholder="Search product..." value={filters.product} onChange={e => setFilters(f => ({ ...f, product: e.target.value }))} />
          </div>
          <div className={styles.filterActions}>
            <button className={styles.applyBtn}>Apply</button>
            <button className={styles.resetBtn} onClick={() => setFilters({ gender: '', stage: '', status: '', dateAdded: '', product: '' })}>Reset</button>
          </div>
        </div>
      )}

      {/* Table */}
      {customers.length === 0 ? (
        <div className={`${styles.tableCard} ${styles.emptyState}`}>
          <div className={styles.emptyIllustration}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="4"/></svg>
          </div>
          <div className={styles.emptyTitle}>No customers yet</div>
          <div className={styles.emptySubtitle}>Add your first customer to start building relationships</div>
          <button className={styles.addBtn} onClick={() => setShowAddModal(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Your First Customer
          </button>
        </div>
      ) : (
        <div className={styles.tableCard}>
          {selected.length > 0 && (
            <div className={styles.bulkBar}>
              <span>{selected.length} selected</span>
              <div className={styles.bulkActions}>
                <button className={styles.bulkActionBtn}>Send Broadcast</button>
                <button className={styles.bulkActionBtn}>Pause Follow-ups</button>
                <button className={styles.bulkActionBtn}>Delete</button>
                <button className={styles.bulkActionBtn}>Export</button>
              </div>
            </div>
          )}
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: 40 }}><input type="checkbox" className={styles.checkbox} checked={selected.length === paged.length && paged.length > 0} onChange={toggleAll} /></th>
                <th>Customer Name</th>
                <th>Phone</th>
                <th>Product / Service</th>
                <th>Purchase Date</th>
                <th>Next Booking</th>
                <th>Follow-up Stage</th>
                <th>Last Contact</th>
                <th>Status</th>
                <th style={{ width: 40 }}></th>
              </tr>
            </thead>
            <tbody>
              {paged.map(c => (
                <tr key={c.id}>
                  <td><input type="checkbox" className={styles.checkbox} checked={selected.includes(c.id)} onChange={() => toggleSelect(c.id)} /></td>
                  <td>
                    <div className={styles.customerCell} onClick={() => navigate(`/customers/${c.id}`)}>
                      <div className={styles.avatarCircle}>{getInitials(c.name)}</div>
                      <span className={styles.customerName}>{c.name}</span>
                    </div>
                  </td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{c.phone}</td>
                  <td>{c.product}</td>
                  <td style={{ color: 'var(--color-text-secondary)' }}>{c.purchase_date || c.purchaseDate}</td>
                  <td style={{ color: 'var(--color-success)', fontSize: '0.75rem', fontWeight: 600 }}>{toIST(c.next_booking)}</td>
                  <td><span className={`${styles.stageBadge} ${styles[stageColors[stageDisplay(c)]] || styles.stageDone}`}>{stageDisplay(c)}</span></td>
                  <td style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem' }}>{toIST(c.last_contact || c.lastContact)}</td>
                  <td><span className={`${styles.statusBadge} ${styles[statusColors[c.status]]}`}>{c.status}</span></td>
                  <td>
                    <button className={styles.actionsBtn}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className={styles.pagination}>
            <span>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}</span>
            <div className={styles.pageBtns}>
              <button className={styles.pageBtn} disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => (
                <button key={i + 1} className={`${styles.pageBtn} ${page === i + 1 ? styles.pageActive : ''}`} onClick={() => setPage(i + 1)}>{i + 1}</button>
              ))}
              <button className={styles.pageBtn} disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowAddModal(false)}>
          <div className={styles.modal}>
            <div className={styles.modalTitle}>Add New Customer</div>

            {formError && <div className={styles.formError}>{formError}</div>}

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
                <label className={styles.modalLabel}>Email <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
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
                <label className={styles.modalLabel}>Date of Birth <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input className={styles.modalInput} type="date" value={form.dob} onChange={e => setForm(f => ({ ...f, dob: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>City <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input className={styles.modalInput} placeholder="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Product / Service Purchased *</label>
                <input className={styles.modalInput} placeholder="e.g. Dental Cleaning" value={form.product} onChange={e => setForm(f => ({ ...f, product: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Purchase Date</label>
                <input className={styles.modalInput} type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Next Booking <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input className={styles.modalInput} type="datetime-local" value={form.nextBooking} onChange={e => setForm(f => ({ ...f, nextBooking: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Order Value ₹ <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input className={styles.modalInput} type="number" placeholder="Amount" value={form.orderValue} onChange={e => setForm(f => ({ ...f, orderValue: e.target.value }))} />
              </div>
              <div className={styles.modalFieldHalf}>
                <label className={styles.modalLabel}>Order ID <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <input className={styles.modalInput} placeholder="Order ID" value={form.orderId} onChange={e => setForm(f => ({ ...f, orderId: e.target.value }))} />
              </div>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Notes <span style={{ color: 'var(--color-text-muted)' }}>(optional)</span></label>
                <textarea className={styles.modalTextarea} placeholder="Any notes about this customer..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>
              <div className={styles.modalToggle}>
                <span>Start follow-up sequence immediately</span>
                <label className={styles.toggle}>
                  <input type="checkbox" checked={form.startSequence} onChange={e => setForm(f => ({ ...f, startSequence: e.target.checked }))} />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => { setShowAddModal(false); setForm(emptyForm); setFormError('') }}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
