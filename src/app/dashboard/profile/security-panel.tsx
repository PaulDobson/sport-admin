"use client";

import { useState } from "react";
import { ShieldCheck, CheckCircle2, Lock } from "lucide-react";
import { Button, FieldControl } from "@/presentation/components/primitives";
import { ChangePasswordForm } from "./change-password-form";

export function SecurityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);

  function handleSuccess() {
    setSavedOnce(true);
    setIsOpen(false);
  }

  return (
    <div className="rounded-2xl border border-white/6 bg-card p-5 sm:p-6">
      {/* Header row */}
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-border/50 pb-5">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <ShieldCheck className="h-4.5 w-4.5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Configuración de contraseña
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Gestiona y actualiza tu contraseña de acceso.
            </p>
          </div>
        </div>
      </div>

      {/* Success message after save */}
      {savedOnce && !isOpen && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5">
          <CheckCircle2
            className="h-4 w-4 shrink-0 text-success"
            aria-hidden="true"
          />
          <p className="text-sm text-success">
            Contraseña actualizada correctamente.
          </p>
        </div>
      )}

      {/* Inline form or placeholder */}
      {isOpen ? (
        <ChangePasswordForm
          onSuccess={handleSuccess}
          onCancel={() => setIsOpen(false)}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Current password (display-only placeholder) */}
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              Contraseña actual{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </span>
            <div className="relative">
              <FieldControl
                type="password"
                defaultValue="placeholder"
                readOnly
                className="pr-10"
                aria-label="Contraseña actual (oculta)"
              />
              <Lock
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          </label>

          {/* New password placeholder */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              Nueva contraseña
            </span>
            <FieldControl
              type="password"
              placeholder="Nueva contraseña"
              readOnly
              aria-label="Nueva contraseña (haz clic en Cambiar)"
            />
          </label>

          {/* CTA */}
          <div className="sm:col-span-2">
            <Button
              variant="primary"
              onClick={() => {
                setSavedOnce(false);
                setIsOpen(true);
              }}
            >
              {savedOnce ? "Cambiar de nuevo" : "Cambiar contraseña"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
