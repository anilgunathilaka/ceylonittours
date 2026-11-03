"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { CheckCircle2, Mail } from "lucide-react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { forgotPasswordSchema, type ForgotPasswordValues } from "@/lib/validation/schemas";

export function ForgotPasswordForm() {
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema) });

  async function onSubmit(values: ForgotPasswordValues) {
    setFormError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      if (!res.ok) {
        setFormError(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSentMessage(data.message ?? "Check your inbox for a reset link.");
    } catch {
      setFormError("Something went wrong. Please try again.");
    }
  }

  if (sentMessage) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <CheckCircle2 size={36} className="text-nature" />
        <p className="text-sm text-midnight">{sentMessage}</p>
        <p className="text-xs text-slate">The link expires in 1 hour. Don&apos;t forget to check your spam folder.</p>
        <Link href="/login" className="text-sm font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        icon={<Mail size={16} />}
        error={errors.email?.message}
        {...register("email")}
      />

      {formError && <p className="text-sm font-medium text-accent-dark">{formError}</p>}

      <Button type="submit" size="lg" className="w-full justify-center" disabled={isSubmitting}>
        {isSubmitting ? "Sending…" : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-slate">
        Remembered it?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}
