"use server";

import { signIn, signOut } from "@/auth";

export const loginGoogle = async (callbackUrl: string = "/") => {
  await signIn("google", { redirectTo: callbackUrl });
};

export const loginCredentials = async (
  email: string,
  password: string,
  callbackUrl: string = "/"
) => {
  await signIn("credentials", { email, password, redirectTo: callbackUrl });
};

export const logout = async () => {
  await signOut({ redirectTo: "/" }); 
};

