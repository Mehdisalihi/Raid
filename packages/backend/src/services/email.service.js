import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

/**
 * Sends a verification email
 * @param {string} to - Recipient email
 * @param {string} code - Verification code
 */
export const sendVerificationEmail = async (to, code) => {
    // For now, if no credentials, we just log to console
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        const link = `${process.env.FRONTEND_URL}/verify-direct?email=${to}&code=${code}`;
        console.log(`[EMAIL-SIMULATION] Verification link for ${to}: ${link}`);
        console.log(`[EMAIL-SIMULATION] Code: ${code}`);
        return;
    }

    const mailOptions = {
        from: `"RAID System" <${process.env.EMAIL_USER}>`,
        to,
        subject: 'تأكيد الحساب - RAID System',
        html: `
            <div style="font-family: sans-serif; text-align: center; padding: 20px;">
                <h1 style="color: #1E40AF;">تأكيد حسابك في RAID</h1>
                <p>شكراً لتسجيلك. يرجى الضغط على الزر أدناه لتفعيل حسابك مباشرة:</p>
                <a href="${process.env.FRONTEND_URL}/verify-direct?email=${to}&code=${code}" 
                   style="display: inline-block; padding: 16px 32px; background-color: #1E40AF; color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; margin: 20px 0;">
                   تأكيد الحساب الآن
                </a>
                <p style="font-size: 12px; color: #64748B;">أو استخدم الكود التالي إذا لزم الأمر: <strong>${code}</strong></p>
                <p style="margin-top: 20px; color: #64748B;">إذا لم تطلب هذا الكود، يرجى تجاهل هذه الرسالة.</p>
            </div>
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Verification email sent to ${to}`);
    } catch (error) {
        console.error('Email Error:', error);
        throw new Error('Failed to send verification email');
    }
};
