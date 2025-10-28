const express = require("express");
const fetch = require("node-fetch");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

const UPI_GATEWAY_API_URL = process.env.UPI_GATEWAY_API_URL;
const UPI_GATEWAY_API_KEY = process.env.UPI_GATEWAY_API_KEY;

// Simple wallet JSON file (database substitute)
const WALLET_FILE = "./wallet.json";

// ✅ Helper to read and write wallet
function getWallet() {
  if (!fs.existsSync(WALLET_FILE)) return { balance: 0 };
  return JSON.parse(fs.readFileSync(WALLET_FILE));
}

function saveWallet(wallet) {
  fs.writeFileSync(WALLET_FILE, JSON.stringify(wallet, null, 2));
}

// 🟩 Route: create payment order
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
      amount: String(amount),
      p_info: "Wallet Topup",
      customer_name: vpaName || "User",
      customer_email: "user@example.com",
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

    const dataText = await response.text();
    console.log("🔍 Raw UPI Gateway Response:", dataText);

    let data;
    try {
      data = JSON.parse(dataText);
    } catch {
      return res.status(500).json({ message: "Invalid JSON from UPI Gateway", raw: dataText });
    }

    if (data.status === true && data.data?.payment_url) {
      // Save pending transaction to wallet for verification later
      const wallet = getWallet();
      wallet.pending = wallet.pending || {};
      wallet.pending[orderId] = { amount, status: "pending" };
      saveWallet(wallet);

      return res.json({ payment_url: data.data.payment_url });
    } else {
      return res.status(500).json({ message: data.msg || "UPI Gateway Error", data });
    }
  } catch (err) {
    console.error("💥 Payment Error:", err);
    res.status(500).json({ message: err.message });
  }
});

// 🟦 Webhook: UPI Gateway confirms payment
app.post("/webhook/payment", (req, res) => {
  console.log("📦 Webhook Data:", req.body);

  const { client_txn_id, amount, status } = req.body;
  if (status?.toLowerCase() === "success") {
    const wallet = getWallet();

    if (wallet.pending && wallet.pending[client_txn_id]) {
      const addedAmount = Number(wallet.pending[client_txn_id].amount);
      wallet.balance = (wallet.balance || 0) + addedAmount;
      delete wallet.pending[client_txn_id];
      saveWallet(wallet);
      console.log(`✅ ₹${addedAmount} added to wallet.`);
    }
  }
  res.status(200).json({ received: true });
});

// 🟨 Get wallet balance
app.get("/wallet", (req, res) => {
  const wallet = getWallet();
  res.json(wallet);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
