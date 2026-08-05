const express = require("express");
const { prisma } = require("../lib/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

// كل المسارات هون محمية — لازم تسجيل دخول
router.use(requireAuth);

// POST /support  { message, orderId? }
// المستخدم يفتح تذكرة دعم جديدة (شكوى أو استفسار)
router.post("/", async (req, res) => {
  const { message, orderId } = req.body;

  if (!message || String(message).trim().length === 0) {
    return res.status(400).json({ error: "الرسالة مطلوبة" });
  }

  if (orderId) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.userId !== req.user.id) {
      return res.status(404).json({ error: "الطلب غير موجود" });
    }
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId: req.user.id,
      orderId: orderId || null,
      message: String(message).trim(),
      status: "OPEN",
    },
  });

  res.status(201).json({ ok: true, ticket });
});

// GET /support — المستخدم الحالي، الأحدث أولًا
router.get("/", async (req, res) => {
  const tickets = await prisma.supportTicket.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  res.json({ ok: true, tickets });
});

// GET /support/:id — تفاصيل تذكرة واحدة (فقط لصاحبها)
router.get("/:id", async (req, res) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: req.params.id },
  });
  if (!ticket || ticket.userId !== req.user.id) {
    return res.status(404).json({ error: "التذكرة غير موجودة" });
  }
  res.json({ ok: true, ticket });
});

module.exports = router;
