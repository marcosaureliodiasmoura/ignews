import NextAuth from 'next-auth'
import Providers from 'next-auth/providers'
import { query as q } from 'faunadb';

import { fauna } from '../../../services/fauna';

export default NextAuth({
  providers: [
    Providers.Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  // jwt: {
  //   signingKey: process.env.SIGNING_KEY,
  // },
  callbacks: {
    async signIn(user, account, profile) {
      // console.log(user);
      const { email } = user;

      try {
        await fauna.query(
          q.If( //Se
            q.Not( //Não
              q.Exists( //Existir
                q.Match( //Um usuário no qual o match não é nessa condição aqui
                  q.Index('user_by_email'), //Procura por email no bando de dados
                  q.Casefold(user.email), //Casefold evita problemas com maiusc e minusc
                )
              )
            ),
            q.Create( //Quero que crie o usuário caso ele não exista no banco
              q.Collection('users'), //nome da tabela
              { data: { email } }
            ),
            q.Get( //Senão busca usuario email //Get: é um select dentro do sql
              q.Match(
                q.Index('user_by_email'),
                q.Casefold(user.email),
              )
            )
          )
        )
        return true
      } catch {
        return false
      }
    }
  }
}
)

// export default NextAuth({
//   providers: [
//     Providers.GitHub({
//       clientId: process.env.GITHUB_CLIENT_ID,
//       clientSecret: process.env.GITHUB_CLIENT_SECRET,
//       scope: 'read:user'
//     }),
//   ],
// })