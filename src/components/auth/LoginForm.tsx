"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Mail } from "lucide-react";
import { TextField } from "@/components/ui/FormField";
import { Button } from "@/components/ui/Button";
import { DEFAULT_AUTH_REDIRECT, safeCallbackUrl } from "@/lib/auth/redirect";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { loginSchema, type LoginValues } from "@/lib/validation/schemas";

export function LoginForm({ googleEnabled = false }: { googleEnabled?: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = safeCallbackUrl(searchParams.get("callbackUrl"));
  const passwordReset = searchParams.get("reset") === "1";
  const [formError, setFormError] = useState<string | null>(() => {
    const error = searchParams.get("error");
    if (!error) return null;
    if (error === "AccessDenied") return "Google sign-in was denied. Please use a verified Google account.";
    return "Sign-in failed. Please try again.";
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setFormError(null);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });

    if (result?.error) {
      setFormError("Invalid email or password. Please try again.");
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {googleEnabled && (
        <>
          <GoogleSignInButton callbackUrl={callbackUrl} label="Continue with Google" />
          <AuthDivider />
        </>
      )}

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
        autoComplete="current-password"
        icon={<Lock size={16} />}
        error={errors.password?.message}
        {...register("password")}
      />
      <Link href="/forgot-password" className="-mt-2 self-end text-sm font-semibold text-primary hover:underline">
        Forgot password?
      </Link>

      {passwordReset && !formError && (
        <p role="status" className="rounded-xl bg-nature/10 px-4 py-3 text-sm font-medium text-midnight ring-1 ring-nature/30">
          Your password has been changed. Sign in with your new password.
        </p>
      )}
      {formError && <p className="text-sm font-medium text-accent-dark">{formError}</p>}

      <Button type="submit" size="lg" className="w-full justify-center" disabled={isSubmitting}>
        {isSubmitting ? "Signing in…" : "Sign In"}
      </Button>

      <p className="text-center text-sm text-slate">
        Don&apos;t have an account?{" "}
        <Link
          href={`/register${callbackUrl !== DEFAULT_AUTH_REDIRECT ? `?callbackUrl=${encodeURIComponent(callbackUrl)}` : ""}`}
          className="font-semibold text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
