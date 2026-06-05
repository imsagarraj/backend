const API_BASE = import.meta.env.VITE_API_URL || '/api/v1'

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || 'API Error')
  }
  return res.json()
}

export function getDashboard(businessId) {
  return request(`/dashboard?business_id=${businessId}`)
}

export function getAnalytics(businessId, period = '30d') {
  return request(`/analytics?business_id=${businessId}&period=${period}`)
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

export function listCustomers(businessId) {
  return request(`/customers?business_id=${businessId}`)
}

export function createCustomer(data) {
  return request('/customers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function updateCustomer(id, data) {
  return request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteCustomer(id) {
  return request(`/customers/${id}`, { method: 'DELETE' })
}

export function getCustomerDetail(id) {
  return request(`/customers/${id}`)
}

export function syncWhatsappNumber(businessId) {
  return request(`/businesses/${businessId}/whatsapp/sync`, { method: 'POST' })
}
