const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const UROPAY_API_URL = process.env.UROPAY_API_URL || "https://api.uropay.me/order/generate";
const UROPAY_API_KEY = process.env.UROPAY_API_KEY;
const UROPAY_SECRET = process.env.UROPAY_SECRET;

if (!UROPAY_API_KEY || !UROPAY_SECRET) {
  console.warn("⚠️ Missing UROPAY_API_KEY or UROPAY_SECRET in .env");
}

app.post("/create-payment", async (req, res) => {
  try {
    const { amount, vpa, vpaName } = req.body;

    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({ message: "Amount must be between ₹1–10,000" });
    }

    // ✅ Step 1: Hash the secret using SHA512
    const hashedSecret = crypto.createHash("sha512").update(UROPAY_SECRET).digest("hex");

    // ✅ Step 2: Build payload
    const orderId = "ORDER" + Date.now();
    const payload = {
      vpa: vpa || "abc@icici",
      vpaName: vpaName || "Anuj User",
      amount: Number(amount), // Do NOT multiply by 100 — docs use ₹ directly
      merchantOrderId: orderId,
      transactionNote: `For ${orderId}`,
      customerName: "Anuj Chauhan",
      customerEmail: "anuj@example.com",
      notes: { key1: "value1", key2: "value2" },
    };

    // ✅ Step 3: Call UroPay API
    const response = await fetch(UROPAY_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-API-KEY": UROPAY_API_KEY,
        "Authorization": `Bearer ${hashedSecret}`,
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text(); // read as text
    console.log("UroPay Raw Response:", text);

    // ✅ Step 4: Try parsing as JSON, otherwise show HTML error
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      return res.status(500).json({
        message: "UroPay did not return valid JSON (see raw response)",
        raw: text,
      });
    }

    if (!response.ok) {
      return res.status(500).json({
        message: data.message || "UroPay API error",
        detail: data,
      });
    }

    res.json({ data });
  } catch (err) {
    console.error("Payment Error:", err);
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
