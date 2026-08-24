"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

export interface ResizeHandle {
  axis: "vertical" | "horizontal";
  /** Called once on release, with the total drag distance in px. */
  onCommit: (deltaPx: number) => void;
}

interface DraggableJobCardProps {
  dragId: string;
  dragDisabled: boolean;
  dragData: Record<string, unknown>;
  className: string;
  style: CSSProperties;
  onClick: () => void;
  children: ReactNode;
  /** Omitted when this card doesn't support resizing (e.g. Month view chips). */
  resize?: ResizeHandle;
}

/**
 * A calendar job card that can be dragged (via dnd-kit, matching the kanban
 * pattern in src/app/dashboard/page.tsx) and, separately, resized from one
 * edge via raw pointer events - dnd-kit drags the whole element, so growing
 * just one edge while the rest stays put needs its own handling.
 */
export function DraggableJobCard({
  dragId,
  dragDisabled,
  dragData,
  className,
  style,
  onClick,
  children,
  resize,
}: DraggableJobCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: dragData,
    disabled: dragDisabled,
  });

  const [resizeDelta, setResizeDelta] = useState(0);

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!resize) return;
    e.stopPropagation();
    e.preventDefault();
    const startPos = resize.axis === "vertical" ? e.clientY : e.clientX;

    function handleMove(ev: PointerEvent) {
      const pos = resize!.axis === "vertical" ? ev.clientY : ev.clientX;
      setResizeDelta(pos - startPos);
    }
    function handleUp(ev: PointerEvent) {
      const pos = resize!.axis === "vertical" ? ev.clientY : ev.clientX;
      const finalDelta = pos - startPos;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      setResizeDelta(0);
      if (Math.abs(finalDelta) > 2) {
        resize!.onCommit(finalDelta);
      }
    }
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  }

  const resizeStyle: CSSProperties =
    resize && resizeDelta !== 0
      ? resize.axis === "vertical"
        ? { height: `calc(${style.height} + ${resizeDelta}px)` }
        : { width: `calc(${style.width} + ${resizeDelta}px)` }
      : {};

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={className}
      style={{
        ...style,
        ...resizeStyle,
        transform: transform ? CSS.Translate.toString(transform) : style.transform,
        opacity: isDragging ? 0.5 : style.opacity,
        zIndex: isDragging ? 50 : style.zIndex,
      }}
      onClick={onClick}
    >
      {children}
      {resize && (
        <div
          onPointerDown={handleResizePointerDown}
          className={
            resize.axis === "vertical"
              ? "absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize touch-none"
              : "absolute top-0 bottom-0 right-0 w-2 cursor-ew-resize touch-none"
          }
        />
      )}
    </div>
  );
}
