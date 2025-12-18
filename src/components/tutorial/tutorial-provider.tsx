'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface TutorialContextType {
  isRunning: boolean
  currentStep: number
  startTutorial: () => void
  stopTutorial: () => void
  nextStep: () => void
  previousStep: () => void
  isTutorialCompleted: boolean
  setTutorialCompleted: (completed: boolean) => void
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined)

export function TutorialProvider({ children }: { children: ReactNode }) {
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [isTutorialCompleted, setIsTutorialCompleted] = useState(false)
  
  // Check localStorage only on client side after mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTutorialCompleted(localStorage.getItem('tutorial_completed') === 'true')
    }
  }, [])

  const startTutorial = () => {
    setIsRunning(true)
    setCurrentStep(0)
  }

  const stopTutorial = () => {
    setIsRunning(false)
    setCurrentStep(0)
  }

  const nextStep = () => {
    setCurrentStep((prev) => prev + 1)
  }

  const previousStep = () => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }

  const setTutorialCompleted = (completed: boolean) => {
    setIsTutorialCompleted(completed)
    if (typeof window !== 'undefined') {
      if (completed) {
        localStorage.setItem('tutorial_completed', 'true')
      } else {
        localStorage.removeItem('tutorial_completed')
      }
    }
  }

  return (
    <TutorialContext.Provider
      value={{
        isRunning,
        currentStep,
        startTutorial,
        stopTutorial,
        nextStep,
        previousStep,
        isTutorialCompleted,
        setTutorialCompleted,
      }}
    >
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const context = useContext(TutorialContext)
  if (context === undefined) {
    // Return a safe default instead of throwing during SSR
    return {
      isRunning: false,
      currentStep: 0,
      startTutorial: () => {},
      stopTutorial: () => {},
      nextStep: () => {},
      previousStep: () => {},
      isTutorialCompleted: false,
      setTutorialCompleted: () => {},
    }
  }
  return context
}

