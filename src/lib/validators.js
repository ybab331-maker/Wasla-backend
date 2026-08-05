// نفس قاعدة التحقق المستخدمة بالواجهة الأمامية بالضبط:
// رقم موريتاني صحيح = يبدأ بـ 2 (شنقيطل) أو 3 (ماتل) أو 4 (موريتل)، وثمانية أرقام بالضبط
function isValidMauritanianPhone(phone) {
  const digits = String(phone || "").replace(/\D/g, "");
  return /^[234]\d{7}$/.test(digits);
}

// اسم يتكون من أحرف عربية أو لاتينية فقط (مع مسافات)، بدون أرقام أو رموز
function isValidName(name) {
  return /^[a-zA-Z\u0600-\u06FF][a-zA-Z\u0600-\u06FF\s]*$/.test(String(name || "").trim());
}

module.exports = { isValidMauritanianPhone, isValidName };
