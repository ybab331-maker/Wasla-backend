const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// كل المسارات هون محمية — لازم تسجيل دخول
router.use(requireAuth);

// POST /orders  { items: [{serviceId, planId, qty, unitPriceMru, accountId?, network?}], methodId, payerPhone, bankConfirmCode }
// ينشئ طلب جديد بحالة "بانتظار تأكيد الدفع" — التأكيد الفعلي يتم لاحقًا من لوحة تحكم الإدارة يدويًا
// (لسا ما في ربط مباشر وتلقائي مع أنظمة البنوك، هاي خطوة مستقبلية)
router.post("/", async (req, res) => {
  const { items, methodId, payerPhone, bankConfirmCode } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "السلة فارغة" });
  }
  if (!methodId || !payerPhone) {
    return res.status(400).json({ error: "يجب تحديد وسيلة الدفع ورقم الهاتف" });
  }
  if (!bankConfirmCode || String(bankConfirmCode).trim().length < 4) {
    return res.status(400).json({ error: "يجب إدخال رمز تأكيد التحويل" });
  }

  const totalMru = items.reduce((sum, i) => sum + i.unitPriceMru * (i.qty || 1), 0);
  if (totalMru <= 0) {
    return res.status(400).json({ error: "قيمة الطلب غير صحيحة" });
  }

  // اشتراكات دورية (شهري/سنوي) بتاخذ تاريخ انتهاء، خدمات الشحن ما بتاخذ
  const hasSubscription = items.some((i) => i.planId === "monthly" || i.planId === "yearly");
  const expiresAt = hasSubscription
    ? new Date(Date.now() + (items.find((i) => i.planId === "yearly") ? 365 : 30) * 24 * 60 * 60 * 1000)
    : null;

  const order = await prisma.order.create({
    data: {
      userId: req.user.id,
      status: "PENDING_PAYMENT",
      totalMru,
      expiresAt,
      items: {
        create: items.map((i) => ({
          serviceId: i.serviceId,
          planId: i.planId,
          qty: i.qty || 1,
          unitPriceMru: i.unitPriceMru,
          accountId: i.accountId || null,
          network: i.network || null,
        })),
      },
      paymentProof: {
        create: {
          methodId,
          payerPhone,
          bankConfirmCode: String(bankConfirmCode).trim(),
        },
      },
    },
    include: { items: true, paymentProof: true },
  });

  res.status(201).json({ ok: true, order });
});

// GET /orders  — كل طلبات المستخدم الحالي، الأحدث أولًا
router.get("/", async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user.id },
    include: { items: true, paymentProof: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, orders });
});

// GET /orders/:id — تفاصيل طلب واحد (فقط لصاحبه)
router.get("/:id", async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true, paymentProof: true },
  });
  if (!order || order.userId !== req.user.id) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }
  res.json({ ok: true, order });
});

module.exports = router;
