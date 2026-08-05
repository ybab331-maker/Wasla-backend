// نسخة واحدة مشتركة من عميل Prisma عبر كل الخادم — تفادي فتح اتصالات متعددة بلا داعٍ
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

module.exports = { prisma };
