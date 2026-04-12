import { VercelRequest, VercelResponse } from '@vercel/node';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16' as any,
});

const PRICES = {
  DAILY_PASS: 'price_1TLJs1Q4KbuvG3PnKcLIsaYW',
  AX_PREMIUM: 'price_1TLJs7Q4KbuvG3PnbS9W0Idz',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, priceId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      line_items: [{ price: priceId, quantity: 1 }],
      mode: priceId === PRICES.AX_PREMIUM ? 'subscription' : 'payment',
      success_url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/#entry=success`,
      cancel_url: `${process.env.VITE_APP_URL || 'http://localhost:5173'}/#entry=cancel`,
      metadata: { userId, priceId },
      payment_method_collection: 'always',
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Session Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
