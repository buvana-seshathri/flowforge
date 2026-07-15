import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from './client'
import { Workflow, Execution, ExecutionLog } from '../types'

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn: async () => (await apiClient.get<Workflow[]>('/workflows')).data,
  })
}

export function useWorkflow(id?: string) {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => (await apiClient.get<Workflow>(`/workflows/${id}`)).data,
    enabled: !!id,
  })
}

export function useCreateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Workflow>) =>
      (await apiClient.post<Workflow>('/workflows', payload)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

export function useUpdateWorkflow(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: Partial<Workflow>) =>
      (await apiClient.put<Workflow>(`/workflows/${id}`, payload)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      qc.invalidateQueries({ queryKey: ['workflow', id] })
    },
  })
}

export function useSetWorkflowStatus(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (status: string) =>
      (await apiClient.patch(`/workflows/${id}/status`, { status })).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      qc.invalidateQueries({ queryKey: ['workflow', id] })
    },
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.delete(`/workflows/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workflows'] }),
  })
}

export function useTriggerWorkflow(id: string) {
  return useMutation({
    mutationFn: async (input: Record<string, unknown> = {}) =>
      (await apiClient.post<Execution>(`/workflows/${id}/trigger`, input)).data,
  })
}

export function useExecutions(workflowId?: string) {
  return useQuery({
    queryKey: ['executions', workflowId],
    queryFn: async () =>
      (await apiClient.get<Execution[]>(`/workflows/${workflowId}/executions`)).data,
    enabled: !!workflowId,
    refetchInterval: 4000,
  })
}

export function useExecutionLogs(executionId?: string) {
  return useQuery({
    queryKey: ['executionLogs', executionId],
    queryFn: async () =>
      (await apiClient.get<ExecutionLog[]>(`/executions/${executionId}/logs`)).data,
    enabled: !!executionId,
  })
}
