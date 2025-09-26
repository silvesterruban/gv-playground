import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { fromWebToken } from '@aws-sdk/credential-providers';
import { readFileSync } from 'fs';

export class SESService {
  private fromEmail: string;

  constructor() {
    this.fromEmail = "noreply@gradvillage.com";
    console.log("✅ SES Service initialized with sender:", this.fromEmail);
  }

  async sendEmail(to: string | string[], subject: string, htmlBody: string, textBody?: string): Promise<void> {
    const recipients = Array.isArray(to) ? to : [to];
    console.log("📧 Sending email:", { to: recipients, subject, from: this.fromEmail });
    
    // Create fresh client for each request - use explicit web identity configuration
    const sesClient = new SESClient({ 
      region: "us-east-1",
      credentials: fromWebToken({
        roleArn: process.env.AWS_ROLE_ARN!,
        webIdentityToken: readFileSync(process.env.AWS_WEB_IDENTITY_TOKEN_FILE!, 'utf8'),
        roleSessionName: 'gradvillage-backend-ses'
      })
    });
    
    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: { ToAddresses: recipients },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: {
          Html: { Data: htmlBody, Charset: "UTF-8" },
          Text: textBody ? { Data: textBody, Charset: "UTF-8" } : undefined
        }
      }
    });

    try {
      const result = await sesClient.send(command);
      console.log("✅ Email sent successfully:", result.MessageId);
    } catch (error) {
      console.error("❌ Failed to send email:", error);
      throw error;
    }
  }

  async sendWelcomeEmail(firstName: string, email: string): Promise<void> {
    const subject = `🎓 Welcome to GradVillage, ${firstName}! Your Journey Starts Here`;
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 12px;">
        <!-- Header -->
        <div style="background: white; border-radius: 8px; padding: 30px; margin-bottom: 20px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2563eb; margin: 0; font-size: 32px; font-weight: 700;">🎓 Welcome to GradVillage!</h1>
            <p style="color: #6b7280; margin: 10px 0 0 0; font-size: 18px;">Your educational journey starts here</p>
          </div>
          
          <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0; font-size: 24px;">🌟 You're Now Part of Something Amazing!</h2>
            <p style="margin: 0; font-size: 16px; opacity: 0.9;">Join thousands of students who are making their educational dreams come true</p>
          </div>

          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            Hi <strong>${firstName}</strong>,
          </p>
          
          <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 20px 0;">
            Welcome to GradVillage! We're absolutely thrilled to have you join our community of ambitious students and generous supporters. Your educational journey is about to get a whole lot more exciting!
          </p>

          <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <h3 style="color: #1e40af; margin: 0 0 15px 0; font-size: 18px;">🚀 What You Can Do Now</h3>
            <div style="color: #374151; line-height: 1.8;">
              <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
                <span style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">1</span>
                <div>
                  <strong>Complete Your Profile</strong><br>
                  <span style="color: #6b7280;">Add your photo, bio, academic details, and tell your story</span>
                </div>
              </div>
              <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
                <span style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">2</span>
                <div>
                  <strong>Create Your Registry</strong><br>
                  <span style="color: #6b7280;">Add textbooks, supplies, equipment, and other educational needs</span>
                </div>
              </div>
              <div style="margin-bottom: 15px; display: flex; align-items: flex-start;">
                <span style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">3</span>
                <div>
                  <strong>Share Your Story</strong><br>
                  <span style="color: #6b7280;">Connect with donors who want to support students like you</span>
                </div>
              </div>
              <div style="display: flex; align-items: flex-start;">
                <span style="background: #3b82f6; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold; margin-right: 12px; flex-shrink: 0;">4</span>
                <div>
                  <strong>Start Receiving Support</strong><br>
                  <span style="color: #6b7280;">Watch as the community comes together to help you succeed</span>
                </div>
              </div>
            </div>
          </div>

          <div style="background: #ecfdf5; border: 1px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #065f46; margin: 0 0 10px 0; font-size: 16px;">💡 Success Tips</h3>
            <ul style="color: #065f46; margin: 0; padding-left: 20px; font-size: 14px;">
              <li style="margin-bottom: 8px;">Be authentic and share your genuine story</li>
              <li style="margin-bottom: 8px;">Add high-quality photos that show your personality</li>
              <li style="margin-bottom: 8px;">Be specific about what you need and why</li>
              <li style="margin-bottom: 8px;">Engage with your supporters and keep them updated</li>
            </ul>
          </div>

          <div style="background: #fef3c7; border: 1px solid #f59e0b; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="color: #92400e; margin: 0 0 10px 0; font-size: 16px;">🎯 Your Next Steps</h3>
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              Ready to get started? Head to your dashboard and begin building your profile. The more complete and engaging your profile is, the more likely you are to receive support from our amazing community of donors.
            </p>
          </div>

          <div style="text-align: center; margin: 30px 0 20px 0;">
            <a href="${process.env.FRONTEND_URL || 'https://gradvillage.com'}/student/dashboard" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              Start Building Your Profile
            </a>
          </div>

          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; text-align: center;">
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0;">
              Questions? We're here to help!
            </p>
            <p style="color: #6b7280; font-size: 14px; margin: 0;">
              Email: <a href="mailto:support@gradvillage.com" style="color: #3b82f6;">support@gradvillage.com</a> | 
              Phone: <a href="tel:+1-555-GRADVILLAGE" style="color: #3b82f6;">1-555-GRADVILLAGE</a>
            </p>
          </div>
        </div>

        <!-- Footer -->
        <div style="text-align: center; color: white; font-size: 12px; opacity: 0.8;">
          <p style="margin: 0;">© 2024 GradVillage. Making education accessible, one student at a time.</p>
          <p style="margin: 5px 0 0 0;">This email was sent to ${email}</p>
        </div>
      </div>
    `;
    
    const textBody = `
🎓 Welcome to GradVillage, ${firstName}! Your Journey Starts Here

Hi ${firstName},

Welcome to GradVillage! We're absolutely thrilled to have you join our community of ambitious students and generous supporters. Your educational journey is about to get a whole lot more exciting!

🌟 You're Now Part of Something Amazing!
Join thousands of students who are making their educational dreams come true

🚀 What You Can Do Now

1. Complete Your Profile
   Add your photo, bio, academic details, and tell your story

2. Create Your Registry
   Add textbooks, supplies, equipment, and other educational needs

3. Share Your Story
   Connect with donors who want to support students like you

4. Start Receiving Support
   Watch as the community comes together to help you succeed

💡 Success Tips
- Be authentic and share your genuine story
- Add high-quality photos that show your personality
- Be specific about what you need and why
- Engage with your supporters and keep them updated

🎯 Your Next Steps
Ready to get started? Head to your dashboard and begin building your profile. The more complete and engaging your profile is, the more likely you are to receive support from our amazing community of donors.

Start Building Your Profile: ${process.env.FRONTEND_URL || 'https://gradvillage.com'}/student/dashboard

Questions? We're here to help!
Email: support@gradvillage.com
Phone: 1-555-GRADVILLAGE

© 2024 GradVillage. Making education accessible, one student at a time.
This email was sent to ${email}
    `;
    
    await this.sendEmail(email, subject, htmlBody, textBody);
  }

  async sendEmailWithAttachment(to: string | string[], subject: string, htmlBody: string, textBody: string, attachmentBuffer: Buffer, attachmentName: string): Promise<void> {
    try {
      // For development/testing, just send the email with a note about the attachment
      // In production, this would use SES Raw Email API for proper attachments
      const enhancedHtmlBody = htmlBody + `
        <div style="background: #f8fafc; border: 2px dashed #cbd5e1; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <h3 style="color: #1e40af; margin: 0 0 10px 0;">📄 Your Receipt</h3>
          <p style="color: #64748b; margin: 0 0 15px 0;">A detailed receipt has been generated and is available for download.</p>
          <p style="color: #64748b; margin: 0; font-size: 14px;"><strong>File:</strong> ${attachmentName} (${(attachmentBuffer.length / 1024).toFixed(1)} KB)</p>
          <p style="color: #64748b; margin: 10px 0 0 0; font-size: 12px;">Note: In production, this would be attached as a PDF file to this email.</p>
        </div>
      `;

      const enhancedTextBody = textBody + `
        
📄 Your Receipt
A detailed receipt has been generated and is available for download.
File: ${attachmentName} (${(attachmentBuffer.length / 1024).toFixed(1)} KB)
Note: In production, this would be attached as a PDF file to this email.
      `;

      console.log(`📎 Email with attachment info sent: ${attachmentName} (${attachmentBuffer.length} bytes)`);
      await this.sendEmail(to, subject, enhancedHtmlBody, enhancedTextBody);
    } catch (error) {
      console.error('Failed to send email with attachment:', error);
      // Fallback to regular email
      await this.sendEmail(to, subject, htmlBody, textBody);
    }
  }

  async listVerifiedEmails(): Promise<string[]> {
    // For now, return empty array since we're using Moto
    // In production, this would list verified SES emails
    return [];
  }
}

export const sesService = new SESService();
