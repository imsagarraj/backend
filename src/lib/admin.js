import { supabase } from './supabase'

const API = import.meta.env.VITE_API_URL || '/api/v1'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
  }
}

async function request(path, options = {}) {
  const headers = await authHeaders()
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'Request failed')
  }
  return res.json()
}

export function verifyAdmin() {
  return request('/admin/verify')
}

export function listBusinesses() {
  return request('/admin/businesses')
}

export function getBusinessDetail(id) {
  return request(`/admin/businesses/${id}`)
}

export function getPipelineStatus(businessId) {
  const params = businessId ? `?business_id=${businessId}` : ''
  return request(`/admin/pipeline${params}`)
}

export function retryPipelineItem(itemId) {
  return request(`/admin/pipeline/${itemId}/retry`, { method: 'POST' })
}

export function retryAllFailed() {
  return request('/admin/pipeline/retry-all', { method: 'POST' })
}

export function cancelPipelineItem(itemId) {
  return request(`/admin/pipeline/${itemId}/cancel`, { method: 'POST' })
}

export function deletePipelineItem(itemId) {
  return request(`/admin/pipeline/${itemId}`, { method: 'DELETE' })
}

export function listAgents() {
  return request('/admin/agents')
}

export function getFollowups() {
  return request('/admin/followups')
}

export function updateAgent(id, data) {
  return request(`/admin/agents/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function updateFollowupDate(sequenceId, scheduledDate) {
  return request(`/admin/followups/${sequenceId}`, {
    method: 'PATCH',
    body: JSON.stringify({ scheduled_date: scheduledDate }),
  })
}
