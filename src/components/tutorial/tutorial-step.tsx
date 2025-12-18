'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface TutorialStepProps {
  title: string
  content: string
  step: number
  totalSteps: number
  onNext: () => void
  onPrevious: () => void
  onClose: () => void
  placement?: 'top' | 'bottom' | 'left' | 'right'
  targetSelector?: string
}

export function TutorialStep({
  title,
  content,
  step,
  totalSteps,
  onNext,
  onPrevious,
  onClose,
  placement = 'bottom',
  targetSelector,
}: TutorialStepProps) {
  const [position, setPosition] = useState({ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' })

  useEffect(() => {
    if (!targetSelector) return

    const updatePosition = () => {
      const target = document.querySelector(targetSelector || '')
      if (target) {
        const rect = target.getBoundingClientRect()
        const scrollY = window.scrollY
        const scrollX = window.scrollX

        // Calculate position with viewport constraints
        const viewportHeight = window.innerHeight
        const viewportWidth = window.innerWidth
        const cardHeight = 450 // Max card height
        const cardWidth = 384 // w-96 = 384px
        const padding = 16

        let top = '50%'
        let left = '50%'
        let transform = 'translate(-50%, -50%)'

        switch (placement) {
          case 'bottom': {
            let bottomTop = rect.bottom + scrollY + 16
            let centerX = rect.left + scrollX + rect.width / 2
            
            // If card would go off bottom, position above target instead
            if (bottomTop + cardHeight > scrollY + viewportHeight - padding) {
              let topPosition = rect.top + scrollY - 16
              // If still doesn't fit, center it vertically
              if (topPosition - cardHeight < scrollY + padding) {
                top = `${Math.max(scrollY + padding, Math.min(scrollY + viewportHeight - cardHeight - padding, scrollY + viewportHeight / 2 - cardHeight / 2))}px`
                transform = 'translate(-50%, 0)'
              } else {
                top = `${topPosition}px`
                transform = 'translate(-50%, -100%)'
              }
            } else {
              top = `${bottomTop}px`
              transform = 'translateX(-50%)'
            }
            
            // Ensure card doesn't go off left/right edges
            let leftPosition = centerX
            if (centerX - cardWidth / 2 < padding) {
              leftPosition = padding + cardWidth / 2
            } else if (centerX + cardWidth / 2 > viewportWidth - padding) {
              leftPosition = viewportWidth - padding - cardWidth / 2
            }
            left = `${leftPosition}px`
            break
          }
          case 'top': {
            let topTop = rect.top + scrollY - 16
            let centerX = rect.left + scrollX + rect.width / 2
            
            // If card would go off top, position below target instead
            if (topTop - cardHeight < scrollY + padding) {
              let bottomPosition = rect.bottom + scrollY + 16
              // If still doesn't fit, center it vertically
              if (bottomPosition + cardHeight > scrollY + viewportHeight - padding) {
                top = `${Math.max(scrollY + padding, Math.min(scrollY + viewportHeight - cardHeight - padding, scrollY + viewportHeight / 2 - cardHeight / 2))}px`
                transform = 'translate(-50%, 0)'
              } else {
                top = `${bottomPosition}px`
                transform = 'translateX(-50%)'
              }
            } else {
              top = `${topTop}px`
              transform = 'translate(-50%, -100%)'
            }
            
            let leftPosition = centerX
            if (centerX - cardWidth / 2 < padding) {
              leftPosition = padding + cardWidth / 2
            } else if (centerX + cardWidth / 2 > viewportWidth - padding) {
              leftPosition = viewportWidth - padding - cardWidth / 2
            }
            left = `${leftPosition}px`
            break
          }
          case 'right': {
            let rightLeft = rect.right + scrollX + 16
            let centerY = rect.top + scrollY + rect.height / 2
            
            // If card would go off right, position to left instead
            if (rightLeft + cardWidth > viewportWidth - padding) {
              let leftPosition = rect.left + scrollX - 16
              if (leftPosition - cardWidth < padding) {
                // Center horizontally if doesn't fit
                left = `${Math.max(padding + cardWidth / 2, Math.min(viewportWidth - padding - cardWidth / 2, viewportWidth / 2))}px`
                transform = 'translate(-50%, -50%)'
              } else {
                left = `${leftPosition}px`
                transform = 'translate(-100%, -50%)'
              }
            } else {
              left = `${rightLeft}px`
              transform = 'translateY(-50%)'
            }
            
            // Ensure card doesn't go off top/bottom
            let topPosition = centerY
            if (centerY - cardHeight / 2 < scrollY + padding) {
              topPosition = scrollY + padding + cardHeight / 2
            } else if (centerY + cardHeight / 2 > scrollY + viewportHeight - padding) {
              topPosition = scrollY + viewportHeight - padding - cardHeight / 2
            }
            top = `${topPosition}px`
            break
          }
          case 'left': {
            let leftLeft = rect.left + scrollX - 16
            let centerY = rect.top + scrollY + rect.height / 2
            
            // If card would go off left, position to right instead
            if (leftLeft - cardWidth < padding) {
              let rightPosition = rect.right + scrollX + 16
              if (rightPosition + cardWidth > viewportWidth - padding) {
                // Center horizontally if doesn't fit
                left = `${Math.max(padding + cardWidth / 2, Math.min(viewportWidth - padding - cardWidth / 2, viewportWidth / 2))}px`
                transform = 'translate(-50%, -50%)'
              } else {
                left = `${rightPosition}px`
                transform = 'translateY(-50%)'
              }
            } else {
              left = `${leftLeft}px`
              transform = 'translate(-100%, -50%)'
            }
            
            // Ensure card doesn't go off top/bottom
            let topPosition = centerY
            if (centerY - cardHeight / 2 < scrollY + padding) {
              topPosition = scrollY + padding + cardHeight / 2
            } else if (centerY + cardHeight / 2 > scrollY + viewportHeight - padding) {
              topPosition = scrollY + viewportHeight - padding - cardHeight / 2
            }
            top = `${topPosition}px`
            break
          }
        }

        setPosition({ top, left, transform })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [targetSelector, placement])

  return (
    <Card
      className="fixed z-50 w-96 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] shadow-2xl flex flex-col"
      style={position}
    >
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-sm text-gray-500">
          Step {step + 1} of {totalSteps}
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-2 mb-4">
          <p className="text-sm text-gray-700 whitespace-pre-line">{content}</p>
        </div>
        <div className="flex items-center justify-between flex-shrink-0 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={onPrevious}
            disabled={step === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex gap-2">
            {step < totalSteps - 1 ? (
              <Button size="sm" onClick={onNext}>
                Next Tip
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button size="sm" onClick={onClose}>
                Get Started
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

