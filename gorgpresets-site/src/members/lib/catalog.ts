// Regras de leitura do catálogo (ordem de aulas, progresso, próxima aula...).
import type { Catalog, Lesson, Module, Product, Progress } from "./types";
import { sortByOrder } from "./format";

export function productModules(catalog: Catalog, productId: string, includeDrafts = false): Module[] {
  return sortByOrder(catalog.modules.filter((m) => m.productId === productId && (includeDrafts || m.published)));
}

/** Aulas do produto na ordem de consumo: módulo a módulo, aula a aula. */
export function productLessons(catalog: Catalog, productId: string, includeDrafts = false): Lesson[] {
  const modules = productModules(catalog, productId, includeDrafts);
  return modules.flatMap((m) =>
    sortByOrder(catalog.lessons.filter((l) => l.moduleId === m.id && (includeDrafts || l.published))),
  );
}

export function moduleLessons(catalog: Catalog, moduleId: string, includeDrafts = false): Lesson[] {
  return sortByOrder(catalog.lessons.filter((l) => l.moduleId === moduleId && (includeDrafts || l.published)));
}

export type ProgressMap = Map<string, Progress>;

export function productProgress(lessons: Lesson[], progress: ProgressMap) {
  const total = lessons.length;
  const done = lessons.filter((l) => progress.get(l.id)?.completed).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function lessonPercent(lesson: Lesson, progress: ProgressMap): number {
  const p = progress.get(lesson.id);
  if (!p) return 0;
  if (p.completed) return 100;
  const duration = p.duration || lesson.durationSeconds;
  return duration ? Math.min(100, Math.round((p.position / duration) * 100)) : 0;
}

/** Aula para o botão "Continuar": a última em andamento ou a primeira não concluída. */
export function resumeLesson(lessons: Lesson[], progress: ProgressMap): Lesson | undefined {
  const inProgress = lessons
    .map((l) => ({ l, p: progress.get(l.id) }))
    .filter((x) => x.p && !x.p.completed && x.p.position > 3)
    .sort((a, b) => (b.p!.updatedAt || "").localeCompare(a.p!.updatedAt || ""));
  if (inProgress[0]) return inProgress[0].l;
  return lessons.find((l) => !progress.get(l.id)?.completed) || lessons[0];
}

export interface ContinueItem {
  product: Product;
  lesson: Lesson;
  percent: number;
  updatedAt: string;
}

/** Vitrine "Continuar assistindo": uma aula por produto, do mais recente para o mais antigo. */
export function continueWatching(catalog: Catalog, progress: Progress[], owned: Set<string>): ContinueItem[] {
  const map: ProgressMap = new Map(progress.map((p) => [p.lessonId, p]));
  const latestByProduct = new Map<string, Progress>();
  progress.forEach((p) => {
    const current = latestByProduct.get(p.productId);
    if (!current || (p.updatedAt || "") > (current.updatedAt || "")) latestByProduct.set(p.productId, p);
  });

  const items: ContinueItem[] = [];
  latestByProduct.forEach((latest, productId) => {
    const product = catalog.products.find((p) => p.id === productId && p.published);
    if (!product || !owned.has(productId)) return;
    const lessons = productLessons(catalog, productId);
    let lesson = lessons.find((l) => l.id === latest.lessonId);
    if (!lesson) return;
    if (latest.completed) {
      const idx = lessons.indexOf(lesson);
      lesson = lessons.slice(idx + 1).find((l) => !map.get(l.id)?.completed);
      if (!lesson) return; // coleção concluída
    }
    items.push({ product, lesson, percent: lessonPercent(lesson, map), updatedAt: latest.updatedAt });
  });
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function totalDuration(lessons: Lesson[]): number {
  return lessons.reduce((sum, l) => sum + (l.durationSeconds || 0), 0);
}
