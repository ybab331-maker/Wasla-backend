// هذه الدالة هي نقطة الاستخدام الوحيدة لإرسال رسائل SMS بكل الباك-إند —
// تُستدعى فقط لحظة إرسال رمز التحقق عند فتح حساب جديد. أي تنبيه أو رسالة تانية
// (تأكيد الاشتراك، تذكير التجديد، ردود الدعم) تُرسل عبر قناة المحادثة داخل التطبيق، مو SMS.

async function sendSmsOtp(phone, code) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    // وضع التطوير: لسا ما ربطتوا حساب Twilio حقيقي.
    // بهاي الحالة بس نطبع الرمز بسجلّات الخادم حتى تقدروا تختبروا محليًا.
    console.log(`[DEV ONLY] رمز التحقق لرقم ${phone}: ${code}`);
    return;
  }

  // موريتانيا: رمز الدولة الدولي +222، ورقم المستخدم عندنا 8 أرقام فقط بدونه
  const toNumber = `+222${phone}`;

  const credentials = Buffer.from(`${accountSid}:${authToken}`).toString("base64");

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      To: toNumber,
      From: fromNumber,
      Body: `رمز التحقق من حسابك بوصلة هو: ${code}`,
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("فشل إرسال رسالة Twilio:", errBody);
    throw new Error("تعذّر إرسال رمز التحقق");
  }
}

module.exports = { sendSmsOtp };
