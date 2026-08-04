"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Send, CheckCircle2 } from "lucide-react";
import { newsletterSchema, type NewsletterValues } from "@/lib/validation/schemas";
import { cn } from "@/lib/utils";

export function NewsletterForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<NewsletterValues>({ resolver: zodResolver(newsletterSchema) });

  async function onSubmit(values: NewsletterValues) {
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Request failed");
      setStatus("success");
      reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-3 text-sm font-medium text-white">
        <CheckCircle2 size={18} className="text-secondary" />
        You&apos;re subscribed — welcome aboard!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-full bg-white/10 p-1.5 pl-4 ring-1 ring-white/15 focus-within:ring-secondary">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Your email address"
          className="h-10 w-full min-w-0 bg-transparent text-sm text-white placeholder:text-white/50 focus:outline-none"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className={cn(
            "flex h-10 shrink-0 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-dark disabled:opacity-60",
          )}
        >
          {isSubmitting ? "Sending…" : "Subscribe"}
          <Send size={14} />
        </button>
      </div>
      {errors.email && <p className="text-xs font-medium text-orange-200">{errors.email.message}</p>}
      {status === "error" && (
        <p className="text-xs font-medium text-orange-200">Something went wrong — please try again.</p>
      )}
    </form>
  );
}
