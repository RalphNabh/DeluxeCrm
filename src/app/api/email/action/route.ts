import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { estimateId, action, clientEmail, clientName } = await request.json()
    
    if (!estimateId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = await createClient()
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Update estimate status based on action
    let newStatus = ''
    let emailSubject = ''
    let emailMessage = ''

    if (action === 'approve') {
      newStatus = 'Approved'
      emailSubject = `Estimate Approved - ${estimateId.slice(0, 8)}`
      emailMessage = `Great news! Your estimate has been approved. We'll be in touch soon to schedule the work.`
    } else if (action === 'request_changes') {
      newStatus = 'Changes Requested'
      emailSubject = `Estimate Changes Requested - ${estimateId.slice(0, 8)}`
      emailMessage = `Thank you for your feedback. We'll review your requested changes and get back to you with an updated estimate.`
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update the estimate status
    const { error: updateError } = await supabase
      .from('estimates')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', estimateId)
      .eq('user_id', user.id)

    if (updateError) {
      console.error('Error updating estimate:', updateError)
      return NextResponse.json({ error: 'Failed to update estimate' }, { status: 500 })
    }

    // Send confirmation email to client
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const confirmationEmailHtml = `
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Estimate Update</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px; }
          .status-badge { 
            display: inline-block; 
            padding: 8px 16px; 
            border-radius: 20px; 
            font-weight: bold; 
            margin: 10px 0;
            ${action === 'approve' ? 'background: #10b981; color: white;' : 'background: #f59e0b; color: white;'}
          }
          .footer { text-align: center; color: #6b7280; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Estimate Update</h1>
            <p>From DyluxePro</p>
          </div>
          
          <div class="content">
            <h2>Hello ${clientName},</h2>
            
            <div class="status-badge">
              ${newStatus}
            </div>
            
            <p>${emailMessage}</p>
            
            <p>If you have any questions, please don't hesitate to contact us.</p>
            
            <p>Best regards,<br>DyluxePro Team</p>
          </div>
          
          <div class="footer">
            <p>This update was sent from DyluxePro CRM</p>
          </div>
        </div>
      </body>
      </html>
    `

    // Send confirmation email to client (with fallback for testing mode)
    // For now, always send to your verified email for testing
    const recipientEmail = 'nabhanralph@gmail.com'; // Your verified email for testing
    
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'DyluxePro <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: emailSubject,
      html: confirmationEmailHtml,
    })

    if (emailError) {
      console.error('Error sending confirmation email:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json({ 
      success: true, 
      status: newStatus,
      message: 'Estimate updated successfully'
    })

  } catch (error) {
    console.error('Error processing email action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}
