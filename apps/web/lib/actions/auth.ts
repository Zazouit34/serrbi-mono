"use server";

import { signIn, signOut } from "@/auth";
import { redirect } from "next/navigation";

export const loginGoogle = async (callbackUrl: string = "/") => {
  await signIn("google", { redirectTo: callbackUrl });
};

export const loginCredentials = async (
  email: string,
  password: string,
  callbackUrl: string = "/"
) => {
  try {
    await signIn("credentials", { 
      email, 
      password, 
      redirectTo: callbackUrl,
      redirect: false // Prevent automatic redirect
    });
    // Manually redirect to trigger session refresh
    redirect(callbackUrl);
  } catch (error) {
    // Handle auth errors
    throw error;
  }
};

export const logout = async () => {
  await signOut({ redirectTo: "/" });
};

