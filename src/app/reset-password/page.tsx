import type { Metadata } from "next";
import { Suspense } from "react";
import { KeyRound } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset Password",
  robots: { index: false, follow: false },
  // The token is in the URL; don't pass the full address on to other sites
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    <section className="bg-ivory py-16 lg:py-24">
      <Container className="mx-auto max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound size={26} />
          </span>
          <h1 className="font-display text-3xl font-semibold text-midnight sm:text-4xl">Choose a new password</h1>
          <p className="text-sm text-slate">Use at least 8 characters.</p>
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
          <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-midnight/5" />}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </Container>
    </section>
  );
}
