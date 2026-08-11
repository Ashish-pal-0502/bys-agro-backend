const axios = require("axios")

const WHATSAPP_API_URL = `https://graph.facebook.com/v25.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`

async function sendTemplateMessage({ phone, customerName }) {

    const payload = {
        messaging_product: "whatsapp",
        to: `91${phone}`,
        type: "template",
        template: {
            name: "abandoned_cart_reminder",
            language: { code: "en" },
            components: [
                {
                    type: "body",
                    parameters: [
                        { type: "text", text: customerName }
                    ]
                }
            ]
        }
    }
    try {
        const response = await axios.post(WHATSAPP_API_URL, payload, {
            headers: {
                "Authorization": `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
                "Content-Type": "application/json"
            },
        })
        // console.log("WhatsApp sent successfully:", response.data);
        console.log("WhatsApp sent successfully");
        return true;
    } catch (error) {
        console.log("Error sending template message:", error.response?.data || error.message);
        return false;
    }
}

// sendTemplateMessage();

module.exports = {
    sendTemplateMessage
}