import Dashboard from '@/components/Dashboard'
import { db } from '@/db'
import { getUserSubscriptionPlan } from '@/lib/stripe'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import { redirect } from 'next/navigation'

const Page = async () => {
  const { getUser } = getKindeServerSession()
  const user = getUser() //to get user info to check for user sub

  //means user isnt logged in so for them to perform some action on dashboard they need to authenticate first
  if (!user || !user.id) redirect('/auth-callback?origin=dashboard')


  const dbUser = await db.user.findFirst({
    where: {
      id: user.id
    }
  }) 

//means user is not in db (happens if user logged in for first time) so redirect them (to auth-callback)to sync user to db
//now through web tokens of kinde user info will send to db through app
if(!dbUser) redirect('/auth-callback?origin=dashboard')


  const subscriptionPlan = await getUserSubscriptionPlan()

  return (
     <Dashboard subscriptionPlan={subscriptionPlan}/>
    
  ) 
}

export default Page