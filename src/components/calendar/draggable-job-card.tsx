"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { useDraggable } from "@dnd-kit/core";

export interface ResizeHandle {
  axis: "vertical" | "horizontal";
  /** Called once on release, with the total drag distance in px. */
  onCommit: (deltaPx: number) => void;
}

/** The smallest a card is ever allowed to look while live-resizing, in px. */
const MIN_LIVE_RESIZE_PX = 20;

function parsePx(value: CSSProperties["height"]): number {
  const n = parseFloat(String(value ?? "0"));
  return Number.isFinite(n) ? n : 0;
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
 *
 * The card itself stays put in its original spot while dragging - the
 * moving "phantom" is a separate <DragOverlay> the parent renders, so
 * users can see both where the job is now and where it's headed.
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
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: dragId,
    data: dragData,
    disabled: dragDisabled,
  });

  const [resizeDelta, setResizeDelta] = useState(0);
  const [resizeStartPos, setResizeStartPos] = useState<number | null>(null);

  /**
   * Uses native pointer capture (not window-level listeners) so move/up
   * events keep reaching this exact handle for this exact gesture no matter
   * where the pointer travels - including if the browser fires pointercancel
   * instead of pointerup. A prior window-listener version could leak past an
   * interrupted gesture and misfire during a later, unrelated drag,
   * corrupting that job's time - this can't.
   */
  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!resize) return;
    e.stopPropagation();
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizeStartPos(resize.axis === "vertical" ? e.clientY : e.clientX);
  }

  function handleResizePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!resize || resizeStartPos === null) return;
    const pos = resize.axis === "vertical" ? e.clientY : e.clientX;
    const baseSize = parsePx(resize.axis === "vertical" ? style.height : style.width);
    const minDelta = MIN_LIVE_RESIZE_PX - baseSize;
    setResizeDelta(Math.max(pos - resizeStartPos, minDelta));
  }

  function releaseCapture(e: React.PointerEvent<HTMLDivElement>) {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setResizeStartPos(null);
    setResizeDelta(0);
  }

  function handleResizePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!resize || resizeStartPos === null) return;
    const pos = resize.axis === "vertical" ? e.clientY : e.clientX;
    const finalDelta = pos - resizeStartPos;
    releaseCapture(e);
    if (Math.abs(finalDelta) > 2) {
      resize.onCommit(finalDelta);
    }
  }

  /** A cancelled gesture (e.g. the browser interrupts it) discards the resize instead of committing a possibly-bogus delta. */
  function handleResizePointerCancel(e: React.PointerEvent<HTMLDivElement>) {
    releaseCapture(e);
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
      style={{ ...style, ...resizeStyle }}
      onClick={onClick}
    >
      {children}
      {resize && (
        <div
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          onPointerCancel={handleResizePointerCancel}
          className={
            resize.axis === "vertical"
              ? "group/resize absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize touch-none flex items-end justify-center pb-0.5"
              : "group/resize absolute top-0 bottom-0 right-0 w-3 cursor-ew-resize touch-none flex items-center justify-end pr-0.5"
          }
        >
          <div
            className={
              resize.axis === "vertical"
                ? "h-1 w-8 rounded-full bg-gray-900/0 group-hover/resize:bg-gray-900/40 transition-colors"
                : "w-1 h-8 rounded-full bg-gray-900/0 group-hover/resize:bg-gray-900/40 transition-colors"
            }
          />
        </div>
      )}
    </div>
  );
}
