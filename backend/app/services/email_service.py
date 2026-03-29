"""
Email notification service
"""
import logging
import os
from typing import Optional, List
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib

logger = logging.getLogger(__name__)


class EmailService:
    """Service for sending email notifications"""

    def __init__(self):
        self.enabled = os.getenv("EMAIL_ENABLED", "False") == "True"
        self.smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
        self.smtp_port = int(os.getenv("SMTP_PORT", "587"))
        self.sender_email = os.getenv("SENDER_EMAIL", "")
        self.sender_password = os.getenv("SENDER_PASSWORD", "")

    def send_expense_approved(
        self,
        recipient_email: str,
        employee_name: str,
        amount: float,
        currency: str,
        description: str,
    ) -> bool:
        """Send expense approved notification"""
        if not self.enabled:
            logger.info(f"Email notifications disabled. Skipping approval email to {recipient_email}")
            return True

        subject = "Expense Approved"
        body = f"""
        <html>
            <body>
                <h2>Expense Approved</h2>
                <p>Hi {employee_name},</p>
                <p>Your expense has been approved:</p>
                <ul>
                    <li><strong>Amount:</strong> {amount} {currency}</li>
                    <li><strong>Description:</strong> {description}</li>
                    <li><strong>Status:</strong> <span style="color: green;">Approved</span></li>
                </ul>
                <p>Thank you!</p>
            </body>
        </html>
        """
        return self._send_email(recipient_email, subject, body)

    def send_expense_rejected(
        self,
        recipient_email: str,
        employee_name: str,
        amount: float,
        currency: str,
        description: str,
        reason: Optional[str] = None,
    ) -> bool:
        """Send expense rejected notification"""
        if not self.enabled:
            logger.info(f"Email notifications disabled. Skipping rejection email to {recipient_email}")
            return True

        subject = "Expense Rejected"
        reason_text = f"<p><strong>Reason:</strong> {reason}</p>" if reason else ""
        body = f"""
        <html>
            <body>
                <h2>Expense Rejected</h2>
                <p>Hi {employee_name},</p>
                <p>Unfortunately, your expense has been rejected:</p>
                <ul>
                    <li><strong>Amount:</strong> {amount} {currency}</li>
                    <li><strong>Description:</strong> {description}</li>
                    <li><strong>Status:</strong> <span style="color: red;">Rejected</span></li>
                </ul>
                {reason_text}
                <p>Please contact your manager for more information.</p>
            </body>
        </html>
        """
        return self._send_email(recipient_email, subject, body)

    def send_expense_submitted(
        self,
        manager_emails: List[str],
        employee_name: str,
        amount: float,
        currency: str,
        description: str,
    ) -> bool:
        """Send expense submitted notification to managers"""
        if not self.enabled:
            logger.info(f"Email notifications disabled. Skipping submit notification")
            return True

        subject = "New Expense Pending Approval"
        body = f"""
        <html>
            <body>
                <h2>New Expense Pending Approval</h2>
                <p>A new expense has been submitted for approval:</p>
                <ul>
                    <li><strong>Employee:</strong> {employee_name}</li>
                    <li><strong>Amount:</strong> {amount} {currency}</li>
                    <li><strong>Description:</strong> {description}</li>
                    <li><strong>Status:</strong> <span style="color: orange;">Pending Approval</span></li>
                </ul>
                <p>Please review and approve or reject this expense.</p>
            </body>
        </html>
        """
        success = True
        for email in manager_emails:
            if not self._send_email(email, subject, body):
                success = False
                logger.error(f"Failed to send submission email to {email}")
        return success

    def _send_email(self, recipient: str, subject: str, body: str) -> bool:
        """Send email using SMTP"""
        try:
            if not self.sender_email or not self.sender_password:
                logger.warning("Email credentials not configured")
                return False

            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.sender_email
            msg["To"] = recipient

            msg.attach(MIMEText(body, "html"))

            with smtplib.SMTP(self.smtp_server, self.smtp_port) as server:
                server.starttls()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipient, msg.as_string())

            logger.info(f"Email sent to {recipient}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {recipient}: {str(e)}")
            return False


# Global email service instance
email_service = EmailService()
