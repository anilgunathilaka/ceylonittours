"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { CalendarDays, CheckCircle2, Mail, MessageSquare, Phone, User } from "lucide-react";
import { TextField } from "@/components/ui/FormField";
import { contactSchema, type ContactValues } from "@/lib/validation/schemas";

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const packageTitle = searchParams.get("title");
  const travelDate = searchParams.get("date");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ContactValues>({ resolver: zodResolver(contactSchema) });

  useEffect(() => {
    if (session?.user?.name) setValue("name", session.user.name);
    if (session?.user?.email) setValue("email", session.user.email);
  }, [session, setValue]);

  useEffect(() => {
    if (packageTitle) {
      setValue(
        "message",
        travelDate
          ? `I'd like to book "${packageTitle}" on ${travelDate}. Please confirm availability and a quote.`
          : `I'd like to check availability for "${packageTitle}". Please share available dates and a quote.`,
      );
    }
  }, [packageTitle, travelDate, setValue]);

  useEffect(() => {
    if (travelDate) setValue("travelDate", travelDate);
  }, [travelDate, setValue]);

  async function onSubmit(values: ContactValues) {
    try {
      const res = await fetch("/api/contact", {
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
      <div className="flex flex-col items-center gap-3 rounded-2xl bg-nature/10 p-10 text-center">
        <CheckCircle2 size={40} className="text-nature" />
        <h3 className="font-display text-xl font-semibold text-midnight">Message sent</h3>
        <p className="max-w-sm text-sm text-slate">
          Thanks for reaching out — a trip designer will reply within one business day.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {packageTitle && (
        <p className="rounded-xl bg-primary/5 px-4 py-3 text-sm text-midnight">
          Booking enquiry for <span className="font-semibold">{packageTitle}</span>
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <TextField label="Full Name" icon={<User size={16} />} error={errors.name?.message} {...register("name")} />
        <TextField label="Email" type="email" icon={<Mail size={16} />} error={errors.email?.message} {...register("email")} />
        <TextField label="Phone (optional)" icon={<Phone size={16} />} error={errors.phone?.message} {...register("phone")} />
        <TextField
          label="Preferred Travel Date (optional)"
          type="date"
          icon={<CalendarDays size={16} />}
          error={errors.travelDate?.message}
          {...register("travelDate")}
        />
      </div>

      <label className="flex flex-col gap-1.5 text-left">
        <span className="text-xs font-semibold tracking-wide text-slate uppercase">Tell Us About Your Trip</span>
        <div className="relative">
          <MessageSquare size={16} className="pointer-events-none absolute top-4 left-3.5 text-slate" />
          <textarea
            rows={5}
            placeholder="Dates, interests, group size, budget — anything that helps us plan."
            className="w-full resize-none rounded-xl border border-border bg-surface py-3 pr-4 pl-10 text-sm text-midnight placeholder:text-slate/60 focus:border-secondary focus:outline-none"
            aria-invalid={!!errors.message}
            {...register("message")}
          />
        </div>
        {errors.message && <span className="text-xs font-medium text-accent-dark">{errors.message.message}</span>}
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-13 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary-dark disabled:opacity-60"
      >
        {isSubmitting ? "Sending…" : "Send Enquiry"}
      </button>

      {status === "error" && (
        <p className="text-center text-sm font-medium text-accent-dark">
          Something went wrong — please try again or email us directly.
        </p>
      )}
    </form>
  );
}
