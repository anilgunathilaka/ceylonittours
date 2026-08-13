import type { Metadata } from "next";
import { Suspense } from "react";
import { LogIn } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to your Ceylon IT Tours account to book tour packages.",
  alternates: { canonical: "/login" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <section className="bg-ivory py-16 lg:py-24">
      <Container className="mx-auto max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <LogIn size={26} />
          </span>
          <h1 className="font-display text-3xl font-semibold text-midnight sm:text-4xl">Welcome back</h1>
          <p className="text-sm text-slate">Sign in to book tour packages and manage your trip requests.</p>
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-midnight/5" />}>
            <LoginForm />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
