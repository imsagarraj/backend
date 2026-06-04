import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import styles from './Onboarding.module.css'

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const businessTypes = [
  'Dental Clinic', 'Retail Store', 'D2C Brand', 'Salon/Spa',
  'Coaching Centre', 'Restaurant', 'E-commerce', 'Healthcare',
  'Real Estate', 'Automobile', 'Other',
]

const employeeOptions = ['1-5', '6-20', '21-50', '50+']
const languages = ['Hindi', 'English', 'Hinglish', 'Tamil', 'Telugu', 'Marathi', 'Bengali', 'Kannada', 'Gujarati']
const stepLabels = ['Business', 'Owner', 'Hours', 'Customers', 'AI Agent', 'Review']

const defaultFields = [
  'Customer Full Name', 'Customer Phone Number (WhatsApp)',
  'Purchase Date', 'Product / Service Purchased',
]

const optionalFields = [
  'Customer Email', 'Customer Gender', 'Customer Age / Date of Birth',
  'Customer City', 'Product Price / Order Value', 'Order ID / Invoice Number',
  'Customer Notes', 'Loyalty Points / Visit Count', 'Last Visit Date',
  'Next Appointment Date', 'Referral Source',
]

const agents = [
  {
    name: 'Zara', color: '#c85a1a', initial: 'Z',
    personality: 'Warm, friendly, caring. Like a helpful shop assistant.',
    sample: 'Hi [Name]! Hope you\'re loving your [product] 😊 Just checking in — any questions? We\'re here for you!',
    tags: ['Friendly', 'Warm', 'Emoji-friendly'],
  },
  {
    name: 'Arjun', color: '#2563eb', initial: 'A',
    personality: 'Professional, trustworthy, formal.',
    sample: 'Dear [Name], We hope you are satisfied with your recent purchase. Please feel free to reach out for any assistance.',
    tags: ['Professional', 'Formal', 'Trustworthy'],
  },
  {
    name: 'Nisha', color: '#7c3aed', initial: 'N',
    personality: 'Fun, casual, GenZ energy. Great for youth brands.',
    sample: 'Heyyy [Name]! Your [product] is giving bestie vibes rn 💅 Lmk if you need anything ok??',
    tags: ['Casual', 'Fun', 'GenZ'],
  },
]

const steps = [
  // Step 0: Business Details
  ({ data, setData }) => (
    <div className={styles.formGrid}>
      <div className={styles.fieldFull}>
        <label className={styles.label}>Business Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
        <input className={styles.input} placeholder="e.g. Sunrise Dental Clinic" value={data.businessName} onChange={e => setData(d => ({ ...d, businessName: e.target.value }))} required />
      </div>
      <div>
        <label className={styles.label}>Business Type <span style={{ color: 'var(--color-error)' }}>*</span></label>
        <select className={styles.select} value={data.businessType} onChange={e => setData(d => ({ ...d, businessType: e.target.value }))}>
          <option value="">Select type</option>
          {businessTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <div>
        <label className={styles.label}>Business Category</label>
        <input className={styles.input} placeholder="Auto-filled from type" value={data.businessCategory} onChange={e => setData(d => ({ ...d, businessCategory: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>GST Number <span className={styles.optional}>(optional)</span></label>
        <input className={styles.input} placeholder="22AAAAA0000A1Z5" value={data.gst} onChange={e => setData(d => ({ ...d, gst: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Registration Number <span className={styles.optional}>(optional)</span></label>
        <input className={styles.input} placeholder="Registration number" value={data.regNo} onChange={e => setData(d => ({ ...d, regNo: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Year Established</label>
        <input className={styles.input} type="number" placeholder="e.g. 2020" value={data.yearEst} onChange={e => setData(d => ({ ...d, yearEst: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Number of Employees</label>
        <select className={styles.select} value={data.employees} onChange={e => setData(d => ({ ...d, employees: e.target.value }))}>
          <option value="">Select</option>
          {employeeOptions.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div className={styles.fieldFull}>
        <label className={styles.label}>Business Description</label>
        <textarea className={styles.textarea} placeholder="Describe what your business does in a few lines..." maxLength={300} value={data.description} onChange={e => setData(d => ({ ...d, description: e.target.value }))} />
        <div className={styles.charCount}>{data.description.length}/300</div>
      </div>
      <div className={styles.fieldFull}>
        <label className={styles.label}>Website URL <span className={styles.optional}>(optional)</span></label>
        <input className={styles.input} placeholder="https://example.com" value={data.website} onChange={e => setData(d => ({ ...d, website: e.target.value }))} />
      </div>
      <div className={styles.fieldFull}>
        <label className={styles.label}>Address Line 1</label>
        <input className={styles.input} placeholder="Shop no. 5, MG Road" value={data.address1} onChange={e => setData(d => ({ ...d, address1: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Address Line 2 <span className={styles.optional}>(optional)</span></label>
        <input className={styles.input} placeholder="Near City Mall" value={data.address2} onChange={e => setData(d => ({ ...d, address2: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>City</label>
        <input className={styles.input} placeholder="e.g. Mumbai" value={data.city} onChange={e => setData(d => ({ ...d, city: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>State</label>
        <select className={styles.select} value={data.state} onChange={e => setData(d => ({ ...d, state: e.target.value }))}>
          <option value="">Select state</option>
          {indianStates.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div>
        <label className={styles.label}>PIN Code</label>
        <input className={styles.input} type="number" placeholder="400001" maxLength={6} value={data.pincode} onChange={e => setData(d => ({ ...d, pincode: e.target.value.slice(0, 6) }))} />
      </div>
      <div>
        <label className={styles.label}>Business Phone</label>
        <input className={styles.input} placeholder="+91 98765 43210" value={data.phone} onChange={e => setData(d => ({ ...d, phone: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Business Email</label>
        <input className={styles.input} type="email" placeholder="contact@business.com" value={data.email} onChange={e => setData(d => ({ ...d, email: e.target.value }))} />
      </div>
      <div className={styles.fieldFull}>
        <label className={styles.label}>WhatsApp Business Number</label>
        <input className={styles.input} placeholder="+91 98765 43210" value={data.whatsapp} onChange={e => setData(d => ({ ...d, whatsapp: e.target.value }))} />
        <div className={styles.toggleDesc}>This is the number Vi will use to contact your customers</div>
      </div>
    </div>
  ),

  // Step 1: Owner Details
  ({ data, setData }) => (
    <div className={styles.formGrid}>
      <div>
        <label className={styles.label}>Full Name <span style={{ color: 'var(--color-error)' }}>*</span></label>
        <input className={styles.input} placeholder="e.g. Amit Kumar" value={data.ownerName} onChange={e => setData(d => ({ ...d, ownerName: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Phone Number <span style={{ color: 'var(--color-error)' }}>*</span></label>
        <input className={styles.input} placeholder="+91 98765 43210" value={data.ownerPhone} onChange={e => setData(d => ({ ...d, ownerPhone: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Email <span style={{ color: 'var(--color-error)' }}>*</span></label>
        <input className={styles.input} type="email" placeholder="owner@business.com" value={data.ownerEmail} onChange={e => setData(d => ({ ...d, ownerEmail: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Gender</label>
        <div className={styles.radioGroup}>
          {['Male', 'Female', 'Prefer not to say'].map(g => (
            <label key={g} className={styles.radioLabel}>
              <input type="radio" name="gender" checked={data.ownerGender === g} onChange={() => setData(d => ({ ...d, ownerGender: g }))} />
              {g}
            </label>
          ))}
        </div>
      </div>
      <div>
        <label className={styles.label}>Date of Birth</label>
        <input className={styles.input} type="date" value={data.ownerDob} onChange={e => setData(d => ({ ...d, ownerDob: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Designation</label>
        <input className={styles.input} placeholder="e.g. Founder, Director, Manager" value={data.ownerDesignation} onChange={e => setData(d => ({ ...d, ownerDesignation: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Alternate Contact Name <span className={styles.optional}>(optional)</span></label>
        <input className={styles.input} placeholder="Alternate person" value={data.altName} onChange={e => setData(d => ({ ...d, altName: e.target.value }))} />
      </div>
      <div>
        <label className={styles.label}>Alternate Contact Phone <span className={styles.optional}>(optional)</span></label>
        <input className={styles.input} placeholder="+91 98765 43210" value={data.altPhone} onChange={e => setData(d => ({ ...d, altPhone: e.target.value }))} />
      </div>
      <div className={styles.fieldFull}>
        <label className={styles.label}>Profile Photo <span className={styles.optional}>(optional)</span></label>
        <input className={styles.input} type="file" accept="image/*" />
      </div>
    </div>
  ),

  // Step 2: Business Hours
  ({ data, setData }) => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const toggleDay = day => {
      setData(d => ({
        ...d,
        workingDays: d.workingDays.includes(day)
          ? d.workingDays.filter(dd => dd !== day)
          : [...d.workingDays, day],
      }))
    }
    return (
      <div className={styles.formGrid}>
        <div className={styles.fieldFull}>
          <label className={styles.label}>Working Days</label>
          <div className={styles.checkboxGrid}>
            {days.map(day => (
              <label key={day} className={`${styles.checkboxLabel} ${data.workingDays.includes(day) ? styles.checkboxChecked : ''}`}>
                <input type="checkbox" checked={data.workingDays.includes(day)} onChange={() => toggleDay(day)} style={{ display: 'none' }} />
                {day.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className={styles.label}>Opening Time</label>
          <input className={styles.input} type="time" value={data.openTime} onChange={e => setData(d => ({ ...d, openTime: e.target.value }))} />
        </div>
        <div>
          <label className={styles.label}>Closing Time</label>
          <input className={styles.input} type="time" value={data.closeTime} onChange={e => setData(d => ({ ...d, closeTime: e.target.value }))} />
        </div>
        <div>
          <label className={styles.label}>Time Zone</label>
          <select className={styles.select} value={data.timezone} onChange={e => setData(d => ({ ...d, timezone: e.target.value }))}>
            <option value="Asia/Kolkata">IST - Asia/Kolkata</option>
            <option value="Asia/Dubai">GST - Asia/Dubai</option>
            <option value="America/New_York">EST - America/New_York</option>
          </select>
        </div>
        <div>
          <label className={styles.label}>Preferred Language</label>
          <select className={styles.select} value={data.language} onChange={e => setData(d => ({ ...d, language: e.target.value }))}>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className={styles.fieldFull}>
          <div className={styles.toggleRow}>
            <div className={styles.toggleInfo}>
              <div className={styles.toggleTitle}>Auto-detect customer language</div>
              <div className={styles.toggleDesc}>Vi will detect customer language and respond accordingly</div>
            </div>
            <label className={styles.toggle}>
              <input type="checkbox" checked={data.autoLang} onChange={e => setData(d => ({ ...d, autoLang: e.target.checked }))} />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        </div>
      </div>
    )
  },

  // Step 3: Customer Fields
  ({ data, setData }) => {
    const toggleOptional = field => {
      setData(d => ({
        ...d,
        customerFields: d.customerFields.includes(field)
          ? d.customerFields.filter(f => f !== field)
          : [...d.customerFields, field],
      }))
    }
    const addCustom = () => {
      setData(d => ({ ...d, customFields: [...d.customFields, { name: '', type: 'Text' }] }))
    }
    const updateCustom = (index, key, value) => {
      setData(d => ({
        ...d,
        customFields: d.customFields.map((f, i) => i === index ? { ...f, [key]: value } : f),
      }))
    }
    const removeCustom = index => {
      setData(d => ({ ...d, customFields: d.customFields.filter((_, i) => i !== index) }))
    }
    return (
      <div>
        <div className={styles.toggleDesc} style={{ marginBottom: 20 }}>
          Tell Vi what information you collect about your customers. This helps Vi personalize every conversation.
        </div>
        <div className={styles.label} style={{ marginBottom: 8 }}>Default Fields (always included)</div>
        {defaultFields.map(f => (
          <div key={f} className={styles.toggleRow} style={{ opacity: 0.6, pointerEvents: 'none' }}>
            <span style={{ fontSize: '0.8125rem' }}>{f}</span>
            <span style={{ fontSize: '0.625rem', color: 'var(--color-text-muted)' }}>Required</span>
          </div>
        ))}
        <div className={styles.label} style={{ margin: '16px 0 8px' }}>Optional Fields</div>
        {optionalFields.map(f => (
          <div key={f} className={styles.toggleRow}>
            <span style={{ fontSize: '0.8125rem' }}>{f}</span>
            <label className={styles.toggle}>
              <input type="checkbox" checked={data.customerFields.includes(f)} onChange={() => toggleOptional(f)} />
              <span className={styles.toggleSlider} />
            </label>
          </div>
        ))}
        <div className={styles.label} style={{ margin: '16px 0 8px' }}>Custom Fields</div>
        {data.customFields.map((cf, i) => (
          <div key={i} className={styles.customFieldRow}>
            <input className={`${styles.input} ${styles.customFieldInput}`} placeholder="Field name" value={cf.name} onChange={e => updateCustom(i, 'name', e.target.value)} />
            <select className={styles.select} style={{ width: 120 }} value={cf.type} onChange={e => updateCustom(i, 'type', e.target.value)}>
              <option>Text</option>
              <option>Number</option>
              <option>Date</option>
              <option>Yes/No</option>
            </select>
            <button className={styles.removeFieldBtn} onClick={() => removeCustom(i)}>×</button>
          </div>
        ))}
        {data.customFields.length < 10 && (
          <button className={styles.addFieldBtn} onClick={addCustom}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
            Add Custom Field
          </button>
        )}
      </div>
    )
  },

  // Step 4: AI Assistant
  ({ data, setData }) => {
    const selectAgent = name => setData(d => ({ ...d, selectedAgent: name }))

    const days = data.workingDays?.length || 0
    const totalFields = defaultFields.length + data.customerFields.length + data.customFields.length

    return (
      <div>
        <div className={styles.label} style={{ marginBottom: 12 }}>Choose your AI Agent</div>
        <div className={styles.agentGrid}>
          {agents.map(agent => (
            <div
              key={agent.name}
              className={`${styles.agentCard} ${data.selectedAgent === agent.name ? styles.agentSelected : ''}`}
              onClick={() => selectAgent(agent.name)}
            >
              <div className={styles.agentAvatar} style={{ background: agent.color }}>{agent.initial}</div>
              <div className={styles.agentName}>{agent.name}</div>
              <div className={styles.agentPersonality}>{agent.personality}</div>
              <div className={styles.agentSample}>"{agent.sample}"</div>
              <div className={styles.agentTags}>
                {agent.tags.map(t => <span key={t} className={styles.agentTag}>{t}</span>)}
              </div>
              <button className={`${styles.selectBtn} ${data.selectedAgent === agent.name ? styles.selectedBtn : ''}`}>
                {data.selectedAgent === agent.name ? 'Selected' : 'Select'}
              </button>
            </div>
          ))}
        </div>
        <div className={styles.premiumSection}>
          <div className={styles.premiumTitle}>Unlock premium agents — starting ₹999/month</div>
          <div className={styles.premiumGrid}>
            {[1, 2].map(i => (
              <div key={i} className={styles.premiumCard}>
                <div style={{ height: 40, width: 40, borderRadius: '50%', margin: '0 auto 8px', background: '#ddd' }} />
                <div style={{ height: 12, width: '60%', margin: '0 auto 4px', background: '#ddd', borderRadius: 4 }} />
                <div style={{ height: 10, width: '80%', margin: '0 auto', background: '#ddd', borderRadius: 4 }} />
              </div>
            ))}
          </div>
          <div className={styles.premiumOverlay}>
            <div className={styles.premiumOverlayText}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>Premium Agents</span>
              <button className={styles.upgradeBtn}>Upgrade Plan</button>
            </div>
          </div>
        </div>
        <div className={styles.toggleRow} style={{ marginTop: 16 }}>
          <div className={styles.toggleInfo}>
            <div className={styles.toggleTitle}>Auto adapt to customer's tone</div>
            <div className={styles.toggleDesc}>Vi will mirror how each customer writes — formal or casual</div>
          </div>
          <label className={styles.toggle}>
            <input type="checkbox" checked={data.autoAdapt} onChange={e => setData(d => ({ ...d, autoAdapt: e.target.checked }))} />
            <span className={styles.toggleSlider} />
          </label>
        </div>
      </div>
    )
  },

  // Step 5: Review
  ({ data }) => {
    const totalFields = defaultFields.length + data.customerFields.length + data.customFields.length
    const selectedAgent = agents.find(a => a.name === data.selectedAgent)
    return (
      <div>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTitle}>Business Info</div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Name</span><span className={styles.summaryValue}>{data.businessName || '—'}</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Type</span><span className={styles.summaryValue}>{data.businessType || '—'}</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>City</span><span className={styles.summaryValue}>{data.city || '—'}</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>State</span><span className={styles.summaryValue}>{data.state || '—'}</span></div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTitle}>Owner Info</div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Name</span><span className={styles.summaryValue}>{data.ownerName || '—'}</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Phone</span><span className={styles.summaryValue}>{data.ownerPhone || '—'}</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Email</span><span className={styles.summaryValue}>{data.ownerEmail || '—'}</span></div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTitle}>Working Hours</div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Days</span><span className={styles.summaryValue}>{data.workingDays?.length || 0} days</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Hours</span><span className={styles.summaryValue}>{data.openTime || '—'} - {data.closeTime || '—'}</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Language</span><span className={styles.summaryValue}>{data.language || '—'}</span></div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryCardTitle}>Customer Fields</div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Default</span><span className={styles.summaryValue}>{defaultFields.length}</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Optional</span><span className={styles.summaryValue}>{data.customerFields.length}</span></div>
            <div className={styles.summaryRow}><span className={styles.summaryLabel}>Custom</span><span className={styles.summaryValue}>{data.customFields.length}</span></div>
          </div>
        </div>
        {selectedAgent && (
          <div style={{ textAlign: 'center', padding: 16, borderRadius: 'var(--radius-lg)', background: 'var(--color-accent-light)', marginBottom: 16 }}>
            <div className={styles.agentAvatar} style={{ background: selectedAgent.color, margin: '0 auto 8px', width: 48, height: 48, fontSize: 18 }}>{selectedAgent.initial}</div>
            <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{selectedAgent.name}</div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>Your AI Assistant</div>
          </div>
        )}
      </div>
    )
  },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const { setBusiness, setOnboardingComplete } = useApp()
  const [step, setStep] = useState(0)
  const [data, setData] = useState({
    businessName: '', businessType: '', businessCategory: '', gst: '', regNo: '',
    yearEst: '', employees: '', description: '', website: '', address1: '', address2: '',
    city: '', state: '', pincode: '', phone: '', email: '', whatsapp: '',
    ownerName: '', ownerPhone: '', ownerEmail: '', ownerGender: '', ownerDob: '',
    ownerDesignation: '', altName: '', altPhone: '',
    workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    openTime: '09:00', closeTime: '18:00', timezone: 'Asia/Kolkata',
    language: 'English', autoLang: true,
    customerFields: [],
    customFields: [],
    selectedAgent: 'Zara',
    autoAdapt: true,
  })

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1)
  }

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1)
  }

  const handleLaunch = () => {
    setBusiness(data)
    setOnboardingComplete(true)
    navigate('/dashboard')
  }

  return (
    <motion.div className={styles.page} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {/* Progress Bar */}
      <div className={styles.progressBar}>
        {stepLabels.map((label, i) => (
          <div key={label} className={styles.progressStep}>
            <div className={`${styles.stepCircle} ${i < step ? styles.stepDone : ''} ${i === step ? styles.stepActive : ''}`}>
              {i < step ? '✓' : i + 1}
            </div>
            {i < stepLabels.length - 1 && (
              <div className={`${styles.stepLine} ${i < step ? styles.stepLineDone : ''} ${i === step ? styles.stepLineActive : ''}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          className={styles.card}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.title}>
            {[
              'Tell us about your business',
              'About you, the owner',
              'When does your business operate?',
              'Set up your customer fields',
              'Meet your Vi AI Assistant',
              'Everything looks good!',
            ][step]}
          </div>
          <div className={styles.subtitle}>
            {[
              'Let\'s get your business set up on Vi',
              'We need a few details about you',
              'Set your business hours and preferences',
              'Tell Vi what information you collect',
              'Choose the personality that represents your brand',
              'Review everything before we launch',
            ][step]}
          </div>

          {steps[step]({ data, setData })}

          <div className={styles.actions}>
            <button className={styles.backBtn} onClick={handleBack} style={{ visibility: step === 0 ? 'hidden' : 'visible' }}>
              Back
            </button>
            {step < steps.length - 1 ? (
              <button className={styles.nextBtn} onClick={handleNext}>
                Continue
              </button>
            ) : (
              <div className={styles.launchWrap}>
                <button className={styles.launchBtn} onClick={handleLaunch}>
                  Launch My Vi Dashboard →
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.div>
  )
}
