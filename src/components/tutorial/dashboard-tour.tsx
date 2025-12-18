'use client'

import { useEffect, useState } from 'react'
import { useTutorial } from './tutorial-provider'
import { TutorialOverlay } from './tutorial-overlay'
import { TutorialStep } from './tutorial-step'

export interface TutorialStepConfig {
  target: string
  title: string
  content: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

const DASHBOARD_TUTORIAL_STEPS: TutorialStepConfig[] = [
  {
    target: '[data-tutorial="pipeline"]',
    title: 'Welcome to DyluxePro! 🎉',
    content: `This is your sales pipeline dashboard. Here you can track all your leads from initial contact to completion.

The pipeline shows your leads organized by stage:
• New Leads - Fresh inquiries
• Estimate Sent - Quotes you've sent
• Approved - Accepted estimates
• Job Scheduled - Work in progress
• Completed - Finished projects

You can drag and drop leads between stages to update their status.`,
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="navigation"]',
    title: 'Navigation Menu',
    content: `Use the sidebar to navigate between different sections of your CRM:

• Dashboard - Overview of your pipeline
• Clients - Manage your customer database
• Estimates - Create and send quotes
• Invoices - Track billing and payments
• Calendar - Schedule jobs and appointments
• Reports - View business analytics
• Team - Manage team members
• Automations - Set up workflow automation
• Settings - Configure your account`,
    placement: 'right',
  },
  {
    target: '[data-tutorial="add-client"]',
    title: 'Add Your First Client',
    content: `Start by adding your first client! 

Click "Add Client" to create a new customer profile. You can store their contact information, address, and notes.

Once you have clients, you can create estimates and invoices for them.`,
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="estimates"]',
    title: 'Create Professional Estimates',
    content: `The Estimates section lets you create detailed quotes for your clients.

You can:
• Add line items with descriptions and pricing
• Calculate totals automatically with tax
• Send estimates directly to clients via email
• Track estimate status (Draft, Sent, Approved, etc.)

Clients can approve or request changes right from the email!`,
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="calendar"]',
    title: 'Schedule Jobs',
    content: `The Calendar helps you manage your work schedule and team.

Features include:
• View jobs by day, week, or month
• Schedule new jobs with clients
• Assign team members to jobs
• Track job status and completion
• View job locations and details`,
    placement: 'bottom',
  },
  {
    target: '[data-tutorial="reports"]',
    title: 'Track Your Business Performance',
    content: `The Reports section provides valuable insights into your business:

• Total revenue and growth trends
• Jobs completed and completion rates
• Client growth and new customers
• Estimate conversion rates
• Top clients by revenue

Use these metrics to make data-driven decisions about your business.`,
    placement: 'bottom',
  },
]

export function DashboardTour() {
  const {
    isRunning,
    currentStep,
    nextStep,
    previousStep,
    stopTutorial,
    setTutorialCompleted,
  } = useTutorial()
  const [activeTarget, setActiveTarget] = useState<string | null>(null)

  useEffect(() => {
    if (!isRunning) {
      setActiveTarget(null)
      return
    }

    if (currentStep >= DASHBOARD_TUTORIAL_STEPS.length) {
      setActiveTarget(null)
      return
    }

    const step = DASHBOARD_TUTORIAL_STEPS[currentStep]
    if (!step) {
      setActiveTarget(null)
      return
    }

    setActiveTarget(step.target)

    // Wait for element to be available
    const checkElement = setInterval(() => {
      if (typeof window === 'undefined') return
      const element = document.querySelector(step.target)
      if (element) {
        clearInterval(checkElement)
      }
    }, 100)

    return () => clearInterval(checkElement)
  }, [isRunning, currentStep])

  const handleNext = () => {
    if (currentStep < DASHBOARD_TUTORIAL_STEPS.length - 1) {
      nextStep()
    } else {
      handleFinish()
    }
  }

  const handleFinish = () => {
    setTutorialCompleted(true)
    stopTutorial()
  }

  const handleClose = () => {
    stopTutorial()
  }

  if (!isRunning) return null

  const currentStepConfig = DASHBOARD_TUTORIAL_STEPS[currentStep]
  if (!currentStepConfig) return null

  return (
    <>
      <TutorialOverlay
        targetSelector={activeTarget || ''}
        isActive={!!activeTarget}
        onClose={handleClose}
      />
      {activeTarget && (
        <TutorialStep
          title={currentStepConfig.title}
          content={currentStepConfig.content}
          step={currentStep}
          totalSteps={DASHBOARD_TUTORIAL_STEPS.length}
          onNext={handleNext}
          onPrevious={previousStep}
          onClose={handleFinish}
          placement={currentStepConfig.placement}
          targetSelector={activeTarget}
        />
      )}
    </>
  )
}

