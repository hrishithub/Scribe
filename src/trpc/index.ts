import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  privateProcedure,
  publicProcedure,
  router,
} from './trpc'
import { TRPCError } from '@trpc/server'
import { db } from '@/db'
import { z } from 'zod'
import { INFINITE_QUERY_LIMIT } from '@/config/infinite-query'
import { absoluteUrl } from '@/lib/utils'
import {
  getUserSubscriptionPlan,
  stripe,
} from '@/lib/stripe'
import { PLANS } from '@/config/stripe'

export const appRouter = router({ 
    //.. query for GET req & mutaion for POST req
    // test: publicProcedure.query(()=>{  return 'Heyyy' })

    authCallback: publicProcedure.query(async () => {
        const { getUser } = getKindeServerSession()
        const user = getUser()
    
        if (!user.id || !user.email)
          throw new TRPCError({ code: 'UNAUTHORIZED' })
    
       // check if the user is in the database
        const dbUser = await db.user.findFirst({
          where: {
            id: user.id,
          },
        })
    
        //if not db user means user is here for first time so create user 
        if (!dbUser) {
          // create user in db
          await db.user.create({
            data: {
              id: user.id,
              email: user.email,
            },
          })
        }
    
        return { success: true }
      }), 

      //get user file is private procedure only auth user can use this to upload file
     
      getUserFiles: privateProcedure.query(async ({ ctx }) => {
        const { userId,user } = ctx
    
        return await db.file.findMany({
          where: {
            userId,
          },
        })
      }),   

      createStripeSession: privateProcedure.mutation(
        async ({ ctx }) => {
          const { userId } = ctx
    
          const billingUrl = absoluteUrl('/dashboard/billing') //on server side we cant use relative URL so we need to use absolute URL 
    
          if (!userId)
            throw new TRPCError({ code: 'UNAUTHORIZED' })
    
          const dbUser = await db.user.findFirst({
            where: {
              id: userId,
            },
          })
    
          if (!dbUser)
            throw new TRPCError({ code: 'UNAUTHORIZED' })
    
          const subscriptionPlan =
            await getUserSubscriptionPlan()
    
          if (
            subscriptionPlan.isSubscribed &&
            dbUser.stripeCustomerId
          ) {
            const stripeSession =
              await stripe.billingPortal.sessions.create({
                customer: dbUser.stripeCustomerId,
                return_url: billingUrl,
              })
    
            return { url: stripeSession.url }
          }
    
          const stripeSession =
            await stripe.checkout.sessions.create({
              success_url: billingUrl,
              cancel_url: billingUrl,
              payment_method_types: ['card'],
              mode: 'subscription',
              billing_address_collection: 'auto',
              line_items: [
                {
                  price: PLANS.find(
                    (plan) => plan.name === 'Pro'
                  )?.price.priceIds.test,
                  quantity: 1,
                },
              ],
              metadata: {
                userId: userId,
              },
            })
    
          return { url: stripeSession.url }
        }
      ),
    

   //api route to get file messages 
      getFileMessages: privateProcedure
      .input(
        z.object({
          limit: z.number().min(1).max(100).nullish(),
          cursor: z.string().nullish(),
          fileId: z.string(),
        })
      )
      .query(async ({ ctx, input }) => {
        const { userId } = ctx
        const { fileId, cursor } = input
        const limit = input.limit ?? INFINITE_QUERY_LIMIT
  
        const file = await db.file.findFirst({
          where: {
            id: fileId,
            userId,
          },
        }) 
       
        if (!file) throw new TRPCError({ code: 'NOT_FOUND' }) 
        //actually fetching messages 

        const messages = await db.message.findMany({
          take: limit + 1, //wont be displayed on screen unless user scroll up so apart from limit we took up extra messages also so when user scroll up they wont have to wait 
          where: {
            fileId,
          },
          orderBy: {
            createdAt: 'desc',
          },
          cursor: cursor ? { id: cursor } : undefined, //cursor is to fetch prev message (when user scroll up) then already fetched one as we dont want to fetch fetched msg again
          select: {
            id: true,
            isUserMessage: true,
            createdAt: true,
            text: true,
          },
        })
  
        let nextCursor: typeof cursor | undefined = undefined
        if (messages.length > limit) {
          const nextItem = messages.pop()
          nextCursor = nextItem?.id
        }
  
        return {
          messages,
          nextCursor,
        }
      }),
  
      
    //api route to get file upload status like pending / processed etc.
      getFileUploadStatus: privateProcedure
      .input(z.object({ fileId: z.string() }))
      .query(async ({ input, ctx }) => {
        const file = await db.file.findFirst({
          where: {
            id: input.fileId,
            userId: ctx.userId,
          },
        })
  
        if (!file) return { status: 'PENDING' as const }
  
        return { status: file.uploadStatus }
      }),

      getFile: privateProcedure
    .input(z.object({ key: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { userId } = ctx

      const file = await db.file.findFirst({
        where: {
          key: input.key,
          userId,
        },
      })

      if (!file) throw new TRPCError({ code: 'NOT_FOUND' })

      return file
    }),

      //mutation cause delete is POST req 
      //since POST req this do req some object as input to tell what & where to mutate
    
      deleteFile: privateProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const { userId } = ctx
  
        //to delete we need to find first 
        //along with file id we also pass user id cause anyone can delete any ones file just by passing file id so we need to make sure that if owner of the that 
        //file call this API ep then only delete file
        const file = await db.file.findFirst({
          where: {
            id: input.id,
            userId,
          },
        })
  
        if (!file) throw new TRPCError({ code: 'NOT_FOUND' })
  
        await db.file.delete({
          where: {
            id: input.id,
          },
        })
  
        return file
      }),
  
    
      
    

}); 


//Export type router type signature 
//NOT the router itself. 

export type AppRouter = typeof appRouter;