import { supabase } from './supabase'

export async function fetchCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function addCustomer(customer) {
  const { data, error } = await supabase
    .from('customers')
    .insert([customer])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateCustomer(id, updates) {
  const { data, error } = await supabase
    .from('customers')
    .update(updates)
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCustomer(id) {
  const { error } = await supabase
    .from('customers')
    .delete()
    .eq('id', id)
  if (error) throw error
}

export async function fetchBusinessProfile() {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .maybeSingle()
  if (error) throw error
  return data
}

export async function upsertBusinessProfile(profile) {
  const allowed = [
    'user_id', 'business_name', 'business_type', 'email', 'phone', 'whatsapp',
    'gst', 'address', 'city', 'state', 'pincode', 'website', 'description',
    'owner_name', 'owner_phone', 'owner_email', 'owner_designation',
    'owner_dob', 'owner_gender', 'working_days', 'opening_time', 'closing_time',
    'whatsapp_phone', 'whatsapp_verified', 'meta_phone_number_id',
  ]
  const payload = {}
  for (const key of allowed) {
    if (key in profile) payload[key] = profile[key]
  }

  const { data, error } = await supabase
    .from('business_profiles')
    .upsert(payload, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}
