"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

type Props = {
  year: number;
  month: number; // 0-indexed
  onChange: (year: number, month: number) => void;
};

export function MonthNav({ year, month, onChange }: Props) {
  const now = new Date();

  function prev() {
    if (month === 0) onChange(year - 1, 11);
    else onChange(year, month - 1);
  }

  function next() {
    if (month === 11) onChange(year + 1, 0);
    else onChange(year, month + 1);
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prev}>
        <ChevronLeft size={16} />
      </Button>
      <span className="text-sm font-semibold w-36 text-center">
        {MONTHS[month]} {year}
      </span>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={next} disabled={isCurrentMonth}>
        <ChevronRight size={16} />
      </Button>
    </div>
  );
}
