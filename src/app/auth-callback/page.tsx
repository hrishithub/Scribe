//this is to sync user to db (if user is logged in to first time and is not in db) 

"use client"

import { useRouter, useSearchParams } from 'next/navigation' 
import { trpc } from '../_trpc/client'
import { Loader2 } from 'lucide-react'

const Page =  () => {
    const router = useRouter()

    const searchParams = useSearchParams()
    const origin = searchParams.get('origin') 

  
    
     {/*
     //not typesafe without trpc
     const data2= await apiResponse.json() 
     //used trpc so typesafe here data will get is string type (look at index.ts) test: publicProcedure.query(()=> is returning string
     const {data} = trpc.test.useQuery() // because test: publicProcedure.query(()=> in index.ts
  */}  

  //authcallback is also public procedure any one call it wheather they are auth or not

  const {data,isLoading} =   trpc.authCallback.useQuery(undefined, {
    onSuccess: ({ success }) => {
      if (success) {
        // user is synced to db now navigate user to dashboard
        router.push(origin ? `/${origin}` : '/dashboard')
      }
    },
    onError: (err) => {
      if (err.data?.code === 'UNAUTHORIZED') {
        router.push('/sign-in')
      }
    },
    retry: true,
    retryDelay: 500,
  })
return(
  <div className='w-full mt-24 flex justify-center'>
      <div className='flex flex-col items-center gap-2'>
        <Loader2 className='h-8 w-8 animate-spin text-zinc-800' />
        <h3 className='font-semibold text-xl'>
          Setting up your account...
        </h3>
        <p>You will be redirected automatically</p>
      </div>
    </div>
)

}  
export default Page