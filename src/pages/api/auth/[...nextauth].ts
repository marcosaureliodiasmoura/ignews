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
  callbacks:{
    async signIn(user, account, profile){
      // console.log(user);
      const {email } = user;

     try{
      await fauna.query(
        q.Create(
          q.Collection('users'), //nome da tabela
          {data: {email}}
        )
      )
      return true
     } catch{
       return false
     }

    }
  }

})

// export default NextAuth({
//   providers: [
//     Providers.GitHub({
//       clientId: process.env.GITHUB_CLIENT_ID,
//       clientSecret: process.env.GITHUB_CLIENT_SECRET,
//       scope: 'read:user'
//     }),
//   ],
// })