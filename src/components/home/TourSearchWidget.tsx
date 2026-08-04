"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, MapPin, Search, Users, Waves } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SelectField, TextField } from "@/components/ui/FormField";
import { destinations } from "@/lib/data/destinations";
import { tourSearchSchema, type TourSearchInput, type TourSearchValues } from "@/lib/validation/schemas";

const tourTypes = [
  "Culture",
  "Hill Country",
  "Wildlife",
  "Beaches",
  "Adventure",
  "Wellness",
  "Transfers",
  "Day Trips",
  "Multi-Day Tours",
  "City Tours",
  "Watersports",
];

export function TourSearchWidget() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TourSearchInput, unknown, TourSearchValues>({
    resolver: zodResolver(tourSearchSchema),
    defaultValues: { destination: "", tourType: "", travellers: 2, date: "" },
  });

  function onSubmit(values: TourSearchValues) {
    const params = new URLSearchParams({
      destination: values.destination,
      type: values.tourType,
      travellers: String(values.travellers),
      date: values.date,
    });
    router.push(`/tour-packages?${params.toString()}`);
  }

  return (
    <div id="tour-search" className="relative z-20 mt-2 scroll-mt-28 sm:mt-4">
      <Container>
        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="grid grid-cols-1 gap-4 rounded-3xl bg-white p-6 shadow-elevated sm:grid-cols-2 sm:p-8 lg:grid-cols-[1.2fr_1fr_0.8fr_1fr_auto] lg:items-end lg:gap-3"
        >
          <SelectField label="Destination" icon={<MapPin size={16} />} error={errors.destination?.message} {...register("destination")}>
            <option value="">Where to?</option>
            {destinations.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </SelectField>

          <SelectField label="Tour Type" icon={<Waves size={16} />} error={errors.tourType?.message} {...register("tourType")}>
            <option value="">Any type</option>
            {tourTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </SelectField>

          <TextField
            label="Travellers"
            type="number"
            min={1}
            max={20}
            icon={<Users size={16} />}
            error={errors.travellers?.message}
            {...register("travellers")}
          />

          <TextField
            label="Travel Date"
            type="date"
            icon={<CalendarDays size={16} />}
            error={errors.date?.message}
            {...register("date")}
          />

          <button
            type="submit"
            className="flex h-12 items-center justify-center gap-2 rounded-xl bg-accent px-6 text-sm font-semibold text-white transition-colors hover:bg-accent-dark sm:col-span-2 lg:col-span-1"
          >
            <Search size={16} />
            Search Tours
          </button>
        </form>
      </Container>
    </div>
  );
}
