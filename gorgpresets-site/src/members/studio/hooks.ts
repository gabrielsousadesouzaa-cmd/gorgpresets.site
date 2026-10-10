import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRefreshPortal, useRepo } from "../context/MembersContext";

export function useStudioQuery<T>(key: string, fn: () => Promise<T>) {
  return useQuery({ queryKey: ["ma", "studio", key], queryFn: fn, staleTime: 15_000 });
}

export function useMembersList() {
  const repo = useRepo();
  return useStudioQuery("members", () => repo.listMembers());
}

export function useStats() {
  const repo = useRepo();
  return useStudioQuery("stats", () => repo.getStats());
}

export function useWebhookLogs() {
  const repo = useRepo();
  return useStudioQuery("logs", () => repo.listWebhookLogs());
}

export function useAllMaterials() {
  const repo = useRepo();
  return useStudioQuery("materials", () => repo.listMaterialsAdmin());
}

/** Executa uma ação do Studio com feedback (toast) e recarrega os dados afetados. */
export function useStudioAction() {
  const refresh = useRefreshPortal();
  return useCallback(
    async <T,>(fn: () => Promise<T>, options: { success?: string; scopes?: string[] } = {}): Promise<T | undefined> => {
      try {
        const result = await fn();
        await refresh(...(options.scopes || ["catalog", "studio", "access", "materials"]));
        if (options.success) toast.success(options.success);
        return result;
      } catch (err) {
        toast.error((err as Error).message || "Algo deu errado");
        return undefined;
      }
    },
    [refresh],
  );
}
