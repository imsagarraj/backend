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
  const { data, error } = await supabase
    .from('business_profiles')
    .upsert(profile, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}
