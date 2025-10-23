'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, Mail, ArrowRight, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function SignupConfirmPage() {
  const [resending, setResending] = useState(false)
  const [resendMessage, setResendMessage] = useState<string | null>(null)
  const [showResendForm, setShowResendForm] = useState(false)
  const [email, setEmail] = useState('')
  const supabase = createClient()

  const handleResendConfirmation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    
    if (!email.trim()) {
      setResendMessage('Please enter your email address.')
      return
    }
    
    setResending(true)
    setResendMessage(null)
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
      })
      
      if (error) {
        setResendMessage('Failed to resend email. Please try again.')
      } else {
        setResendMessage('Confirmation email sent! Check your inbox.')
        setShowResendForm(false)
      }
    } catch (err) {
      setResendMessage('An error occurred. Please try again.')
    } finally {
      setResending(false)
    }
  }
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Account Created!
          </h2>
          <p className="text-gray-600">
            Your account has been successfully created.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mb-4">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <p className="text-gray-600 mb-4">
                We've sent you a confirmation email. Please check your inbox and click the verification link to activate your account.
              </p>
              <p className="text-sm text-gray-500">
                Don't see the email? Check your spam folder or{' '}
                <button 
                  onClick={() => setShowResendForm(!showResendForm)}
                  className="text-blue-600 hover:text-blue-500 underline"
                >
                  resend confirmation email
                </button>
              </p>
              
              {showResendForm && (
                <form onSubmit={handleResendConfirmation} className="mt-4 space-y-3">
                  <input
                    type="email"
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <div className="flex space-x-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={resending}
                      className="flex-1"
                    >
                      {resending ? (
                        <>
                          <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Resend Email'
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setShowResendForm(false)
                        setEmail('')
                        setResendMessage(null)
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
              
              {resendMessage && (
                <div className={`rounded-md p-3 text-sm ${
                  resendMessage.includes('sent') 
                    ? 'bg-green-50 text-green-700' 
                    : 'bg-red-50 text-red-700'
                }`}>
                  {resendMessage}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Link href="/login" className="block">
                <Button className="w-full">
                  Go to Sign In
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              
              <Link href="/" className="block">
                <Button variant="outline" className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                Once you've confirmed your email, you'll be able to access your dashboard and start managing your clients.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
