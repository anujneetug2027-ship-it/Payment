const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const UPI_GATEWAY_API_URL = process.env.UPI_GATEWAY_API_URL;
const UPI_GATEWAY_API_KEY = process.env.UPI_GATEWAY_API_KEY;

// ✅ Route to create payment order
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, vpa, vpaName } = req.body;
    console.log("📩 Incoming Payment Request:", req.body);

    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({ message: "Amount must be between ₹1–10,000" });
    }

    const orderId = "ORDER" + Date.now();

    const payload = {
      key: UPI_GATEWAY_API_KEY,
      client_txn_id: orderId,
      amount: String(amount), // ensure it's sent as string
      p_info: "Wallet Topup",
      customer_name: vpaName || "Anuj User",
      customer_email: "anuj@example.com",
      customer_mobile: "9999999999",
      redirect_url: "https://yourfrontend.vercel.app/success",
      udf1: vpa || "",
    };

    console.log("📤 Sending Payload to UPI Gateway:", payload);

    const response = await fetch(UPI_GATEWAY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.text();
    console.log("🔍 Raw UPI Gateway Response:", data);

    // Try parsing safely
    let parsed;
    try {
      parsed = JSON.parse(data);
    } catch (err) {
      return res.status(500).json({ message: "Invalid JSON from UPI Gateway", raw: data });
    }

    if (parsed.status === true && parsed.data && parsed.data.payment_url) {
      return res.json({ payment_url: parsed.data.payment_url });
    } else {
      return res.status(500).json({ message: parsed.msg || "UPI Gateway Error", parsed });
    }

  } catch (err) {
    console.error("💥 Payment Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// 🟦 Webhook to receive payment status updates
app.post("/webhook/payment", (req, res) => {
  console.log("📦 Webhook Data Received:", req.body);
  res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
