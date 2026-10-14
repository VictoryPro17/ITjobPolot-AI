import { keepPreviousData, useInfiniteQuery, useMutation, useQueryClient, type InfiniteData } from "@tanstack/react-query";

import {
  changeStatus,
  getApplications,
  type ApplicationListItem,
  type ApplicationSortField,
  type ApplicationStatus,
  type ApplicationSummary,
  type PagedApplications,
} from "@/features/applications/api";
import type { BoardSort } from "@/features/kanban/useBoardPreferences";

export const KANBAN_PAGE_SIZE = 15;
const kanbanRoot = ["applications", "kanban"] as const;

type ColumnData = InfiniteData<PagedApplications, number>;

const sortParams: Record<BoardSort, { sortBy: ApplicationSortField; sortDescending: boolean }> = {
  updated: { sortBy: "UpdatedAt", sortDescending: true },
  applied: { sortBy: "AppliedOn", sortDescending: true },
  company: { sortBy: "CompanyName", sortDescending: false },
};

function columnKey(status: ApplicationStatus, search: string, sort: BoardSort) {
  return [...kanbanRoot, status, search, sort] as const;
}

/** Eine Board-Spalte: laedt ihre Bewerbungen seitenweise, unabhaengig von den anderen Spalten. */
export function useKanbanColumn(status: ApplicationStatus, search: string, sort: BoardSort) {
  const query = useInfiniteQuery({
    queryKey: columnKey(status, search, sort),
    queryFn: ({ pageParam }) =>
      getApplications({ search, status, page: pageParam, pageSize: KANBAN_PAGE_SIZE, ...sortParams[sort] }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.hasNextPage ? last.page + 1 : undefined),
    placeholderData: keepPreviousData,
  });

  // Nach einem optimistischen Verschieben koennen sich Seiten kurz ueberlappen; doppelte Karten vermeiden.
  const seen = new Set<string>();
  const items: ApplicationListItem[] = [];
  for (const page of query.data?.pages ?? []) {
    for (const item of page.items) {
      if (!seen.has(item.id)) {
        seen.add(item.id);
        items.push(item);
      }
    }
  }

  const total = query.data?.pages[0]?.totalCount ?? 0;
  return { query, items, total };
}

function removeItem(data: ColumnData | undefined, id: string): ColumnData | undefined {
  if (!data || !data.pages.some((page) => page.items.some((item) => item.id === id))) return data;
  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.filter((item) => item.id !== id),
      totalCount: Math.max(0, page.totalCount - 1),
    })),
  };
}

function insertItem(data: ColumnData | undefined, item: ApplicationListItem): ColumnData | undefined {
  if (!data || data.pages.length === 0) return data;
  return {
    ...data,
    pages: data.pages.map((page, index) => ({
      ...page,
      items: index === 0 ? [item, ...page.items] : page.items,
      totalCount: page.totalCount + 1,
    })),
  };
}

/**
 * Statuswechsel mit sofortiger Anzeige: Karte wandert direkt in die Zielspalte,
 * Zaehler und Uebersicht passen sich an. Bei einem Fehler wird alles zurueckgesetzt.
 */
export function useMoveApplication(search: string, sort: BoardSort) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ item, status }: { item: ApplicationListItem; status: ApplicationStatus }) => changeStatus(item.id, status),
    onMutate: async ({ item, status }) => {
      await queryClient.cancelQueries({ queryKey: kanbanRoot });
      const snapshots = queryClient.getQueriesData<ColumnData>({ queryKey: kanbanRoot });
      const summary = queryClient.getQueryData<ApplicationSummary>(["summary"]);

      queryClient.setQueriesData<ColumnData>({ queryKey: [...kanbanRoot, item.status] }, (data) => removeItem(data, item.id));
      queryClient.setQueryData<ColumnData>(columnKey(status, search, sort), (data) =>
        insertItem(data, { ...item, status, updatedAt: new Date().toISOString() }),
      );
      if (summary) {
        queryClient.setQueryData<ApplicationSummary>(["summary"], {
          ...summary,
          byStatus: {
            ...summary.byStatus,
            [item.status]: Math.max(0, (summary.byStatus[item.status] ?? 0) - 1),
            [status]: (summary.byStatus[status] ?? 0) + 1,
          },
        });
      }

      return { snapshots, summary };
    },
    onError: (_error, _variables, context) => {
      for (const [key, data] of context?.snapshots ?? []) {
        queryClient.setQueryData(key, data);
      }
      if (context?.summary) {
        queryClient.setQueryData(["summary"], context.summary);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["summary"] });
      void queryClient.invalidateQueries({ queryKey: ["statistics"] });
    },
  });
}
