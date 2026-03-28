import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/lib/mock-data";
import { getMemberStatus } from "@/lib/status";

// Use mockApi for demo; swap to `api` from @/lib/api for production
const dataSource = mockApi;

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: dataSource.getMembers,
    select: (members) => members.map(getMemberStatus),
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: dataSource.createMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["members"] }),
  });
}

export function usePayments(memberId: string) {
  return useQuery({
    queryKey: ["payments", memberId],
    queryFn: () => dataSource.getPayments(memberId),
    enabled: !!memberId,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: mockApi.createPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["members"] });
      qc.invalidateQueries({ queryKey: ["payments"] });
    },
  });
}
