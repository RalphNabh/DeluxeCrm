'use client'

import { useEffect, useState, useRef } from 'react'

interface TutorialOverlayProps {
  targetSelector: string
  isActive: boolean
  onClose: () => void
}

export function TutorialOverlay({ targetSelector, isActive, onClose }: TutorialOverlayProps) {
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive) {
      setTargetRect(null)
      return
    }

    const updatePosition = () => {
      const target = document.querySelector(targetSelector)
      if (target) {
        const rect = target.getBoundingClientRect()
        setTargetRect(rect)
        // Scroll target into view
        target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    // Re-check after a short delay to ensure elements are rendered
    const timeout = setTimeout(updatePosition, 100)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      clearTimeout(timeout)
    }
  }, [targetSelector, isActive])

  if (!isActive || !targetRect) return null

  return (
    <>
      {/* Dark overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
        style={{
          clipPath: targetRect
            ? `polygon(
                0% 0%, 
                0% 100%, 
                ${targetRect.left}px 100%, 
                ${targetRect.left}px ${targetRect.top}px, 
                ${targetRect.right}px ${targetRect.top}px, 
                ${targetRect.right}px ${targetRect.bottom}px, 
                ${targetRect.left}px ${targetRect.bottom}px, 
                ${targetRect.left}px 100%, 
                100% 100%, 
                100% 0%
              )`
            : undefined,
        }}
      />

      {/* Highlight border */}
      <div
        className="fixed z-50 pointer-events-none border-4 border-blue-500 rounded-lg shadow-2xl transition-all"
        style={{
          left: `${targetRect.left - 4}px`,
          top: `${targetRect.top - 4}px`,
          width: `${targetRect.width + 8}px`,
          height: `${targetRect.height + 8}px`,
        }}
      />
    </>
  )
}


