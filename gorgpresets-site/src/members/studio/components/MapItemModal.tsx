import { useEffect, useState } from "react";
import { useRepo } from "../../context/MembersContext";
import { uid } from "../../lib/format";
import type { CheckoutItem, Product } from "../../lib/types";
import { Button, Field, Input, Modal, Toggle } from "../ui";
import { useStudioAction } from "../hooks";
import { CollectionPicker } from "./CollectionPicker";

/** Produto do checkout novo (cadastro manual ou vindo de um evento do histórico). */
export function blankCheckoutItem(externalId = "", title = "", platform = ""): CheckoutItem {
  return { id: uid(), externalId, title, platform, productIds: [], ignored: false, email: null, salesCount: 0, lastSeenAt: null, createdAt: new Date().toISOString() };
}

/**
 * Liga um produto do checkout às coleções que ele libera (ou marca como
 * ignorado, ex: o produto "carrinho"). Usado em Automações e no histórico.
 */
export function MapItemModal({
  item,
  products,
  onClose,
  onSaved,
  isNew = false,
}: {
  item: CheckoutItem | null;
  products: Product[];
  onClose: () => void;
  onSaved?: (item: CheckoutItem) => void;
  isNew?: boolean;
}) {
  const repo = useRepo();
  const run = useStudioAction();
  const [draft, setDraft] = useState<CheckoutItem | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) setDraft(item);
  }, [item]);

  const set = (patch: Partial<CheckoutItem>) => setDraft((d) => (d ? { ...d, ...patch } : d));

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const saved = await run(() => repo.saveCheckoutItem(draft), { success: draft.ignored ? "Produto ignorado" : "Produto ligado às coleções", scopes: ["studio"] });
    setSaving(false);
    if (saved) {
      onSaved?.(saved);
      onClose();
    }
  };

  return (
    <Modal
      open={!!item}
      onClose={onClose}
      size="lg"
      title={isNew ? "Adicionar produto do checkout" : "Ligar produto às coleções"}
      description="Quando este produto for comprado, o comprador recebe acesso às coleções escolhidas."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} loading={saving} disabled={!draft?.externalId.trim()}>Salvar</Button>
        </>
      }
    >
      {draft && (
        <div className="space-y-6">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="ID do produto no checkout" hint="Exatamente como o checkout envia (ex: gAW1Y7y6Pfq7w604nzmD).">
              <Input value={draft.externalId} onChange={(e) => set({ externalId: e.target.value })} disabled={!isNew} className="font-mono" placeholder="ID do produto" autoFocus={isNew} />
            </Field>
            <Field label="Nome" hint="Como aparece no checkout.">
              <Input value={draft.title} onChange={(e) => set({ title: e.target.value })} placeholder="Ex: PACK MASTER" />
            </Field>
          </div>
          <div className="rounded-2xl bg-[#f5f5f7] p-4">
            <Toggle
              checked={draft.ignored}
              onChange={(ignored) => set({ ignored })}
              label="Ignorar este produto"
              description="Para itens que não liberam nada, como o produto “carrinho” do checkout. Ele para de aparecer como pendente."
            />
          </div>
          {!draft.ignored && (
            <Field label={`Coleções liberadas (${draft.productIds.length})`}>
              <CollectionPicker products={products} value={draft.productIds} onChange={(productIds) => set({ productIds })} />
            </Field>
          )}
        </div>
      )}
    </Modal>
  );
}
