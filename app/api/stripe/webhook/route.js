import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { supabaseAdmin } from '../../../../lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');
  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook signature invalid: ${err.message}` }, { status: 400 });
  }

  const db = supabaseAdmin();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    await db.from('subscribers').upsert(
      {
        email: session.customer_email,
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        status: 'active',
      },
      { onConflict: 'email' }
    );
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    await db.from('subscribers').update({ status: 'canceled' }).eq('stripe_subscription_id', sub.id);
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    await db.from('subscribers').update({ status: 'past_due' }).eq('stripe_customer_id', invoice.customer);
  }

  return NextResponse.json({ received: true });
}
