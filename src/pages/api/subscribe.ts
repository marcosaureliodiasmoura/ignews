import { NextApiRequest ,NextApiResponse } from "next";
import { getSession } from 'next-auth/client';
import { query as q } from "faunadb";

import { stripe } from "../../services/stripe";
import { fauna } from "../../services/fauna";

type User = {
  ref: {
    id: string;
  }
  data: {
    stripe_customer_id: string;
  }
}

export default async(req: NextApiRequest, res: NextApiResponse) => {
  if(req.method === 'POST'){ //Só aceitaremos requisições do tipo POST
    const session = await getSession({ req}) //pega a informação do usuário logado na session
    
    const user = await fauna.query<User>( //Buscando usuário por email
      q.Get(
        q.Match(
          q.Index('user_by_email'),
          q.Casefold(session.user.email)
        )
      )
    )

    let customerId = user.data.stripe_customer_id //Aqui pega o valor do id do usuário do stripe

    if(!customerId){
      const stripeCustomer = await stripe.customers.create({ //Cria o usuário no banco de dados do stripe
        email: session.user.email,
        // metadata
      })
      
  
      await fauna.query(
        q.Update(
          q.Ref(q.Collection('users'), user.ref.id),
          {
            data: {
              stripe_customer_id: stripeCustomer.id,
            }
          }
        )
      )
      customerId = stripeCustomer.id
    }

    
  
     const stripeCheckoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'], //Via cartão de crédito
      billing_address_collection: 'required',
      line_items: [
        { price: 'price_1IcHrwCh0MWaSVcgkrukpMX0', quantity: 1}
      ],
      mode: 'subscription', //pagamento recorrente,
      allow_promotion_codes: true,
      success_url: process.env.STRIPE_SUCCESS_URL,
      cancel_url: process.env.STRIPE_CANCEL_URL
    })

    return res.status(200).json({sessionId: stripeCheckoutSession.id})
  } else { //Senão for POST
    res.setHeader('Allow', 'POST')
    res.status(405).end('Method not allowed')
  }
}