require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true, service: "wasla-backend" }));

app.use("/auth", authRoutes);

// الخطوات التالية (تُبنى تباعًا):
app.use("/orders", require("./routes/orders"));
app.use("/payment-accounts", require("./routes/payment-accounts"));
app.use("/support", require("./routes/support"));
// app.use("/admin", require("./routes/admin"));

app.use((req, res) => res.status(404).json({ error: "المسار غير موجود" }));

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`✅ خادم وصلة يعمل على المنفذ ${port}`);
});

