import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MembersRepo } from "../lib/repo";
import { localRepo } from "../lib/localRepo";
import { supabaseRepo } from "../lib/supabaseRepo";
import type { Catalog, Progress } from "../lib/types";
import type { ProgressMap } from "../lib/catalog";

const DEMO_FLAG = "gorg-members-demo-mode";

/** Demo quando não há Supabase ou quando o link tem ?demo=1 (desliga com ?demo=0). */
function pickRepo(): MembersRepo {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("demo") === "1") sessionStorage.setItem(DEMO_FLAG, "1");
    if (params.get("demo") === "0") sessionStorage.removeItem(DEMO_FLAG);
    if (sessionStorage.getItem(DEMO_FLAG) === "1") return localRepo;
  } catch {
    /* sessionStorage indisponível */
  }
  return supabase ? supabaseRepo : localRepo;
}

export function enableDemoMode() {
  try {
    sessionStorage.setItem(DEMO_FLAG, "1");
  } catch {
    /* ignore */
  }
  window.location.assign("/membros");
}

const RepoContext = createContext<MembersRepo>(localRepo);

export function MembersProvider({ children }: { children: ReactNode }) {
  const [repo] = useState(pickRepo);
  const queryClient = useQueryClient();

  useEffect(
    () => repo.onAuthChange(() => queryClient.invalidateQueries({ queryKey: ["ma"] })),
    [repo, queryClient],
  );

  return <RepoContext.Provider value={repo}>{children}</RepoContext.Provider>;
}

export const useRepo = () => useContext(RepoContext);

export function useAuth() {
  const repo = useRepo();
  const query = useQuery({ queryKey: ["ma", "auth"], queryFn: () => repo.getAuth(), staleTime: 60_000, retry: false });
  return {
    user: query.data?.user ?? null,
    needsMfa: query.data?.needsMfa ?? false,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}

export function useSettings() {
  const repo = useRepo();
  return useQuery({ queryKey: ["ma", "settings"], queryFn: () => repo.getSettings(), staleTime: 5 * 60_000, retry: false });
}

const EMPTY_CATALOG: Catalog = { products: [], modules: [], lessons: [], rows: [] };

export function useCatalog() {
  const repo = useRepo();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["ma", "catalog", user?.id],
    queryFn: () => repo.getCatalog(),
    enabled: !!user,
    staleTime: 60_000,
    retry: false,
  });
  return { ...query, catalog: query.data ?? EMPTY_CATALOG };
}

export function useAccess() {
  const repo = useRepo();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["ma", "access", user?.id],
    queryFn: () => repo.getMyAccess(),
    enabled: !!user,
    staleTime: 60_000,
  });
  const owned = useMemo(() => new Set(query.data ?? []), [query.data]);
  return { owned, loading: query.isLoading };
}

export function useProgress() {
  const repo = useRepo();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const key = useMemo(() => ["ma", "progress", user?.id], [user?.id]);
  const query = useQuery({ queryKey: key, queryFn: () => repo.getProgress(), enabled: !!user, staleTime: 30_000 });
  const list = useMemo(() => query.data ?? [], [query.data]);
  const map: ProgressMap = useMemo(() => new Map(list.map((p) => [p.lessonId, p])), [list]);

  const save = useCallback(
    async (entry: Progress) => {
      queryClient.setQueryData<Progress[]>(key, (old = []) => {
        const next = old.filter((p) => p.lessonId !== entry.lessonId);
        next.push(entry);
        return next;
      });
      try {
        await repo.saveProgress(entry);
      } catch (err) {
        console.warn("Não foi possível salvar o progresso", err);
      }
    },
    [queryClient, key, repo],
  );

  return { list, map, save, loading: query.isLoading };
}

export function useMaterials(productId: string | undefined, enabled = true) {
  const repo = useRepo();
  const { user } = useAuth();
  return useQuery({
    queryKey: ["ma", "materials", user?.id, productId],
    queryFn: () => repo.getMaterials(productId!),
    enabled: !!user && !!productId && enabled,
  });
}

/** Recarrega dados do portal depois de uma alteração feita no Studio. */
export function useRefreshPortal() {
  const queryClient = useQueryClient();
  return useCallback(
    (...scopes: string[]) =>
      Promise.all(
        (scopes.length ? scopes : ["catalog", "settings", "access", "materials", "studio"]).map((scope) =>
          queryClient.invalidateQueries({ queryKey: ["ma", scope] }),
        ),
      ),
    [queryClient],
  );
}
