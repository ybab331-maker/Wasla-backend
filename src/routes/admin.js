const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth, requireAdmin } = require("../middleware/auth");

const router = express.Router();

// كل مسارات لوحة التحكم محمية: لازم تسجيل دخول + صلاحية أدمن
router.use(requireAuth, requireAdmin);

// GET /admin/orders — كل الطلبات، الأحدث أولًا (مع بيانات المستخدم صاحب الطلب)
router.get("/orders", async (req, res) => {
  const orders = await prisma.order.findMany({
    include: { items: true, paymentProof: true, user: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, orders });
});

// PATCH /admin/orders/:id/confirm — تأكيد استلام الدفع يدويًا وتفعيل الطلب
router.patch("/orders/:id/confirm", async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "ACTIVE" },
  });

  await prisma.paymentProof.update({
    where: { orderId: req.params.id },
    data: { verifiedByAdminId: req.user.id, verifiedAt: new Date() },
  });

  res.json({ ok: true, order: updated });
});

// PATCH /admin/orders/:id/reject — رفض الطلب (مثلاً بيانات الدفع غير صحيحة)
router.patch("/orders/:id/reject", async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } });
  if (!order) {
    return res.status(404).json({ error: "الطلب غير موجود" });
  }

  const updated = await prisma.order.update({
    where: { id: req.params.id },
    data: { status: "CANCELLED" },
  });

  res.json({ ok: true, order: updated });
});

// GET /admin/support — كل تذاكر الدعم، الأحدث أولًا
router.get("/support", async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, tickets });
});

// PATCH /admin/support/:id/reply  { reply }
// الأدمن يرد على تذكرة دعم، وتصير حالتها "محلولة"
router.patch("/support/:id/reply", async (req, res) => {
  const { reply } = req.body;
  if (!reply || String(reply).trim().length === 0) {
    return res.status(400).json({ error: "الرد مطلوب" });
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id: req.params.id } });
  if (!ticket) {
    return res.status(404).json({ error: "التذكرة غير موجودة" });
  }

  const updated = await prisma.supportTicket.update({
    where: { id: req.params.id },
    data: {
      reply: String(reply).trim(),
      status: "RESOLVED",
      repliedAt: new Date(),
    },
  });

  res.json({ ok: true, ticket: updated });
});

// GET /admin/users — كل المستخدمين (للاطلاع العام)
router.get("/users", async (req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, users });
});

module.exports = router;
