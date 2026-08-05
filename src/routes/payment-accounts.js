const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

router.use(requireAuth);

// GET /payment-accounts — كل حسابات الدفع المحفوظة للمستخدم الحالي
router.get("/", async (req, res) => {
  const accounts = await prisma.paymentAccount.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "asc" },
  });
  res.json({ ok: true, accounts });
});

// POST /payment-accounts  { methodId, phone }
// يضيف وسيلة دفع جديدة لحساب المستخدم — يقابل زر "إضافة طريقة دفع جديدة" بصفحة حسابي
router.post("/", async (req, res) => {
  const { methodId, phone } = req.body;

  if (!methodId || !phone) {
    return res.status(400).json({ error: "يجب تحديد وسيلة الدفع ورقم الهاتف" });
  }

  const existing = await prisma.paymentAccount.findFirst({
    where: { userId: req.user.id, methodId },
  });
  if (existing) {
    return res.status(409).json({ error: "هذه الوسيلة مضافة مسبقًا" });
  }

  const account = await prisma.paymentAccount.create({
    data: { userId: req.user.id, methodId, phone: String(phone).trim() },
  });

  res.status(201).json({ ok: true, account });
});

// DELETE /payment-accounts/:id — حذف وسيلة دفع محفوظة (فقط لصاحبها)
router.delete("/:id", async (req, res) => {
  const account = await prisma.paymentAccount.findUnique({ where: { id: req.params.id } });
  if (!account || account.userId !== req.user.id) {
    return res.status(404).json({ error: "الحساب غير موجود" });
  }
  await prisma.paymentAccount.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

module.exports = router;
