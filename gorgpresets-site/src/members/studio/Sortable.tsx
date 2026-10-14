import { useEffect, useRef, useState, type ReactNode } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableListProps<T extends { id: string }> {
  items: T[];
  onReorder: (ids: string[]) => void;
  renderItem: (item: T, handle: ReactNode, index: number) => ReactNode;
  className?: string;
  itemClassName?: string;
}

/** Lista reordenável por arrastar (alça à esquerda). Salva só ao soltar. */
export function SortableList<T extends { id: string }>({ items, onReorder, renderItem, className, itemClassName }: SortableListProps<T>) {
  const [order, setOrder] = useState(() => items.map((i) => i.id));
  const orderRef = useRef(order);
  orderRef.current = order;
  const dragging = useRef(false);

  const itemsKey = items.map((i) => i.id).join("|");
  useEffect(() => {
    if (!dragging.current) setOrder(itemsKey ? itemsKey.split("|") : []);
  }, [itemsKey]);

  const byId = new Map(items.map((i) => [i.id, i]));
  const commit = () => {
    dragging.current = false;
    const original = items.map((i) => i.id);
    if (orderRef.current.join() !== original.join()) onReorder(orderRef.current);
  };

  return (
    <Reorder.Group axis="y" values={order} onReorder={setOrder} as="div" className={className}>
      {order.map((id, index) => {
        const item = byId.get(id);
        if (!item) return null;
        return (
          <SortableItem key={id} id={id} className={itemClassName} onDragStart={() => (dragging.current = true)} onDragEnd={commit}>
            {(handle) => renderItem(item, handle, index)}
          </SortableItem>
        );
      })}
    </Reorder.Group>
  );
}

function SortableItem({ id, children, className, onDragStart, onDragEnd }: { id: string; children: (handle: ReactNode) => ReactNode; className?: string; onDragStart: () => void; onDragEnd: () => void }) {
  const controls = useDragControls();
  const handle = (
    <button
      type="button"
      aria-label="Arrastar para reordenar"
      onPointerDown={(e) => {
        e.preventDefault();
        controls.start(e);
      }}
      className="grid h-8 w-6 shrink-0 cursor-grab touch-none place-items-center rounded-md text-[#c7c7cc] transition-colors hover:bg-black/[0.04] hover:text-[#6e6e73] active:cursor-grabbing"
    >
      <GripVertical size={16} />
    </button>
  );
  return (
    <Reorder.Item
      value={id}
      as="div"
      dragListener={false}
      dragControls={controls}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn("relative", className)}
      whileDrag={{ scale: 1.015, boxShadow: "0 20px 40px -12px rgba(0,0,0,0.25)", zIndex: 20 }}
    >
      {children(handle)}
    </Reorder.Item>
  );
}
