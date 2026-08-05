const jwt = require("jsonwebtoken");
const { prisma } = require("../lib/prisma");

// يتحقق من رمز الدخول (JWT) المُرسل بترويسة Authorization: Bearer <token>
// ويُلحق بيانات المستخدم بـ req.user حتى تستخدمها بقية المسارات المحمية
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: "يجب تسجيل الدخول" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) return res.status(401).json({ error: "الحساب غير موجود" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "جلسة الدخول منتهية، سجّل دخولك من جديد" });
  }
}

// نفس الشي بس يشترط إن يكون المستخدم بدور ADMIN (للوحة التحكم)
function requireAdmin(req, res, next) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "هذا الإجراء متاح للإدارة فقط" });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
