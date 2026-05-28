import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    apiToken: string;
    user: DefaultSession["user"];
  }

  interface User {
    apiToken?: string;
    mockIdToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    apiToken: string;
  }
}
