import { z } from "zod";



export function validationError(error : z.ZodError){
    return {
        message: 'Invalid Input',
        details: error.issues.map((issue) => ({

            field: issue.path.join('.'),
            message : issue.message

        }))   
    }
}