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

// 🟩 Route to create payment order
app.post("/create-payment", async (req, res) => {
  try {
    const { amount, vpa, vpaName } = req.body;

    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({ message: "Amount must be between ₹1–10,000" });
    }

    const orderId = "ORDER" + Date.now();

    const payload = {
      key: UPI_GATEWAY_API_KEY,
      client_txn_id: orderId,
      amount: amount,
      p_info: "Wallet Topup",
      customer_name: vpaName || "Anuj User",
      customer_email: "anuj@example.com",
      customer_mobile: "9999999999",
      redirect_url: "https://your-frontend-url.com/success", // optional
      udf1: vpa || "",
    };

    const response = await fetch(UPI_GATEWAY_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("UPI Gateway Response:", data);

    if (data.status === true && data.data && data.data.payment_url) {
      return res.json({ payment_url: data.data.payment_url });
    } else {
      return res.status(500).json({ message: "Payment API error", data });
    }
  } catch (err) {
    console.error("Payment Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// 🟦 Webhook to receive payment status updates
app.post("/webhook/payment", (req, res) => {
  console.log("Webhook Data Received:", req.body);

  // You can verify the data here if webhook secret is provided
  // Example: check req.body.secret === process.env.WEBHOOK_SECRET

  // Then update your database/payment status accordingly
  res.status(200).json({ received: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
