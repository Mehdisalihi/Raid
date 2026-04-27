import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_MESSAGING_SERVICE_SID = process.env.TWILIO_MESSAGING_SERVICE_SID;

/**
 * Sends an SMS message using Twilio
 * @param {string} to - The recipient's phone number
 * @param {string} body - The message body
 */
export const sendSMS = async (to, body) => {
    try {
        const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
        
        const params = new URLSearchParams();
        params.append('To', to);
        params.append('MessagingServiceSid', TWILIO_MESSAGING_SERVICE_SID);
        params.append('Body', body);

        const response = await axios.post(
            `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
            params,
            {
                headers: {
                    'Authorization': `Basic ${auth}`,
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('Twilio SMS Error:', error.response?.data || error.message);
        throw new Error('Failed to send SMS');
    }
};
