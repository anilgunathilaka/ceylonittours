"use client";

import { useActionState, useEffect, useRef, useTransition, type FormEvent } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { addBlockAction, addRuleAction, type ProductFormState } from "@/app/admin/products/actions";
import { ErrorText, inputClass, labelClass } from "@/components/admin/products/OptionForm";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const initialState: ProductFormState = { ok: false };

/**
 * Submits through a transition (not the form `action` prop, which resets the form even when
 * validation fails) and clears the form only after a successful save.
 */
function useScheduleForm(serverAction: typeof addRuleAction) {
  const [state, dispatch] = useActionState(serverAction, initialState);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => dispatch(formData));
  };
  return { state, pending, ref, onSubmit };
}

function Status({ state }: { state: ProductFormState }) {
  if (!state.message) return null;
  return state.ok ? (
    <span className="flex items-center gap-1.5 text-sm font-medium text-nature">
      <CheckCircle2 size={15} /> {state.message}
    </span>
  ) : (
    <ErrorText>{state.message}</ErrorText>
  );
}

function Submit({ pending, children }: { pending: boolean; children: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-white hover:bg-primary-dark disabled:opacity-50"
    >
      {pending && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function AddRuleForm({ optionId, today }: { optionId: string; today: string }) {
  const { state, pending, ref, onSubmit } = useScheduleForm(addRuleAction);
  const errors = state.errors ?? {};

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-ivory/60 p-4" noValidate>
      <input type="hidden" name="optionId" value={optionId} />
      <p className="font-semibold text-midnight">Add a schedule</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>From date</span>
          <input type="date" name="startDate" defaultValue={today} className={cn(inputClass, "h-10")} />
          {errors.startDate && <ErrorText>{errors.startDate}</ErrorText>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Until (optional)</span>
          <input type="date" name="endDate" className={cn(inputClass, "h-10")} />
          {errors.endDate && <ErrorText>{errors.endDate}</ErrorText>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Start times</span>
          <input name="startTimes" placeholder="08:00, 14:00" className={cn(inputClass, "h-10")} />
          {errors.startTimes && <ErrorText>{errors.startTimes}</ErrorText>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Spots per start time</span>
          <input type="number" name="capacity" min={1} defaultValue={10} className={cn(inputClass, "h-10")} />
          {errors.capacity && <ErrorText>{errors.capacity}</ErrorText>}
        </label>
      </div>
      <div className="flex flex-col gap-1.5">
        <span className={labelClass}>Runs on</span>
        <div className="flex flex-wrap gap-2">
          {WEEKDAYS.map((day, index) => (
            <label
              key={day}
              className="flex cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-midnight has-[:checked]:border-primary has-[:checked]:bg-primary/5"
            >
              <input type="checkbox" name="weekdays" value={index} defaultChecked className="accent-primary" />
              {day}
            </label>
          ))}
        </div>
        {errors.weekdays && <ErrorText>{errors.weekdays}</ErrorText>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending}>Add schedule</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}

export function AddBlockForm({ optionId, startTimes }: { optionId: string; startTimes: string[] }) {
  const { state, pending, ref, onSubmit } = useScheduleForm(addBlockAction);
  const errors = state.errors ?? {};

  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4 rounded-2xl border border-border bg-ivory/60 p-4" noValidate>
      <input type="hidden" name="optionId" value={optionId} />
      <p className="font-semibold text-midnight">Block dates</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Date</span>
          <input type="date" name="date" className={cn(inputClass, "h-10")} />
          {errors.date && <ErrorText>{errors.date}</ErrorText>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Until (optional)</span>
          <input type="date" name="endDate" className={cn(inputClass, "h-10")} />
          {errors.endDate && <ErrorText>{errors.endDate}</ErrorText>}
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Start time</span>
          <select name="startTime" className={cn(inputClass, "h-10")}>
            <option value="">Whole day</option>
            {startTimes.map((time) => (
              <option key={time} value={time}>
                {time} only
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Reason (internal)</span>
          <input name="reason" placeholder="e.g. Poya day, guide on leave" className={cn(inputClass, "h-10")} />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Submit pending={pending}>Block</Submit>
        <Status state={state} />
      </div>
    </form>
  );
}
