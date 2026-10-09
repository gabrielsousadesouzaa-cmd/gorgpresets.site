import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, LayoutTemplate, Plus } from "lucide-react";
import { useCatalog, useRepo } from "../../context/MembersContext";
import { blankProduct } from "../../lib/defaults";
import { sortByOrder } from "../../lib/format";
import { PosterArt } from "../../components/PosterArt";
import { Badge, Button, Card, EmptyState, PageHeader } from "../ui";
import { SortableList } from "../Sortable";
import { useAllMaterials, useStudioAction } from "../hooks";

export default function ProductsPage() {
  const { catalog, isLoading } = useCatalog();
  const { data: materials } = useAllMaterials();
  const repo = useRepo();
  const run = useStudioAction();
  const navigate = useNavigate();
  const products = sortByOrder(catalog.products);

  const create = async () => {
    const draft = { ...blankProduct(products.length), title: "Nova coleção", slug: `nova-colecao-${Date.now().toString(36)}`, published: false };
    const saved = await run(() => repo.saveProduct(draft), { success: "Coleção criada" });
    if (saved) navigate(`/membros/studio/colecoes/${saved.id}`);
  };

  return (
    <div>
      <PageHeader
        title="Coleções e aulas"
        subtitle="Cada coleção é um produto da sua área: tem capa, módulos, aulas em vídeo e arquivos para download. Arraste para mudar a ordem."
        actions={<Button icon={<Plus size={16} />} onClick={create}>Nova coleção</Button>}
      />

      {!isLoading && products.length === 0 ? (
        <EmptyState
          icon={<LayoutTemplate />}
          title="Nenhuma coleção ainda"
          text="Crie a primeira coleção para começar a montar módulos e subir as aulas."
          action={<Button icon={<Plus size={16} />} onClick={create}>Criar coleção</Button>}
        />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <SortableList
            items={products}
            onReorder={(ids) => run(() => repo.reorder("products", ids), { success: "Ordem salva" })}
            className="divide-y divide-black/[0.05]"
            itemClassName="bg-white"
            renderItem={(p, handle) => {
              const modules = catalog.modules.filter((m) => m.productId === p.id).length;
              const lessons = catalog.lessons.filter((l) => l.productId === p.id).length;
              const files = materials?.filter((m) => m.productId === p.id).length || 0;
              return (
                <div className="flex items-center gap-3 px-3 py-3 md:gap-4 md:px-5">
                  {handle}
                  <Link to={`/membros/studio/colecoes/${p.id}`} className="group flex min-w-0 flex-1 items-center gap-4">
                    <div className="relative aspect-[2/3] w-12 shrink-0 overflow-hidden rounded-lg ring-1 ring-black/10 md:w-14">
                      <PosterArt product={p} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-[15px] font-bold uppercase tracking-tight">{p.title || "Sem título"}</p>
                        {p.published ? <Badge tone="green">Publicada</Badge> : <Badge tone="amber">Rascunho</Badge>}
                        {p.isFree && <Badge tone="blue">Gratuita</Badge>}
                        {p.badge && <Badge tone="red">{p.badge}</Badge>}
                      </div>
                      <p className="mt-1 truncate text-[13px] text-[#86868b]">
                        {modules} {modules === 1 ? "módulo" : "módulos"} · {lessons} {lessons === 1 ? "aula" : "aulas"} · {files} {files === 1 ? "arquivo" : "arquivos"}
                        {p.priceLabel ? ` · ${p.priceLabel}` : ""}
                      </p>
                    </div>
                    <ChevronRight size={18} className="shrink-0 text-[#c7c7cc] transition-transform group-hover:translate-x-0.5 group-hover:text-[#1d1d1f]" />
                  </Link>
                </div>
              );
            }}
          />
        </Card>
      )}
    </div>
  );
}
