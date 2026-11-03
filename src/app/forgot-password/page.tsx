import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot Password",
  description: "Reset the password for your Ceylon IT Tours account.",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <section className="bg-ivory py-16 lg:py-24">
      <Container className="mx-auto max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound size={26} />
          </span>
          <h1 className="font-display text-3xl font-semibold text-midnight sm:text-4xl">Forgot your password?</h1>
          <p className="text-sm text-slate">Enter your account email and we&apos;ll send you a link to choose a new one.</p>
        </div>

        <div className="rounded-3xl bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
          <ForgotPasswordForm />
        </div>
      </Container>
    </section>
  );
}
