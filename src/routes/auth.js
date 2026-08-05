const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { prisma } = require("../lib/prisma");
const { isValidMauritanianPhone, isValidName } = require("../lib/validators");
const { sendSmsOtp } = require("../lib/sms");

const router = express.Router();

// حماية من إساءة الاستخدام: بحد أقصى 5 طلبات رمز تحقق لكل رقم كل 15 دقيقة
const otpRequestLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => req.body?.phone || req.ip,
  message: { error: "محاولات كثيرة جدًا، حاول لاحقًا" },
});

function generateOtp() {
  return String(Math.floor(1000 + Math.random() * 9000)); // رمز من 4 أرقام
}

function issueToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

// POST /auth/request-otp  { phone, purpose: "SIGNUP" | "LOGIN" }
router.post("/request-otp", otpRequestLimiter, async (req, res) => {
  const { phone, purpose = "SIGNUP" } = req.body;

  if (!isValidMauritanianPhone(phone)) {
    return res.status(400).json({ error: "رقم الهاتف غير صحيح" });
  }

  const digits = phone.replace(/\D/g, "");
  const existingUser = await prisma.user.findUnique({ where: { whatsappPhone: digits } });

  if (purpose === "LOGIN" && !existingUser) {
    return res.status(404).json({ error: "لا يوجد حساب مسجّل بهذا الرقم" });
  }
  if (purpose === "SIGNUP" && existingUser) {
    return res.status(409).json({ error: "هذا الرقم مسجّل مسبقًا، جرّب تسجيل الدخول" });
  }

  const code = generateOtp();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // صالح 5 دقائق

  await prisma.otpCode.create({
    data: { phone: digits, code, purpose, expiresAt, userId: existingUser?.id },
  });

  await sendSmsOtp(digits, code); // الاستخدام الوحيد لإرسال SMS بكامل التطبيق — لحظة فتح الحساب فقط

  res.json({ ok: true, expiresInSeconds: 300 });
});

// POST /auth/verify-otp  { phone, code, purpose }
router.post("/verify-otp", async (req, res) => {
  const { phone, code, purpose = "SIGNUP" } = req.body;
  const digits = String(phone || "").replace(/\D/g, "");

  const otp = await prisma.otpCode.findFirst({
    where: { phone: digits, code, purpose, verifiedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) {
    return res.status(400).json({ error: "الرمز غير صحيح أو منتهي الصلاحية" });
  }

  await prisma.otpCode.update({ where: { id: otp.id }, data: { verifiedAt: new Date() } });

  if (purpose === "LOGIN") {
    const user = await prisma.user.findUnique({ where: { whatsappPhone: digits } });
    const token = issueToken(user.id);
    return res.json({ ok: true, token, user: { id: user.id, name: user.name, whatsappPhone: user.whatsappPhone } });
  }

  // بالنسبة للتسجيل: التحقق نجح، بس الحساب لسا ما انبنى — الخطوات التالية (حساب دفع + هوية + اسم) بتكمّل بـ complete-signup
  res.json({ ok: true, phoneVerified: true });
});

// POST /auth/complete-signup  { phone, name, paymentAccounts: [{methodId, phone}], kycDocumentUrl }
router.post("/complete-signup", async (req, res) => {
  const { phone, name, paymentAccounts, kycDocumentUrl } = req.body;
  const digits = String(phone || "").replace(/\D/g, "");

  if (!isValidMauritanianPhone(digits)) {
    return res.status(400).json({ error: "رقم الهاتف غير صحيح" });
  }
  if (!isValidName(name)) {
    return res.status(400).json({ error: "الاسم يجب أن يحتوي على أحرف فقط" });
  }
  if (!Array.isArray(paymentAccounts) || paymentAccounts.length === 0) {
    return res.status(400).json({ error: "يجب إضافة حساب دفع واحد على الأقل" });
  }
  if (!kycDocumentUrl) {
    return res.status(400).json({ error: "يجب رفع وثيقة الهوية" });
  }

  // تأكيد إن رقم الهاتف تم التحقق منه فعليًا خلال آخر 30 دقيقة قبل إنشاء الحساب
  const recentVerified = await prisma.otpCode.findFirst({
    where: { phone: digits, purpose: "SIGNUP", verifiedAt: { gt: new Date(Date.now() - 30 * 60 * 1000) } },
    orderBy: { verifiedAt: "desc" },
  });
  if (!recentVerified) {
    return res.status(403).json({ error: "يجب التحقق من رقم الهاتف أولًا" });
  }

  const user = await prisma.user.create({
    data: {
      whatsappPhone: digits,
      name: name.trim(),
      documentsVerified: true,
      kycDocumentUrl,
      paymentAccounts: {
        create: paymentAccounts.map((a) => ({ methodId: a.methodId, phone: a.phone })),
      },
    },
    include: { paymentAccounts: true },
  });

  const token = issueToken(user.id);
  res.status(201).json({ ok: true, token, user: { id: user.id, name: user.name, whatsappPhone: user.whatsappPhone } });
});

module.exports = router;
