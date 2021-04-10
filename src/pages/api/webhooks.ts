import { NextApiRequest, NextApiResponse } from "next";
import { Readable } from 'stream'; //módulo stream do node
import Stripe from "stripe";
import { stripe } from "../../services/stripe";
import { saveSubscription } from "./_lib/manageSubscription";

//Arquivo responsável por receber todo evento do stripe "webHooks" e redirecionar para esta rota
// .\stripe listen --forward-to localhost:3000/webhooks

async function buffer(readable: Readable) { //Armazena o valor toda vez que recebemos uma informação da requisição
  const chunks = [];

  for await (const chunk of readable) { //Aguarda novos chunks e poem ele aqui dentro
    chunks.push(
      typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    );
  }
  return Buffer.concat(chunks); //Concatena todos os chunks e converte em um Buffer do node.
}

export const config = {
  api: {
    bodyParser: false //Desativa configuração padrão do next.js
  }
}

const relevanEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])


export default async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const buf = await buffer(req)
    const secret = req.headers['stripe-signature']
    console.log('evento recebido')

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(buf, secret, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhookxx error: ${err.message}`); //posso usar um sentry para monitorar erros no futuro.
    }

    const { type } = event;

    if (relevanEvents.has(type)) {
      try {
        switch (type) {
          case 'customer.subscription.updated':
          case 'customer.subscription.deleted':

            const subscription = event.data.object as Stripe.Subscription;

            await saveSubscription(
              subscription.id,
              subscription.customer.toString(),
              false
            );

            break;

          case 'checkout.session.completed':

            const checkoutSession = event.data.object as Stripe.Checkout.Session //Essa tipagem salva porque trás todos os

            await saveSubscription(
              checkoutSession.subscription.toString(),
              checkoutSession.customer.toString(),
              true,
            )

            break;
          default:
            throw new Error('Unhandled event.')
        }
      } catch (err) {
        return res.json({ error: 'Webhook handler failed.' })
      }
    }

    res.json({ received: true })
  } else {
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method not allowed')
  }
}