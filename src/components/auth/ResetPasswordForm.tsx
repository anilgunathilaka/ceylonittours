"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock } from "lucide-react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation/schemas";

export function ResetPasswordForm() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { token } });

  if (!token) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-midnight">This reset link is incomplete. Please use the link from your email, or request a new one.</p>
        <Link href="/forgot-password" className="text-sm font-semibold text-primary hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  async function onSubmit(values: ResetPasswordValues) {
    setFormError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setFormError(data.error ?? "Could not reset the password. Please try again.");
        return;
      }
      router.push("/login?reset=1");
    } catch {
      setFormError("Could not reset the password. Please try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <input type="hidden" {...register("token")} />
      <TextField
        label="New password"
        type="password"
        autoComplete="new-password"
        icon={<Lock size={16} />}
        error={errors.password?.message}
        {...register("password")}
      />
      <TextField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        icon={<Lock size={16} />}
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {(formError || errors.token?.message) && (
        <div className="flex flex-col gap-1 text-sm font-medium text-accent-dark">
          <p>{formError ?? errors.token?.message}</p>
          <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
            Request a new link
          </Link>
        </div>
      )}

      <Button type="submit" size="lg" className="w-full justify-center" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : "Set new password"}
      </Button>
    </form>
  );
}
