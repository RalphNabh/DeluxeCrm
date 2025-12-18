'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { useNotifications } from './notification-provider'
import { Button } from '@/components/ui/button'

export function NotificationToast() {
  const { notifications, markAsRead } = useNotifications()
  const [visible, setVisible] = useState(false)
  const [currentToastId, setCurrentToastId] = useState<string | null>(null)
  
  // Show toast for the most recent unread notification
  const latestUnread = notifications.find(n => !n.read && n.id !== currentToastId)

  useEffect(() => {
    if (latestUnread) {
      setVisible(true)
      setCurrentToastId(latestUnread.id)
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setVisible(false)
        markAsRead(latestUnread.id)
        setTimeout(() => setCurrentToastId(null), 300) // Reset after animation
      }, 5000)
      return () => clearTimeout(timer)
    } else {
      setVisible(false)
    }
  }, [latestUnread, markAsRead])

  if (!latestUnread || !visible) return null

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Info className="h-5 w-5 text-blue-600" />
    }
  }

  const getBgColor = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200'
      case 'error':
        return 'bg-red-50 border-red-200'
      default:
        return 'bg-blue-50 border-blue-200'
    }
  }

  return (
    <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top-5 fade-in duration-300">
      <div className={`rounded-lg border shadow-lg p-4 max-w-sm ${getBgColor(latestUnread.type)}`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(latestUnread.type)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900">{latestUnread.title}</p>
            <p className="text-sm text-gray-700 mt-1">{latestUnread.message}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0"
            onClick={() => {
              setVisible(false)
              markAsRead(latestUnread.id)
              setTimeout(() => setCurrentToastId(null), 300)
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

