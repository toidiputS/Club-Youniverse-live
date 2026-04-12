import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_live_...', {
  apiVersion: '2023-10-16' as any,
});

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ktfezfnkghtwbkmhxdyd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_KEY) {
  console.error('\n❌ ERROR: SUPABASE_SERVICE_ROLE_KEY is missing from .env');
  console.error('Please add your Supabase Service Role Key to your .env file to enable monetization webhooks.\n');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Price IDs for Club Youniverse
const PRICES = {
  DAILY_PASS: 'price_1TLJs1Q4KbuvG3PnKcLIsaYW',
  AX_PREMIUM: 'price_1TLJs7Q4KbuvG3PnbS9W0Idz',
};

const app = express();
app.use(cors());

// Checkout Session Creation
app.post('/create-checkout-session', express.json(), async (req, res) => {
  const { userId, priceId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: priceId === PRICES.AX_PREMIUM ? 'subscription' : 'payment',
      success_url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/#entry=success`,
      cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/#entry=cancel`,
      metadata: { userId, priceId },
      // Enable saved payment methods for "One-Click" feel on next visit
      payment_method_collection: 'always',
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Session Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Customer Portal Session (for managing AX Premium)
app.post('/create-portal-session', express.json(), async (req, res) => {
  const { customerId } = req.body;
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/#settings`,
    });
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Webhook listener for processing payments
app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig!, endpointSecret || '');
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle successful payments
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, priceId } = session.metadata || {};

    if (userId && priceId) {
        console.log(`Processing successful payment for user ${userId}, price ${priceId}`);
        
        if (priceId === PRICES.DAILY_PASS) {
            // Grant 24h access
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 24);

            await supabase.from('daily_passes').insert({
                user_id: userId,
                stripe_payment_intent_id: session.payment_intent as string,
                amount_paid_cents: 100,
                expires_at: expiresAt.toISOString()
            });
            console.log(`Daily pass granted to ${userId}`);
        } else if (priceId === PRICES.AX_PREMIUM) {
            // Grant AX Premium status
            await supabase.from('profiles').update({ 
                is_premium: true,
                stripe_customer_id: session.customer as string 
            }).eq('user_id', userId);
            console.log(`AX Premium granted to ${userId}`);
        }
    }
  }

  res.json({ received: true });
});

const PORT = process.env.STRIPE_PORT || 4242;
app.listen(PORT, () => console.log(`🚀 Stripe Backend active on port ${PORT}`));
