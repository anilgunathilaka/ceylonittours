"use client";

import { useState } from "react";

/** Offer type picker; the "days" field only shows (and is labelled) for the types that use it. */
export function OfferTypeFields({ fieldClass, labelClass }: { fieldClass: string; labelClass: string }) {
  const [type, setType] = useState<"early_bird" | "last_minute" | "dates">("early_bird");
  return (
    <>
      <label className={labelClass}>
        Type
        <select name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={fieldClass}>
          <option value="early_bird">Early bird — booked well in advance</option>
          <option value="last_minute">Last minute — booked shortly before</option>
          <option value="dates">Travel dates — e.g. low season</option>
        </select>
      </label>
      {type !== "dates" && (
        <label className={labelClass}>
          {type === "early_bird" ? "Booked at least this many days ahead" : "Booked at most this many days ahead"}
          <input type="number" name="days" min={0} max={730} defaultValue={type === "early_bird" ? 30 : 3} className={fieldClass} />
        </label>
      )}
    </>
  );
}
