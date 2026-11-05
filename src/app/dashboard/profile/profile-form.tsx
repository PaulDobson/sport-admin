"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { CheckCircle2, AlertCircle, Mail, Phone, Lock } from "lucide-react";
import { Button, FieldControl } from "@/presentation/components/primitives";
import {
  updateProfileAction,
  uploadAvatarAction,
  type ProfileFormState,
  type AvatarUploadState,
} from "./actions";
import { AvatarUpload } from "./avatar-upload";

const profileInitialState: ProfileFormState = { error: null, saved: false };

function splitFullName(fullName: string): { first: string; last: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) return { first: fullName, last: "" };
  const last = parts.pop()!;
  return { first: parts.join(" "), last };
}

export function ProfileForm({
  fullName,
  avatarUrl,
  email,
  phone,
}: {
  fullName: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
}) {
  // ── Profile text fields ──
  const [profileState, profileFormAction, profilePending] = useActionState(
    updateProfileAction,
    profileInitialState,
  );

  // ── Avatar upload — called directly, NOT via useActionState ──
  // useActionState serialises FormData as JSON, which drops File objects.
  // Calling the server action as a plain async function preserves the binary.
  const [avatarUploadState, setAvatarUploadState] = useState<AvatarUploadState>(
    {
      status: "idle",
      publicUrl: null,
      error: null,
    },
  );
  const [avatarPending, startAvatarTransition] = useTransition();
  const [liveAvatarUrl, setLiveAvatarUrl] = useState(avatarUrl);

  const hiddenFullNameRef = useRef<HTMLInputElement>(null);
  const { first, last } = splitFullName(fullName);

  function syncFullName(formEl: HTMLFormElement) {
    const firstVal =
      (formEl.elements.namedItem("firstName") as HTMLInputElement)?.value ?? "";
    const lastVal =
      (formEl.elements.namedItem("lastName") as HTMLInputElement)?.value ?? "";
    if (hiddenFullNameRef.current) {
      hiddenFullNameRef.current.value = `${firstVal} ${lastVal}`.trim();
    }
  }

  async function handleAvatarFileSelected(file: File): Promise<void> {
    const fd = new FormData();
    fd.append("avatar", file);
    fd.append("currentFullName", hiddenFullNameRef.current?.value ?? fullName);
    fd.append("currentPhone", phone ?? "");

    startAvatarTransition(async () => {
      const result = await uploadAvatarAction(
        { status: "idle", publicUrl: null, error: null },
        fd,
      );
      setAvatarUploadState(result);
      if (result.status === "success" && result.publicUrl) {
        setLiveAvatarUrl(result.publicUrl);
      }
    });
  }

  const avatarExternalState: "idle" | "uploading" | "success" | "error" =
    avatarPending
      ? "uploading"
      : avatarUploadState.status === "success"
        ? "success"
        : avatarUploadState.status === "error"
          ? "error"
          : "idle";

  return (
    <div className="rounded-2xl border border-white/6 bg-card p-5 sm:p-6">
      <form
        action={profileFormAction}
        className="space-y-6"
        noValidate
        onInput={(e) => syncFullName(e.currentTarget)}
      >
        {/* Hidden fields consumed by the server action */}
        <input type="hidden" name="avatarUrl" value={liveAvatarUrl ?? ""} />
        <input
          ref={hiddenFullNameRef}
          type="hidden"
          name="fullName"
          defaultValue={fullName}
        />

        {/* ── Avatar upload ── */}
        <div className="border-b border-border/50 pb-6">
          <AvatarUpload
            name={fullName || "Tu cuenta"}
            currentUrl={liveAvatarUrl}
            onFileSelected={handleAvatarFileSelected}
            externalState={avatarExternalState}
            externalError={avatarUploadState.error ?? undefined}
          />
        </div>

        {/* ── Fields grid ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              Nombre{" "}
              <span className="text-destructive" aria-hidden="true">
                *
              </span>
            </span>
            <FieldControl
              name="firstName"
              required
              minLength={1}
              maxLength={60}
              defaultValue={first}
              placeholder="Ej. María"
              autoComplete="given-name"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-foreground">
              Apellido
            </span>
            <FieldControl
              name="lastName"
              maxLength={60}
              defaultValue={last}
              placeholder="Ej. González"
              autoComplete="family-name"
            />
          </label>

          {/* Email — readonly */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Mail
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              Correo electrónico
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                Solo lectura
              </span>
            </span>
            <FieldControl
              type="email"
              value={email ?? ""}
              readOnly
              disabled
              aria-readonly="true"
              aria-label="Correo electrónico — no editable"
              className="cursor-not-allowed opacity-60"
            />
            <p className="text-[11px] text-muted-foreground">
              El correo está vinculado a tu cuenta de acceso y no puede
              modificarse aquí.
            </p>
          </div>

          {/* Phone */}
          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              <Phone
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              Teléfono de contacto
            </span>
            <FieldControl
              name="phone"
              type="tel"
              defaultValue={phone ?? ""}
              placeholder="+56 9 1234 5678"
              autoComplete="tel"
              minLength={7}
              maxLength={30}
            />
            <p className="text-[11px] text-muted-foreground">
              Número local o internacional. Ej: +56 9 7463 3341
            </p>
          </label>
        </div>

        {/* ── Feedback ── */}
        {profileState.error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5"
          >
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
              aria-hidden="true"
            />
            <p className="text-sm text-destructive">{profileState.error}</p>
          </div>
        )}
        {profileState.saved && (
          <div
            role="status"
            className="flex items-start gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2.5"
          >
            <CheckCircle2
              className="mt-0.5 h-4 w-4 shrink-0 text-success"
              aria-hidden="true"
            />
            <p className="text-sm text-success">
              Perfil actualizado correctamente.
            </p>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            variant="primary"
            isLoading={profilePending}
            disabled={avatarPending}
          >
            {profilePending ? "Guardando…" : "Guardar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
