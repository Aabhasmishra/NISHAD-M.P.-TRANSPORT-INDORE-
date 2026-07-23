// whatsappService.js
// Handles sending WhatsApp messages via Meta's WhatsApp Business Cloud API.
// This file has ONE job: take a phone number + data, send a WhatsApp message.
// It knows nothing about transport records, reports, or scheduling.

const axios = require("axios");
require("dotenv").config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_TEMPLATE_NAME = process.env.WHATSAPP_TEMPLATE_NAME || "daily_report_summary";
const WHATSAPP_TEMPLATE_LANG = process.env.WHATSAPP_TEMPLATE_LANG || "en_US";
const WHATSAPP_API_VERSION = "v22.0";

/**
 * Sends a WhatsApp template message to one number.
 * @param {string} toNumber - recipient number in international format, e.g. "919724117255" (no + or leading zeros)
 * @param {Array<string|number>} parameters - values to fill into the template placeholders {{1}}, {{2}}, etc, in order
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
async function sendWhatsAppTemplateMessage(toNumber, parameters) {
  if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
    const msg = "WhatsApp credentials missing. Check WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in .env";
    console.error(msg);
    return { success: false, error: msg };
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: toNumber,
    type: "template",
    template: {
      name: WHATSAPP_TEMPLATE_NAME,
      language: { code: WHATSAPP_TEMPLATE_LANG },
      components: [
        {
          type: "body",
          parameters: parameters.map((value) => ({ type: "text", text: String(value) })),
        },
      ],
    },
  };

  try {
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
    return { success: true, data: response.data };
  } catch (err) {
    const errorDetail = err.response?.data || err.message;
    console.error(`WhatsApp send failed for ${toNumber}:`, JSON.stringify(errorDetail));
    return { success: false, error: errorDetail };
  }
}

module.exports = { sendWhatsAppTemplateMessage };
