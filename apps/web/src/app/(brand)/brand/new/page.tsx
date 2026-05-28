"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { BrandKitForm } from "@/components/brand/brand-kit-form";

export default function NewBrandPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/brand/new");
    }
  }, [status, router]);

  if (status === "loading" || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-[var(--muted-foreground)]">Loading...</div>
      </div>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12">
      <h1 className="text-3xl font-bold mb-2">Create Brand Kit</h1>
      <p className="text-[var(--muted-foreground)] mb-8">
        Upload your brand assets and information to generate a challenge.
      </p>
      <BrandKitForm apiToken={session.apiToken} />
    </main>
  );
}
