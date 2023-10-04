import {z} from "zod" 

//we know zod is a validation lib so here we define scj=hema for input data of sendmessage 
//then in chat files zod resolver will validate input data against this schme 

export const SendMessageValidator = z.object({
    fileId: z.string(),
    message: z.string()
})