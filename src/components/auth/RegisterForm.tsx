"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail, User } from "lucide-react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { registerSchema, type RegisterValues } from "@/lib/validation/schemas";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/tour-packages";
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) });

  async function onSubmit(values: RegisterValues) {
    setFormError(null);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setFormError(data?.error ?? "Unable to create account. Please try again.");
      return;
    }

    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <TextField
        label="Full Name"
        autoComplete="name"
        icon={<User size={16} />}
        error={errors.name?.message}
        {...register("name")}
      />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        icon={<Mail size={16} />}
        error={errors.email?.message}
        {...register("email")}
      />
      <TextField
        label="Password"
        type="password"
        autoComplete="new-password"
        icon={<Lock size={16} />}
        error={errors.password?.message}
        {...register("password")}
      />
      <TextField
        label="Confirm Password"
        type="password"
        autoComplete="new-password"
        icon={<Lock size={16} />}
        error={errors.confirmPassword?.message}
        {...register("confirmPassword")}
      />

      {formError && <p className="text-sm font-medium text-accent-dark">{formError}</p>}

      <Button type="submit" size="lg" className="w-full justify-center" disabled={isSubmitting}>
        {isSubmitting ? "Creating account…" : "Create Account"}
      </Button>

      <p className="text-center text-sm text-slate">
        Already have an account?{" "}
        <Link
          href={`/login${callbackUrl !== "/tour-packages" ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="font-semibold text-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
