import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/api/client";
import type { ExpenseFilters, ExpenseInput } from "@/api/types";

export const keys = {
  categories: ["categories"] as const,
  expenses: (f: ExpenseFilters) => ["expenses", f] as const,
  expense: (id: string) => ["expense", id] as const,
  summary: (month: string) => ["summary", month] as const,
  trends: (months: number) => ["trends", months] as const,
};

export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: api.listCategories,
    staleTime: 1000 * 60 * 60,
  });
}

export function useExpenses(filters: ExpenseFilters) {
  return useQuery({
    queryKey: keys.expenses(filters),
    queryFn: () => api.listExpenses(filters),
  });
}

export function useExpense(id: string) {
  return useQuery({
    queryKey: keys.expense(id),
    queryFn: () => api.getExpense(id),
    enabled: Boolean(id),
  });
}

export function useSummary(month: string) {
  return useQuery({
    queryKey: keys.summary(month),
    queryFn: () => api.summary(month),
  });
}

export function useTrends(months = 6) {
  return useQuery({
    queryKey: keys.trends(months),
    queryFn: () => api.trends(months),
  });
}

function invalidateLists(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["expenses"] });
  qc.invalidateQueries({ queryKey: ["summary"] });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExpenseInput) => api.createExpense(input),
    onSuccess: () => invalidateLists(qc),
  });
}

export function useUpdateExpense(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<ExpenseInput>) => api.updateExpense(id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.expense(id) });
      invalidateLists(qc);
    },
  });
}

export function useDeleteExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteExpense(id),
    onSuccess: () => invalidateLists(qc),
  });
}
