import { db } from '@/db'
import { getKindeServerSession } from '@kinde-oss/kinde-auth-nextjs/server'
import {
  createUploadthing,
  type FileRouter,
} from 'uploadthing/next'

import { PDFLoader } from 'langchain/document_loaders/fs/pdf'
import { OpenAIEmbeddings } from 'langchain/embeddings/openai'
import { PineconeStore } from 'langchain/vectorstores/pinecone'
import { getPineconeClient } from '@/lib/pinecone'
// import { getUserSubscriptionPlan } from '@/lib/stripe'
// import { PLANS } from '@/config/stripe'

 
const f = createUploadthing();
 
// const auth = (req: Request) => ({ id: "fakeId" }); // Fake auth function
 
// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  pdfUploader: f({ pdf: { maxFileSize: "4MB" } })
    // Set permissions and file types for this FileRoute
    .middleware(async ({ req }) => {
      // This code runs on your server before upload
      const {getUser} = getKindeServerSession()
      const user = getUser()
 
      // If you throw, the user will not be able to upload
      if (!user || !user.id) throw new Error("Unauthorized");
 
      // Whatever is returned here is accessible in onUploadComplete as `metadata`
      return { userId: user.id };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      const createdFile = await db.file.create({
        data: {
          key: file.key,
          name: file.name,
          userId: metadata.userId,
          url: `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`, //location where uploadthing store file
          uploadStatus: 'PROCESSING',
        },
      }) 

      try {
        const response = await fetch(
          `https://uploadthing-prod.s3.us-west-2.amazonaws.com/${file.key}`)
          const blob = await response.blob()

          //loading pdf file in memoery
          const loader = new PDFLoader(blob) 

          //extracting page level text(text on pages of PDF)

          const pageLevelDocs = await loader.load()
          
          const pagesAmt = pageLevelDocs.length

          // vectorize extracted text from pdf and index entire document
           const pinecone = await getPineconeClient()
           const pineconeIndex = pinecone.Index('scribe') 

           const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
          }) 

          await PineconeStore.fromDocuments(
            pageLevelDocs,
            embeddings,
            { 
              pineconeIndex, 
              //Saving a vector along with file id so easy to know that this particular vector from db belong to this particular file
              namespace: createdFile.id,
            }
          )
          
          await db.file.update({
            data: {
              uploadStatus: 'SUCCESS',
            },
            where: {
              id: createdFile.id,
            },
          })

      
        

        } catch(err){

          await db.file.update({
            data: {
              uploadStatus: 'FAILED',
            },
            where: {
              id: createdFile.id,
            },
          })

        }




    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
