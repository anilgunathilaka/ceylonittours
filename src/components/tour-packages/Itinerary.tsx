"use client";

import { useMemo, useState } from "react";
import { Car, ChevronDown, Flag, MapPin } from "lucide-react";
import { ADMISSION_LABELS } from "@/lib/cms/config";
import { RouteMap, type RoutePoint } from "@/components/tour-packages/RouteMap";
import { cn } from "@/lib/utils";
import type { TourPackage } from "@/types";

type Stop = NonNullable<TourPackage["itinerary"]>[number];

const COLLAPSED = 5;

/** Timeline of pickup, travel legs and stops, with a route map when stops have coordinates. */
export function Itinerary({ stops }: { stops: Stop[] }) {
  const [expanded, setExpanded] = useState(stops.length <= COLLAPSED + 1);
  const shown = expanded ? stops : stops.slice(0, COLLAPSED);

  // Main stops are numbered on the timeline and the map
  const numbered = useMemo(() => {
    let n = 0;
    return stops.map((stop) => ((stop.type ?? "stop") === "stop" ? ++n : undefined));
  }, [stops]);

  const points = useMemo<RoutePoint[]>(
    () =>
      stops.flatMap((stop, i) =>
        typeof stop.lat === "number" && typeof stop.lng === "number"
          ? [{ lat: stop.lat, lng: stop.lng, label: stop.title, main: (stop.type ?? "stop") === "stop", number: numbered[i] }]
          : [],
      ),
    [stops, numbered],
  );

  return (
    <div className={cn("grid grid-cols-1 gap-6", points.length > 0 && "md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]")}>
      <div>
        <ol className="relative">
          {shown.map((stop, i) => {
            const type = stop.type ?? "stop";
            const last = i === shown.length - 1 && expanded;
            return (
              <li key={i} className="relative flex gap-4 pb-5">
                {!last && (
                  <span
                    aria-hidden
                    className={cn(
                      "absolute top-8 bottom-0 left-[15px] w-0.5",
                      type === "transport" || shown[i + 1]?.type === "transport" ? "border-l-2 border-dashed border-accent/60" : "bg-accent/60",
                    )}
                  />
                )}
                <StopIcon type={type} number={numbered[i]} />
                <div className="min-w-0 pt-1">
                  {type === "pickup" && <p className="text-xs font-semibold tracking-wide text-slate uppercase">Pickup location</p>}
                  {type === "end" && <p className="text-xs font-semibold tracking-wide text-slate uppercase">Arrive back at</p>}
                  <p className={cn("text-midnight", type === "transport" ? "text-sm" : "font-semibold")}>{stop.title}</p>
                  {(stop.detail || stop.duration || stop.admission) && (
                    <p className="text-sm text-slate">
                      {[stop.detail, stop.duration && `(${stop.duration})`].filter(Boolean).join(" ")}
                      {stop.admission && (
                        <span className={cn("block text-xs", stop.admission === "included" || stop.admission === "free" ? "text-nature" : "text-accent-dark")}>
                          {ADMISSION_LABELS[stop.admission]}
                        </span>
                      )}
                    </p>
                  )}
                  {stop.note && <p className="text-xs text-secondary">{stop.note}</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {stops.length > COLLAPSED + 1 ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-2 hover:underline"
          >
            {expanded ? "Hide itinerary" : "View full itinerary"}
            <ChevronDown size={16} className={cn("transition-transform", expanded && "rotate-180")} />
          </button>
        ) : null}
      </div>

      {points.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="h-80 md:sticky md:top-28 md:h-[420px]">
            <RouteMap points={points} />
          </div>
          <div className="flex gap-4 text-xs text-slate">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full bg-primary" /> Main stop
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border-2 border-primary bg-white" /> Other stop
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function StopIcon({ type, number }: { type: string; number?: number }) {
  const base = "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full";
  if (type === "pickup") return <span className={cn(base, "bg-accent text-white")}><MapPin size={16} /></span>;
  if (type === "end") return <span className={cn(base, "bg-accent text-white")}><Flag size={15} /></span>;
  if (type === "transport")
    return (
      <span className={cn(base, "bg-surface text-slate ring-1 ring-border")}>
        <Car size={15} />
      </span>
    );
  return <span className={cn(base, "border-2 border-primary bg-surface text-xs font-semibold text-primary")}>{number}</span>;
}
