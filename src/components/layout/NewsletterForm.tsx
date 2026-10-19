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
      <div className="flex items-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-medium text-midnight">
        <CheckCircle2 size={18} className="text-nature" />
        You&apos;re subscribed — welcome aboard!
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-2">
      <div className="flex items-center gap-2 rounded-full bg-white p-1.5 pl-4 ring-1 ring-white/20 focus-within:ring-white">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Your email address"
          className="h-10 w-full min-w-0 bg-transparent text-sm text-midnight placeholder:text-slate focus:outline-none"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          aria-label={isSubmitting ? "Sending…" : "Subscribe"}
          title="Subscribe"
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-logo text-white transition-opacity hover:opacity-85 disabled:opacity-60",
          )}
        >
          <Send size={15} />
        </button>
      </div>
      {errors.email && <p className="text-xs font-medium text-orange-200">{errors.email.message}</p>}
      {status === "error" && (
        <p className="text-xs font-medium text-orange-200">Something went wrong — please try again.</p>
      )}
    </form>
  );
}
