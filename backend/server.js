const express = require('express');
const fetch = require('node-fetch');
const crypto = require('crypto');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Config
const SECRET = process.env.UROPAY_SECRET;
const UROPAY_API_URL = process.env.UROPAY_API_URL;

if (!SECRET) console.warn('UROPAY_SECRET not set in .env!');

function hashSecret(secret) {
  return crypto.createHash('sha512').update(secret).digest('hex');
}

function toPaise(amountRupees) {
  return Math.round(Number(amountRupees) * 100);
}

app.post('/create-payment', async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 1 || amount > 10000) {
      return res.status(400).json({ message: 'Amount must be between 1 and 10000' });
    }

    const payload = {
      amount: toPaise(amount),
      currency: 'INR',
      description: 'Payment via UroPay',
    };

    const hashedSecret = hashSecret(SECRET);

    const response = await fetch(UROPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${hashedSecret}`
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('UroPay error:', data);
      return res.status(500).json({ message: data.message || 'UroPay API error', detail: data });
    }

    const paymentUrl = data.payment_url || data.link || data.url || data.data?.payment_url;
    if (!paymentUrl) {
      return res.status(500).json({ message: 'No payment URL returned', raw: data });
    }

    res.json({ payment_url: paymentUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
