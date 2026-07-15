import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
})

export const wsUrl = (executionId: string) => {
  const base = API_URL.replace('http', 'ws')
  return `${base}/ws/executions/${executionId}`
}
