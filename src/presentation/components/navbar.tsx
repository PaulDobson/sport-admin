"use client";

import { useState } from "react";
import { ChevronDown, PawPrint } from "lucide-react";

const items = ["Overview", "My pets", "Devices", "Settings"];

export function Navbar() {
  const [active, setActive] = useState("Overview");

  return (
    <nav
      className="flex flex-wrap items-center justify-between gap-4 rounded-full border border-border bg-card px-5 py-3"
      aria-label="Primary navigation"
    >
      <div className="flex items-center gap-3 text-lg font-semibold text-primary">
        <PawPrint className="size-5" aria-hidden="true" />
        <span>PawTrack</span>
      </div>
      <div className="order-3 flex w-full items-center gap-1 overflow-x-auto sm:order-none sm:w-auto">
        {items.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setActive(item)}
            className={`whitespace-nowrap rounded-full px-5 py-2 text-xs transition-colors ${active === item ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            aria-current={active === item ? "page" : undefined}
          >
            {item}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="flex items-center gap-2 text-xs text-muted-foreground"
        aria-label="Open Jenny Wilson profile menu"
      >
        <span className="grid size-7 place-items-center rounded-full bg-primary/20 text-primary">
          JW
        </span>
        <span>Jenny Wilson</span>
        <ChevronDown className="size-3" aria-hidden="true" />
      </button>
    </nav>
  );
}
