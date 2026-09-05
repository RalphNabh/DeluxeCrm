"use client"

import * as React from "react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { cn } from "@/lib/utils"

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  /** "destructive" styles the confirm button red — use for deletes and other irreversible actions. */
  variant?: "default" | "destructive"
}

type ConfirmState = ConfirmOptions & {
  resolve: (value: boolean) => void
}

const ConfirmContext = React.createContext<
  ((options: ConfirmOptions) => Promise<boolean>) | null
>(null)

/**
 * Drop-in replacement for window.confirm() that matches the app's own
 * dialog styling instead of the browser's native prompt.
 *
 *   const confirm = useConfirm();
 *   const ok = await confirm({ title: "Delete task?", variant: "destructive" });
 *   if (!ok) return;
 */
export function useConfirm() {
  const ctx = React.useContext(ConfirmContext)
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider")
  }
  return ctx
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<ConfirmState | null>(null)

  const confirm = React.useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setState({ ...options, resolve })
    })
  }, [])

  const settle = (value: boolean) => {
    state?.resolve(value)
    setState(null)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={state !== null}
        onOpenChange={(open) => {
          if (!open) settle(false)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{state?.title}</AlertDialogTitle>
            {state?.description ? (
              <AlertDialogDescription>
                {state.description}
              </AlertDialogDescription>
            ) : null}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => settle(false)}>
              {state?.cancelLabel || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => settle(true)}
              className={cn(
                state?.variant === "destructive" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              )}
            >
              {state?.confirmLabel || "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}
