import type { Metadata } from "next";
import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Register for a Ceylon IT Tours account to book Sri Lanka tour packages.",
  alternates: { canonical: "/register" },
  robots: { index: false, follow: false },
};

export default function RegisterPage() {
  return (
    <section className="bg-ivory py-16 lg:py-24">
      <Container className="mx-auto max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserPlus size={26} />
          </span>
          <h1 className="font-display text-3xl font-semibold text-midnight sm:text-4xl">Create your account</h1>
          <p className="text-sm text-slate">
            Register to check availability and book tailor-made Sri Lanka tour packages.
          </p>
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
          <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-midnight/5" />}>
            <RegisterForm />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
