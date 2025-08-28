// serrbi/apps/web/server/services/verification.ts
import { prisma } from "@workspace/db"
import { v4 as uuidv4 } from "uuid"



export const getResetPasswordTokenbyToken = async (token: string) => {
  try {

    const passwordResetToken = await prisma.passwordResetToken.findFirst({
      where:  { token },
    }) 

    return passwordResetToken;
   
  } catch {
    return null
  }
}
//get reset password token by email

export const getResetPasswordTokenbyEmail = async (email: string) => {
  try {

    const passwordResetToken = await prisma.passwordResetToken.findFirst({
      where:  {  email: email },
    })

    return passwordResetToken;
   
  } catch {
    return null
  }
}

//create reset password token
export const createResetPasswordToken = async (email: string) => {
  const token = uuidv4();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  const existingToken = await getResetPasswordTokenbyEmail(email);

  if(existingToken){
    await prisma.passwordResetToken.delete({
      where: { id: existingToken.id },
    })
  }
  

  const passwordResetToken = await prisma.passwordResetToken.create({
    data: { email, token, expires },
  })

  return passwordResetToken;
}
  