"use client"

import { Toaster as SonnerToaster } from "sonner"

/** Transient action feedback (saved/failed/etc). Bottom-right, away from the
 * persistent notification-bell toast which owns the top-right corner. */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "!rounded-lg !font-sans",
        },
      }}
    />
  )
}
