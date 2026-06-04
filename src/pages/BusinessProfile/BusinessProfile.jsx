import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../../context/AppContext'
import styles from './BusinessProfile.module.css'

const indianStates = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand',
  'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur',
  'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
]

const defaultForm = {
  business_name: '',
  business_type: 'Dental Clinic',
  email: '',
  phone: '',
  whatsapp: '',
  gst: '',
  address: '',
  city: '',
  state: 'Maharashtra',
  pincode: '',
  website: '',
  description: '',
  owner_name: '',
  owner_phone: '',
  owner_email: '',
  owner_designation: '',
  owner_dob: '',
  owner_gender: 'Male',
  working_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  opening_time: '09:00',
  closing_time: '18:00',
}

export default function BusinessProfile() {
  const { business, saveBusiness, businessLoading } = useApp()
  const [form, setForm] = useState(defaultForm)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (business) {
      setForm({
        business_name: business.business_name || '',
        business_type: business.business_type || 'Dental Clinic',
        email: business.email || '',
        phone: business.phone || '',
        whatsapp: business.whatsapp || '',
        gst: business.gst || '',
        address: business.address || '',
        city: business.city || '',
        state: business.state || 'Maharashtra',
        pincode: business.pincode || '',
        website: business.website || '',
        description: business.description || '',
        owner_name: business.owner_name || '',
        owner_phone: business.owner_phone || '',
        owner_email: business.owner_email || '',
        owner_designation: business.owner_designation || '',
        owner_dob: business.owner_dob || '',
        owner_gender: business.owner_gender || 'Male',
        working_days: business.working_days || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opening_time: business.opening_time || '09:00',
        closing_time: business.closing_time || '18:00',
      })
    }
  }, [business])

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      working_days: f.working_days.includes(day)
        ? f.working_days.filter(d => d !== day)
        : [...f.working_days, day],
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await saveBusiness(form)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  if (businessLoading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className={styles.pageTitle}>Business Profile</div>
        <div className={styles.pageSubtitle}>Loading...</div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className={styles.pageTitle}>Business Profile</div>
      <div className={styles.pageSubtitle}>Keep your business information up to date</div>

      {saved && <div className={styles.successMsg}>Changes saved successfully</div>}

      <div className={styles.twoCol}>
        {/* Business Info */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Business Information</div>
          <div className={styles.field}>
            <label className={styles.label}>Business Name</label>
            <input className={styles.input} value={form.business_name} onChange={set('business_name')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Business Type</label>
            <select className={styles.select} value={form.business_type} onChange={set('business_type')}>
              <option>Dental Clinic</option>
              <option>Retail Store</option>
              <option>Restaurant</option>
              <option>E-commerce</option>
              <option>Salon/Spa</option>
              <option>Healthcare</option>
              <option>Real Estate</option>
              <option>Other</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Business Email</label>
            <input className={styles.input} type="email" value={form.email} onChange={set('email')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Business Phone</label>
            <input className={styles.input} value={form.phone} onChange={set('phone')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>WhatsApp Business Number</label>
            <input className={styles.input} value={form.whatsapp} onChange={set('whatsapp')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>GST Number <span className={styles.optional}>(optional)</span></label>
            <input className={styles.input} value={form.gst} onChange={set('gst')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Address</label>
            <input className={styles.input} value={form.address} onChange={set('address')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>City</label>
            <input className={styles.input} value={form.city} onChange={set('city')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>State</label>
            <select className={styles.select} value={form.state} onChange={set('state')}>
              {indianStates.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>PIN Code</label>
            <input className={styles.input} value={form.pincode} onChange={set('pincode')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Website <span className={styles.optional}>(optional)</span></label>
            <input className={styles.input} value={form.website} onChange={set('website')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea className={styles.textarea} value={form.description} onChange={set('description')} />
          </div>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* Owner Info */}
        <div className={styles.sectionCard}>
          <div className={styles.sectionTitle}>Owner Information</div>
          <div className={styles.photoUpload}>
            <div className={styles.photoPreview}>
              {form.owner_name
                ? form.owner_name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                : '?'}
            </div>
            <button className={styles.photoBtn}>Change Photo</button>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Full Name</label>
            <input className={styles.input} value={form.owner_name} onChange={set('owner_name')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Phone Number</label>
            <input className={styles.input} value={form.owner_phone} onChange={set('owner_phone')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input className={styles.input} type="email" value={form.owner_email} onChange={set('owner_email')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Designation</label>
            <input className={styles.input} value={form.owner_designation} onChange={set('owner_designation')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Date of Birth</label>
            <input className={styles.input} type="date" value={form.owner_dob} onChange={set('owner_dob')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Gender</label>
            <select className={styles.select} value={form.owner_gender} onChange={set('owner_gender')}>
              <option>Male</option>
              <option>Female</option>
              <option>Prefer not to say</option>
            </select>
          </div>
          <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Working Hours */}
      <div className={styles.sectionCard} style={{ marginBottom: 24 }}>
        <div className={styles.sectionTitle}>Working Hours</div>
        <div className={styles.field}>
          <label className={styles.label}>Working Days</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
              <label key={day} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.working_days.includes(day)} onChange={() => toggleDay(day)} />
                {day.slice(0, 3)}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className={styles.field}>
            <label className={styles.label}>Opening Time</label>
            <input className={styles.input} type="time" value={form.opening_time} onChange={set('opening_time')} />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Closing Time</label>
            <input className={styles.input} type="time" value={form.closing_time} onChange={set('closing_time')} />
          </div>
        </div>
        <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className={styles.dangerZone}>
        <div className={styles.dangerTitle}>Danger Zone</div>
        <div className={styles.dangerText}>This will permanently delete all your data. This action cannot be undone.</div>
        <button className={styles.dangerBtn}>Delete Business Account</button>
      </div>
    </motion.div>
  )
}
