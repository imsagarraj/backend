import { supabase } from './supabase'

const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession()
  return {
    'Content-Type': 'application/json',
    ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
  }
}

async function request(path, options = {}, retries = 1) {
  const headers = await authHeaders()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...options.headers },
  })
  if (!res.ok) {
    if (retries > 0 && res.status >= 500) {
      await new Promise(r => setTimeout(r, 2000))
      return request(path, options, retries - 1)
    }
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'API Error')
  }
  return res.json()
}

export function getDashboard() {
  return request('/dashboard')
}

export function getAnalytics(period = '30d') {
  return request(`/analytics?period=${period}`)
}

export function listAgents() {
  return request('/agents')
}

export function assignAgent(businessId, agentId) {
  return request(`/businesses/${businessId}/agent`, {
    method: 'PUT',
    body: JSON.stringify({ agent_id: agentId }),
  })
}

export function getMessages(customerId) {
  return request(`/messages?customer_id=${customerId}`)
}

export function sendMessage(customerId, messageText) {
  return request('/messages/send', {
    method: 'POST',
    body: JSON.stringify({ customer_id: customerId, message_text: messageText }),
  })
}

export function createCustomer(data) {
  return request('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function generateNotes(customerId) {
  return request(`/customers/${customerId}/generate-notes`, {
    method: 'POST',
  })
}

export function fetchBusinessProfile() {
  return request('/business-profile')
}

export function updateBusinessProfile(data) {
  return request('/business-profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteBusinessAccount() {
  return request('/business-profile', {
    method: 'DELETE',
  })
}

export function listCampaigns() {
  return request('/campaigns')
}

export function createCampaign(data) {
  return request('/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function sendCampaign(campaignId) {
  return request(`/campaigns/${campaignId}/send`, {
    method: 'POST',
  })
}

export function estimateCampaignAudience(data) {
  return request('/campaigns/estimate', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCampaign(campaignId, data) {
  return request(`/campaigns/${campaignId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })
}

export function deleteCampaign(campaignId) {
  return request(`/campaigns/${campaignId}`, {
    method: 'DELETE',
  })
}
