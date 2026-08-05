// هذه الدالة هي نقطة الاستخدام الوحيدة لواتساب بكل الباك-إند —
// تُستدعى فقط لحظة إرسال رمز التحقق عند فتح حساب جديد. أي تنبيه أو رسالة تانية
// (تأكيد الاشتراك، تذكير التجديد، ردود الدعم) تُرسل عبر قناة المحادثة داخل التطبيق، مو واتساب.

async function sendWhatsAppOtp(phone, code) {
  const apiUrl = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiToken) {
    // وضع التطوير: لسا ما ربطتوا حساب WhatsApp Business API حقيقي.
    // بهاي الحالة بس نطبع الرمز بسجلّات الخادم حتى تقدروا تختبروا محليًا.
    console.log(`[DEV ONLY] رمز التحقق لرقم ${phone}: ${code}`);
    return;
  }

  // مثال تكامل عام مع WhatsApp Business Cloud API (Meta) — عدّل الحمولة حسب مزوّدك الفعلي
  await fetch(`${apiUrl}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone,
      type: "template",
      template: {
        name: "wasla_otp",
        language: { code: "ar" },
        components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
      },
    }),
  });
}

module.exports = { sendWhatsAppOtp };
