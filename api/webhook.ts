import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

const PRICES = {
  DAILY_PASS: 'price_1TLJs1Q4KbuvG3PnKcLIsaYW',
  AX_PREMIUM: 'price_1TLJs7Q4KbuvG3PnbS9W0Idz',
};

export const config = {
  api: {
    bodyParser: false,
  },
};

async function buffer(readable: VercelRequest) {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody = await buffer(req);
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig!, endpointSecret || '');
  } catch (err: any) {
    console.error('Webhook Error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { userId, priceId } = session.metadata || {};

    if (userId && priceId) {
      if (priceId === PRICES.DAILY_PASS) {
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);

        await supabase.from('daily_passes').insert({
          user_id: userId,
          stripe_payment_intent_id: session.payment_intent as string,
          amount_paid_cents: 100,
          expires_at: expiresAt.toISOString()
        });
      } else if (priceId === PRICES.AX_PREMIUM) {
        await supabase.from('profiles').update({ 
          is_premium: true,
          stripe_customer_id: session.customer as string 
        }).eq('user_id', userId);
      }
    }
  }

  return res.status(200).json({ received: true });
}
