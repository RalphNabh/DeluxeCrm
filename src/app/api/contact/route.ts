import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { rateLimit, rateLimitHeaders } from '@/lib/rate-limit'
import { parseJsonBody, z } from '@/lib/validation'

const resend = new Resend(process.env.RESEND_API_KEY)

const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address').max(254),
  subject: z.string().trim().min(1, 'Subject is required').max(200),
  category: z.enum(['support', 'sales', 'general', 'bug', 'feature', 'other']),
  message: z.string().trim().min(1, 'Message is required').max(5000),
  // Honeypot: if filled, this is a bot.
  website: z.string().max(0, 'spam').optional().or(z.literal('')),
  // Optional Cloudflare Turnstile token (verified if TURNSTILE_SECRET_KEY is set).
  turnstileToken: z.string().optional(),
})

async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) {
    // Not configured: skip (will be enforced once configured in production).
    return true
  }
  if (!token) return false
  try {
    const formData = new URLSearchParams()
    formData.append('secret', secret)
    formData.append('response', token)
    formData.append('remoteip', ip)
    const res = await fetch(
      'https://challenges.cloudflare.com/turnstile/v0/siteverify',
      { method: 'POST', body: formData }
    )
    const data = (await res.json()) as { success?: boolean }
    return data.success === true
  } catch (err) {
    console.error('Turnstile verify error:', err)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const limit = await rateLimit(request, 'contact')
    if (!limit.success) {
      return NextResponse.json(
        { error: 'Too many messages from this IP. Please try again later.' },
        { status: 429, headers: rateLimitHeaders(limit) }
      )
    }

    const parsed = await parseJsonBody(request, contactSchema)
    if (!parsed.ok) return parsed.response
    const { name, email, subject, category, message, website, turnstileToken } = parsed.data

    // Honeypot check: silently accept then drop.
    if (website && website.length > 0) {
      return NextResponse.json({ success: true, message: 'Message sent successfully' })
    }

    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || ''
    const captchaOk = await verifyTurnstile(turnstileToken, ip)
    if (!captchaOk) {
      return NextResponse.json(
        { error: 'Captcha verification failed. Please try again.' },
        { status: 400 }
      )
    }

    // Map category to readable format
    const categoryMap: Record<string, string> = {
      support: 'Support',
      sales: 'Sales Inquiry',
      general: 'General Question',
      bug: 'Bug Report',
      feature: 'Feature Request',
      other: 'Other',
    }

    const categoryLabel = categoryMap[category] || category

    // Prepare email content
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'DyluxePro <onboarding@resend.dev>'
    // Contact form emails go to CONTACT_EMAIL if set, otherwise to RESEND_VERIFIED_EMAIL, or fallback
    // For now, using support@dyluxepro.com as the display email, but actual delivery goes to verified email
    const toEmail = process.env.CONTACT_EMAIL || process.env.RESEND_VERIFIED_EMAIL || 'nabhanralph@gmail.com'

    // Email to support team
    const supportEmailHtml = `
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Contact Form Submission</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .field { margin-bottom: 20px; }
          .field-label { font-weight: bold; color: #374151; margin-bottom: 5px; }
          .field-value { color: #6b7280; padding: 10px; background: #f9fafb; border-radius: 4px; }
          .category-badge { 
            display: inline-block; 
            padding: 6px 12px; 
            border-radius: 20px; 
            font-size: 14px; 
            font-weight: 500;
            background: #dbeafe; 
            color: #1e40af; 
          }
          .message-box { 
            padding: 15px; 
            background: #f9fafb; 
            border-left: 4px solid #2563eb; 
            border-radius: 4px; 
            white-space: pre-wrap; 
          }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>New Contact Form Submission</h1>
            <p>DyluxePro Contact Form</p>
          </div>
          
          <div class="content">
            <div class="field">
              <div class="field-label">Category</div>
              <div class="category-badge">${categoryLabel}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Name</div>
              <div class="field-value">${name}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Email</div>
              <div class="field-value">
                <a href="mailto:${email}" style="color: #2563eb; text-decoration: none;">${email}</a>
              </div>
            </div>
            
            <div class="field">
              <div class="field-label">Subject</div>
              <div class="field-value">${subject}</div>
            </div>
            
            <div class="field">
              <div class="field-label">Message</div>
              <div class="message-box">${message}</div>
            </div>
          </div>
          
          <div class="footer">
            <p>This message was sent from the DyluxePro contact form</p>
            <p style="font-size: 12px; margin-top: 10px;">
              Reply directly to this email or contact the user at: <a href="mailto:${email}" style="color: #2563eb;">${email}</a>
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send email to support team
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      replyTo: email, // Allow replying directly to the user
      subject: `[${categoryLabel}] ${subject} - Contact Form`,
      html: supportEmailHtml,
    })

    if (emailError) {
      console.error('Error sending contact form email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      )
    }

    // Send confirmation email to user (optional)
    const confirmationEmailHtml = `
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Message Received</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Message Received</h1>
            <p>DyluxePro</p>
          </div>
          
          <div class="content">
            <h2>Hello ${name},</h2>
            
            <p>Thank you for contacting DyluxePro. We&apos;ve received your message and will get back to you as soon as possible.</p>
            
            <div style="background: #f9fafb; padding: 15px; border-radius: 4px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Your message:</strong></p>
              <p style="margin: 5px 0 0 0; color: #6b7280;">${subject}</p>
            </div>
            
            <p><strong>Response Times:</strong></p>
            <ul>
              <li>Support: Within 24 hours</li>
              <li>Sales: Within 2-4 hours</li>
              <li>Urgent Issues: Same day</li>
            </ul>
            
            <p>If you have any additional questions or concerns, please don&apos;t hesitate to reach out to us directly at <a href="mailto:support@dyluxepro.com" style="color: #2563eb;">support@dyluxepro.com</a>.</p>
            
            <p>Best regards,<br>The DyluxePro Team</p>
          </div>
          
          <div class="footer">
            <p>This is an automated confirmation email from DyluxePro CRM</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send confirmation to user (don't fail if this fails)
    try {
      await resend.emails.send({
        from: fromEmail,
        to: [email],
        subject: 'We received your message - DyluxePro',
        html: confirmationEmailHtml,
      })
    } catch (confirmationError) {
      console.error('Error sending confirmation email:', confirmationError)
      // Don't fail the request if confirmation email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
    })

  } catch (error) {
    console.error('Error processing contact form:', error)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again later.' },
      { status: 500 }
    )
  }
}






