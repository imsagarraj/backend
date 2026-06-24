import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import { importCustomersCSV, sendMessage } from '../../lib/api'
import { SkeletonTable, SkeletonCard, SkeletonBlock } from '../../components/Skeleton/Skeleton'
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

const COUNTRY_CODES = [
  { code: '+91', country: '🇮🇳 India' },
  { code: '+1', country: '🇺🇸 USA/Canada' },
  { code: '+44', country: '🇬🇧 UK' },
  { code: '+61', country: '🇦🇺 Australia' },
  { code: '+1-345', country: '🇰🇾 Cayman Islands' },
  { code: '+1-441', country: '🇧🇲 Bermuda' },
  { code: '+1-473', country: '🇬🇩 Grenada' },
  { code: '+1-649', country: '🇹🇨 Turks & Caicos' },
  { code: '+1-664', country: '🇲🇸 Montserrat' },
  { code: '+1-670', country: '🇲🇵 Northern Mariana Islands' },
  { code: '+1-671', country: '🇬🇺 Guam' },
  { code: '+1-684', country: '🇦🇸 American Samoa' },
  { code: '+1-721', country: '🇸🇽 Sint Maarten' },
  { code: '+1-758', country: '🇱🇨 St. Lucia' },
  { code: '+1-767', country: '🇩🇲 Dominica' },
  { code: '+1-784', country: '🇻🇨 St. Vincent & Grenadines' },
  { code: '+1-787', country: '🇵🇷 Puerto Rico' },
  { code: '+1-809', country: '🇩🇴 Dominican Republic' },
  { code: '+1-829', country: '🇩🇴 Dominican Republic' },
  { code: '+1-868', country: '🇹🇹 Trinidad & Tobago' },
  { code: '+1-869', country: '🇰🇳 St. Kitts & Nevis' },
  { code: '+1-876', country: '🇯🇲 Jamaica' },
  { code: '+1-939', country: '🇵🇷 Puerto Rico' },
  { code: '+7', country: '🇷🇺 Russia' },
  { code: '+20', country: '🇪🇬 Egypt' },
  { code: '+27', country: '🇿🇦 South Africa' },
  { code: '+30', country: '🇬🇷 Greece' },
  { code: '+31', country: '🇳🇱 Netherlands' },
  { code: '+32', country: '🇧🇪 Belgium' },
  { code: '+33', country: '🇫🇷 France' },
  { code: '+34', country: '🇪🇸 Spain' },
  { code: '+36', country: '🇭🇺 Hungary' },
  { code: '+39', country: '🇮🇹 Italy' },
  { code: '+40', country: '🇷🇴 Romania' },
  { code: '+41', country: '🇨🇭 Switzerland' },
  { code: '+43', country: '🇦🇹 Austria' },
  { code: '+45', country: '🇩🇰 Denmark' },
  { code: '+46', country: '🇸🇪 Sweden' },
  { code: '+47', country: '🇳🇴 Norway' },
  { code: '+48', country: '🇵🇱 Poland' },
  { code: '+49', country: '🇩🇪 Germany' },
  { code: '+51', country: '🇵🇪 Peru' },
  { code: '+52', country: '🇲🇽 Mexico' },
  { code: '+53', country: '🇨🇺 Cuba' },
  { code: '+54', country: '🇦🇷 Argentina' },
  { code: '+55', country: '🇧🇷 Brazil' },
  { code: '+56', country: '🇨🇱 Chile' },
  { code: '+57', country: '🇨🇴 Colombia' },
  { code: '+58', country: '🇻🇪 Venezuela' },
  { code: '+60', country: '🇲🇾 Malaysia' },
  { code: '+62', country: '🇮🇩 Indonesia' },
  { code: '+63', country: '🇵🇭 Philippines' },
  { code: '+64', country: '🇳🇿 New Zealand' },
  { code: '+65', country: '🇸🇬 Singapore' },
  { code: '+66', country: '🇹🇭 Thailand' },
  { code: '+81', country: '🇯🇵 Japan' },
  { code: '+82', country: '🇰🇷 South Korea' },
  { code: '+84', country: '🇻🇳 Vietnam' },
  { code: '+86', country: '🇨🇳 China' },
  { code: '+90', country: '🇹🇷 Turkey' },
  { code: '+92', country: '🇵🇰 Pakistan' },
  { code: '+93', country: '🇦🇫 Afghanistan' },
  { code: '+94', country: '🇱🇰 Sri Lanka' },
  { code: '+95', country: '🇲🇲 Myanmar' },
  { code: '+98', country: '🇮🇷 Iran' },
  { code: '+212', country: '🇲🇦 Morocco' },
  { code: '+213', country: '🇩🇿 Algeria' },
  { code: '+216', country: '🇹🇳 Tunisia' },
  { code: '+218', country: '🇱🇾 Libya' },
  { code: '+220', country: '🇬🇲 Gambia' },
  { code: '+221', country: '🇸🇳 Senegal' },
  { code: '+222', country: '🇲🇷 Mauritania' },
  { code: '+223', country: '🇲🇱 Mali' },
  { code: '+224', country: '🇬🇳 Guinea' },
  { code: '+225', country: '🇨🇮 Côte d\'Ivoire' },
  { code: '+226', country: '🇧🇫 Burkina Faso' },
  { code: '+227', country: '🇳🇪 Niger' },
  { code: '+228', country: '🇹🇬 Togo' },
  { code: '+229', country: '🇧🇯 Benin' },
  { code: '+230', country: '🇲🇺 Mauritius' },
  { code: '+231', country: '🇱🇷 Liberia' },
  { code: '+232', country: '🇸🇱 Sierra Leone' },
  { code: '+233', country: '🇬🇭 Ghana' },
  { code: '+234', country: '🇳🇬 Nigeria' },
  { code: '+235', country: '🇹🇩 Chad' },
  { code: '+236', country: '🇨🇫 Central African Republic' },
  { code: '+237', country: '🇨🇲 Cameroon' },
  { code: '+238', country: '🇨🇻 Cape Verde' },
  { code: '+239', country: '🇸🇹 São Tomé & Príncipe' },
  { code: '+240', country: '🇬🇶 Equatorial Guinea' },
  { code: '+241', country: '🇬🇦 Gabon' },
  { code: '+242', country: '🇨🇬 Congo' },
  { code: '+243', country: '🇨🇩 DR Congo' },
  { code: '+244', country: '🇦🇴 Angola' },
  { code: '+245', country: '🇬🇼 Guinea-Bissau' },
  { code: '+246', country: '🇮🇴 British Indian Ocean Territory' },
  { code: '+248', country: '🇸🇨 Seychelles' },
  { code: '+249', country: '🇸🇩 Sudan' },
  { code: '+250', country: '🇷🇼 Rwanda' },
  { code: '+251', country: '🇪🇹 Ethiopia' },
  { code: '+252', country: '🇸🇴 Somalia' },
  { code: '+253', country: '🇩🇯 Djibouti' },
  { code: '+254', country: '🇰🇪 Kenya' },
  { code: '+255', country: '🇹🇿 Tanzania' },
  { code: '+256', country: '🇺🇬 Uganda' },
  { code: '+257', country: '🇧🇮 Burundi' },
  { code: '+258', country: '🇲🇿 Mozambique' },
  { code: '+260', country: '🇿🇲 Zambia' },
  { code: '+261', country: '🇲🇬 Madagascar' },
  { code: '+262', country: '🇷🇪 Réunion' },
  { code: '+263', country: '🇿🇼 Zimbabwe' },
  { code: '+264', country: '🇳🇦 Namibia' },
  { code: '+265', country: '🇲🇼 Malawi' },
  { code: '+266', country: '🇱🇸 Lesotho' },
  { code: '+267', country: '🇧🇼 Botswana' },
  { code: '+268', country: '🇸🇿 Eswatini' },
  { code: '+269', country: '🇰🇲 Comoros' },
  { code: '+290', country: '🇸🇭 St. Helena' },
  { code: '+291', country: '🇪🇷 Eritrea' },
  { code: '+297', country: '🇦🇼 Aruba' },
  { code: '+298', country: '🇫🇴 Faroe Islands' },
  { code: '+299', country: '🇬🇱 Greenland' },
  { code: '+350', country: '🇬🇮 Gibraltar' },
  { code: '+351', country: '🇵🇹 Portugal' },
  { code: '+352', country: '🇱🇺 Luxembourg' },
  { code: '+353', country: '🇮🇪 Ireland' },
  { code: '+354', country: '🇮🇸 Iceland' },
  { code: '+355', country: '🇦🇱 Albania' },
  { code: '+356', country: '🇲🇹 Malta' },
  { code: '+357', country: '🇨🇾 Cyprus' },
  { code: '+358', country: '🇫🇮 Finland' },
  { code: '+359', country: '🇧🇬 Bulgaria' },
  { code: '+370', country: '🇱🇹 Lithuania' },
  { code: '+371', country: '🇱🇻 Latvia' },
  { code: '+372', country: '🇪🇪 Estonia' },
  { code: '+373', country: '🇲🇩 Moldova' },
  { code: '+374', country: '🇦🇲 Armenia' },
  { code: '+375', country: '🇧🇾 Belarus' },
  { code: '+376', country: '🇦🇩 Andorra' },
  { code: '+377', country: '🇲🇨 Monaco' },
  { code: '+378', country: '🇸🇲 San Marino' },
  { code: '+380', country: '🇺🇦 Ukraine' },
  { code: '+381', country: '🇷🇸 Serbia' },
  { code: '+382', country: '🇲🇪 Montenegro' },
  { code: '+385', country: '🇭🇷 Croatia' },
  { code: '+386', country: '🇸🇮 Slovenia' },
  { code: '+387', country: '🇧🇦 Bosnia & Herzegovina' },
  { code: '+389', country: '🇲🇰 North Macedonia' },
  { code: '+420', country: '🇨🇿 Czech Republic' },
  { code: '+421', country: '🇸🇰 Slovakia' },
  { code: '+423', country: '🇱🇮 Liechtenstein' },
  { code: '+500', country: '🇫🇰 Falkland Islands' },
  { code: '+501', country: '🇧🇿 Belize' },
  { code: '+502', country: '🇬🇹 Guatemala' },
  { code: '+503', country: '🇸🇻 El Salvador' },
  { code: '+504', country: '🇭🇳 Honduras' },
  { code: '+505', country: '🇳🇮 Nicaragua' },
  { code: '+506', country: '🇨🇷 Costa Rica' },
  { code: '+507', country: '🇵🇦 Panama' },
  { code: '+508', country: '🇵🇲 St. Pierre & Miquelon' },
  { code: '+509', country: '🇭🇹 Haiti' },
  { code: '+590', country: '🇬🇵 Guadeloupe' },
  { code: '+591', country: '🇧🇴 Bolivia' },
  { code: '+592', country: '🇬🇾 Guyana' },
  { code: '+593', country: '🇪🇨 Ecuador' },
  { code: '+594', country: '🇬🇫 French Guiana' },
  { code: '+595', country: '🇵🇾 Paraguay' },
  { code: '+596', country: '🇲🇶 Martinique' },
  { code: '+597', country: '🇸🇷 Suriname' },
  { code: '+598', country: '🇺🇾 Uruguay' },
  { code: '+599', country: '🇨🇼 Curaçao' },
  { code: '+670', country: '🇹🇱 Timor-Leste' },
  { code: '+672', country: '🇳🇫 Norfolk Island' },
  { code: '+673', country: '🇧🇳 Brunei' },
  { code: '+674', country: '🇳🇷 Nauru' },
  { code: '+675', country: '🇵🇬 Papua New Guinea' },
  { code: '+676', country: '🇹🇴 Tonga' },
  { code: '+677', country: '🇸🇧 Solomon Islands' },
  { code: '+678', country: '🇻🇺 Vanuatu' },
  { code: '+679', country: '🇫🇯 Fiji' },
  { code: '+680', country: '🇵🇼 Palau' },
  { code: '+681', country: '🇼🇫 Wallis & Futuna' },
  { code: '+682', country: '🇨🇰 Cook Islands' },
  { code: '+683', country: '🇳🇺 Niue' },
  { code: '+685', country: '🇼🇸 Samoa' },
  { code: '+686', country: '🇰🇮 Kiribati' },
  { code: '+687', country: '🇳🇨 New Caledonia' },
  { code: '+688', country: '🇹🇻 Tuvalu' },
  { code: '+689', country: '🇵🇫 French Polynesia' },
  { code: '+690', country: '🇹🇰 Tokelau' },
  { code: '+691', country: '🇫🇲 Micronesia' },
  { code: '+692', country: '🇲🇭 Marshall Islands' },
  { code: '+850', country: '🇰🇵 North Korea' },
  { code: '+852', country: '🇭🇰 Hong Kong' },
  { code: '+853', country: '🇲🇴 Macau' },
  { code: '+855', country: '🇰🇭 Cambodia' },
  { code: '+856', country: '🇱🇦 Laos' },
  { code: '+880', country: '🇧🇩 Bangladesh' },
  { code: '+886', country: '🇹🇼 Taiwan' },
  { code: '+960', country: '🇲🇻 Maldives' },
  { code: '+961', country: '🇱🇧 Lebanon' },
  { code: '+962', country: '🇯🇴 Jordan' },
  { code: '+963', country: '🇸🇾 Syria' },
  { code: '+964', country: '🇮🇶 Iraq' },
  { code: '+965', country: '🇰🇼 Kuwait' },
  { code: '+966', country: '🇸🇦 Saudi Arabia' },
  { code: '+967', country: '🇾🇪 Yemen' },
  { code: '+968', country: '🇴🇲 Oman' },
  { code: '+970', country: '🇵🇸 Palestine' },
  { code: '+971', country: '🇦🇪 UAE' },
  { code: '+972', country: '🇮🇱 Israel' },
  { code: '+973', country: '🇧🇭 Bahrain' },
  { code: '+974', country: '🇶🇦 Qatar' },
  { code: '+975', country: '🇧🇹 Bhutan' },
  { code: '+976', country: '🇲🇳 Mongolia' },
  { code: '+977', country: '🇳🇵 Nepal' },
  { code: '+992', country: '🇹🇯 Tajikistan' },
  { code: '+993', country: '🇹🇲 Turkmenistan' },
  { code: '+994', country: '🇦🇿 Azerbaijan' },
  { code: '+995', country: '🇬🇪 Georgia' },
  { code: '+996', country: '🇰🇬 Kyrgyzstan' },
  { code: '+998', country: '🇺🇿 Uzbekistan' },
]

const PAGE_SIZE = 20

const emptyForm = {
  name: '',
  countryCode: '+91',
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
  const { customers, customersLoading, addCustomer, deleteCustomer, updateCustomer } = useApp()
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selected, setSelected] = useState([])
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ gender: '', stage: '', status: '', dateAdded: '', product: '' })
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
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

  const [broadcastText, setBroadcastText] = useState('')
  const [sendingBroadcast, setSendingBroadcast] = useState(false)

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selected.length} customer(s)? This cannot be undone.`)) return
    for (const id of selected) {
      await deleteCustomer(id)
    }
    setSelected([])
  }

  const handleBulkPause = async () => {
    for (const id of selected) {
      await updateCustomer(id, { status: 'paused' })
    }
    setSelected([])
  }

  const handleBulkExport = () => {
    const headers = ['name', 'phone', 'email', 'gender', 'product', 'purchase_date', 'order_value', 'order_id', 'notes', 'status', 'stage']
    const target = Array.isArray(customers) ? customers.filter(c => selected.includes(c.id)) : []
    const rows = target.map(c => headers.map(h => {
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
    a.download = 'customers_selected.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleBulkBroadcast = async () => {
    if (!broadcastText.trim()) return
    setSendingBroadcast(true)
    try {
      for (const id of selected) {
        await sendMessage(id, broadcastText.trim())
      }
      setBroadcastText('')
      setShowBroadcastModal(false)
      setSelected([])
      alert(`Message sent to ${selected.length} customer(s)`)
    } catch (err) {
      alert('Broadcast failed: ' + err.message)
    } finally {
      setSendingBroadcast(false)
    }
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
        phone: form.countryCode + form.phone.trim(),
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
      {customersLoading ? (
        <div className={styles.tableCard}>
          <div style={{ padding: 16 }}><SkeletonTable rows={6} cols={5} /></div>
        </div>
      ) : customers.length === 0 ? (
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
                <button className={styles.bulkActionBtn} onClick={() => setShowBroadcastModal(true)}>Send Broadcast</button>
                <button className={styles.bulkActionBtn} onClick={handleBulkPause}>Pause Follow-ups</button>
                <button className={styles.bulkActionBtn} onClick={handleBulkDelete}>Delete</button>
                <button className={styles.bulkActionBtn} onClick={handleBulkExport}>Export</button>
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
                <div style={{ display: 'flex', gap: 8 }}>
                  <select className={styles.modalSelect} style={{ width: 120, flexShrink: 0 }} value={form.countryCode} onChange={e => setForm(f => ({ ...f, countryCode: e.target.value }))}>
                    {COUNTRY_CODES.map(cc => (
                      <option key={cc.code} value={cc.code}>{cc.country} {cc.code}</option>
                    ))}
                  </select>
                  <input className={styles.modalInput} style={{ flex: 1 }} placeholder="98765 43210" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value.replace(/[^0-9\s-]/g, '') }))} />
                </div>
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

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setShowBroadcastModal(false)}>
          <div className={styles.modal} style={{ maxWidth: 480 }}>
            <div className={styles.modalTitle}>Send Broadcast to {selected.length} customer(s)</div>
            <div style={{ padding: '0 0 16px' }}>
              <textarea
                className={styles.modalTextarea}
                style={{ minHeight: 120 }}
                placeholder="Type your message here..."
                value={broadcastText}
                onChange={e => setBroadcastText(e.target.value)}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => { setShowBroadcastModal(false); setBroadcastText('') }}>Cancel</button>
              <button className={styles.saveBtn} onClick={handleBulkBroadcast} disabled={sendingBroadcast || !broadcastText.trim()}>
                {sendingBroadcast ? 'Sending...' : `Send to ${selected.length} customer(s)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  )
}
