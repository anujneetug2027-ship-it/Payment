// server.js
const express = require('express');
const fetch = require('node-fetch');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Configure via environment variables
const UROPAY_API_URL = process.env.UROPAY_API_URL || 'https://api.uropay.me/v1/payment-links';
const UROPAY_API_KEY = process.env.UROPAY_API_KEY; // set to the API key you provided

if (!UROPAY_API_KEY) {
  console.warn('Warning: UROPAY_API_KEY is not set. Set it in .env file for real requests.');
}

// Utility: convert rupees to paise (if provider expects smallest currency unit)
function toPaise(amountRupees) {
  return Math.round(Number(amountRupees) * 100);
}

app.post('/create-payment', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || typeof amount !== 'number' || amount < 1 || amount > 10000) {
      return res.status(400).json({ message: 'Amount must be between 1 and 10000' });
    }

    // Build payload for UroPay. The exact fields depend on UroPay's API.
    // This example sends an amount, currency and a basic customer placeholder.
    const payload = {
      amount: toPaise(amount), // if UroPay expects paise
      currency: 'INR',
      // Optional fields you may add per UroPay docs:
      // customer: { name: 'Customer name', contact: '9999999999', email: 'a@b.com' },
      // description: 'Payment for order #1234',
      // redirect_url: 'https://yourdomain.com/payment-success'
    };

    // Make API call to UroPay
    const response = await fetch(UROPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${UROPAY_API_KEY}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('UroPay error:', data);
      return res.status(500).json({ message: data.message || 'UroPay API error', detail: data });
    }

    // Expecting the provider to return something like { payment_url: 'https://...' }
    // Inspect `data` and adapt the field names below to the actual UroPay response
    const paymentUrl = data.payment_url || data.link || data.url || data.data?.payment_url;
    if (!paymentUrl) {
      return res.status(500).json({ message: 'UroPay did not return a payment URL', raw: data });
    }

    return res.json({ payment_url: paymentUrl });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
