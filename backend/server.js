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

const UROPAY_API_URL = process.env.UROPAY_API_URL;
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

    // Generate SHA512 hash from secret
    const sha512 = crypto.createHash("sha512").update(UROPAY_SECRET).digest("hex");

    // Example merchant order ID
    const orderId = "ORDER" + Date.now();

    const payload = {
      vpa: vpa || "abc@icici", // fallback for testing
      vpaName: vpaName || "Anuj User",
      amount: amount * 100, // in paise if required
      merchantOrderId: orderId,
      transactionNote: `For ${orderId}`,
      customerName: "Anuj Chauhan",
      customerEmail: "anuj@example.com",
      notes: { key1: "value1", key2: "value2" },
    };

    const response = await fetch(UROPAY_API_URL, {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-API-KEY": UROPAY_API_KEY,
        "Authorization": `Bearer ${sha512}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("UroPay Response:", data);

    if (!response.ok) {
      return res.status(500).json({ message: data.message || "UroPay API error", data });
    }

    // return whatever payment URL or QR they provide
    return res.json({ data });
  } catch (err) {
    console.error("Payment Error:", err);
    return res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
