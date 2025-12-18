'use client'

import { ReactNode } from 'react'
import { TutorialProvider } from './tutorial-provider'

export function TutorialWrapper({ children }: { children: ReactNode }) {
  return <TutorialProvider>{children}</TutorialProvider>
}

