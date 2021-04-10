import { query } from "faunadb";
import { fauna } from "../../../services/fauna";
import { stripe } from "../../../services/stripe";

export async function saveSubscription(
    subscriptionId: string,
    customerId: string,
    createAction = false //Para checar se é uma ação de criação ou não, iremos trabalhar com update e delete tambem.

) {
    //Busque o usuário no banco faunaDB
    //desta maneira buscamos apenas a referencia do usuario
    const userRef = await fauna.query(
        query.Select(
            "ref",
            query.Get(
                query.Match(
                    query.Index('user_by_stripe_customer_id'),
                    customerId
                )
            )
        )
    );

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    const subscriptionData = {
        id: subscription.id,
        userId: userRef,
        status: subscription.status,
        price_id: subscription.items.data[0].price.id,

    };

    
    if (createAction) { //Criando uma subscription que não existe no banco
        await fauna.query(
            query.Create(
                query.Collection('subscriptions'),
                { data: subscriptionData }
            )
        );
    }
    else { //Atualiza a subscription existente com Replace
        await fauna.query(
            query.Replace(
                query.Select(
                    "ref",
                    query.Get(
                        query.Match(
                            query.Index('subscription_by_id'),
                            subscriptionId
                        )
                    )
                ),
                { data: subscriptionData }
            ),
        );
    }
};

