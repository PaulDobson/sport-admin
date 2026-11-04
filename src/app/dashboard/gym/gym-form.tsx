"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import {
  Building2,
  MapPin,
  Phone,
  Save,
  Mail,
  User,
  AlertCircle,
  CheckCircle2,
  Info,
  ImageIcon,
} from "lucide-react";
import type { TenantDetails } from "@/domain/tenants/tenant-details";
import type { TenantDetailsInput } from "@/application/tenants/manage-tenant-details";
import {
  Button,
  FieldControl,
  Surface,
} from "@/presentation/components/primitives";
import {
  updateGymAction,
  uploadGymLogoAction,
  type GymFormState,
  type GymLogoUploadState,
} from "./actions";
import { AvatarUpload } from "@/app/dashboard/profile/avatar-upload";

// ── Helpers ───────────────────────────────────────────────────────────────────

const initialState: GymFormState = { error: null, saved: false };
const logoInitialState: GymLogoUploadState = {
  status: "idle",
  publicUrl: null,
  error: null,
};

const toFields = (details: TenantDetails): TenantDetailsInput => ({
  name: details.name,
  address: details.address ?? "",
  contactName: details.contactName ?? "",
  contactEmail: details.contactEmail ?? "",
  phone: details.phone ?? "",
  city: details.city ?? "",
  region: details.region ?? "",
});

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({
  icon,
  title,
  badge,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 pb-4">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20"
      >
        {icon}
      </span>
      <span className="text-sm font-semibold">{title}</span>
      {badge}
    </div>
  );
}

function Field({
  id,
  label,
  icon,
  error,
  required,
  children,
}: {
  id: string;
  label: string;
  icon?: React.ReactNode;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-sm font-medium"
      >
        {icon ? (
          <span aria-hidden="true" className="text-muted-foreground">
            {icon}
          </span>
        ) : null}
        {label}
        {required ? <span className="text-primary">*</span> : null}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          className="flex items-start gap-1.5 text-xs text-destructive"
        >
          <AlertCircle
            aria-hidden="true"
            className="mt-0.5 h-3.5 w-3.5 shrink-0"
          />
          {error}
        </p>
      ) : null}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GymForm({ details }: { details: TenantDetails }) {
  // Stable action reference — inline async in useActionState recreates on
  // every render in React 19 and can keep `pending` stuck at true.
  const [state, action, pending] = useActionState(
    updateGymAction,
    initialState,
  );

  // Derive the committed baseline from the latest server response, falling
  // back to the prop. No effect needed — values are computed during render.
  const committedDetails = state.details ?? details;
  // When the server returns new details, reset local edits to the fresh
  // baseline. We compare by reference so this only triggers on a new save.
  const [values, setValues] = useState(() => toFields(committedDetails));
  const [prevCommitted, setPrevCommitted] = useState(committedDetails);
  if (committedDetails !== prevCommitted) {
    setPrevCommitted(committedDetails);
    setValues(toFields(committedDetails));
  }

  // ── Logo upload — called directly, NOT via useActionState ──
  // useActionState serialises FormData as JSON, which drops File objects.
  const [logoUploadState, setLogoUploadState] =
    useState<GymLogoUploadState>(logoInitialState);
  const [logoPending, startLogoTransition] = useTransition();
  const [liveLogo, setLiveLogo] = useState(details.logoUrl);

  async function handleLogoFileSelected(file: File): Promise<void> {
    const fd = new FormData();
    fd.append("logo", file);
    fd.append("tenantId", details.tenantId);

    startLogoTransition(async () => {
      const result = await uploadGymLogoAction(
        { status: "idle", publicUrl: null, error: null },
        fd,
      );
      setLogoUploadState(result);
      if (result.status === "success" && result.publicUrl) {
        setLiveLogo(result.publicUrl);
      }
    });
  }

  const logoExternalState: "idle" | "uploading" | "success" | "error" =
    logoPending
      ? "uploading"
      : logoUploadState.status === "success"
        ? "success"
        : logoUploadState.status === "error"
          ? "error"
          : "idle";

  // ── Text-field form state ──
  const baseline = toFields(state.details ?? details);
  const dirty = Object.keys(baseline).some(
    (k) =>
      values[k as keyof TenantDetailsInput] !==
      baseline[k as keyof TenantDetailsInput],
  );
  const form = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!dirty && !pending) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty, pending]);

  useEffect(() => {
    if (state.error)
      form.current
        ?.querySelector<HTMLElement>('[aria-invalid="true"], [role="alert"]')
        ?.focus();
  }, [state]);

  const renderInput = (
    name: keyof TenantDetailsInput,
    options: {
      type?: "email" | "tel";
      autoComplete?: string;
      placeholder?: string;
      maxLength: number;
    },
  ) => (
    <FieldControl
      id={`gym-${name}`}
      name={name}
      value={values[name]}
      onChange={(e) =>
        setValues((prev) => ({ ...prev, [name]: e.target.value }))
      }
      type={options.type ?? "text"}
      autoComplete={options.autoComplete}
      placeholder={options.placeholder}
      maxLength={options.maxLength}
      required={name === "name"}
      aria-invalid={Boolean(state.fieldErrors?.[name])}
      aria-describedby={
        state.fieldErrors?.[name] ? `gym-${name}-error` : undefined
      }
      className="text-base focus:outline-none focus:ring-2 focus:ring-primary/30 aria-invalid:border-destructive sm:text-sm"
    />
  );

  return (
    <form
      ref={form}
      action={action}
      aria-label="Datos del gimnasio"
      aria-busy={pending}
      className="space-y-4"
    >
      <input type="hidden" name="tenantId" value={details.tenantId} />

      {/* ── SECCIÓN 0 — Logo del gimnasio ─────────────────────────────────── */}
      <fieldset disabled={logoPending} className="min-w-0">
        <Surface className="rounded-xl p-4 sm:p-5">
          <SectionHeading
            icon={<ImageIcon className="h-4 w-4" />}
            title="Logo del gimnasio"
          />
          <AvatarUpload
            name={details.name}
            currentUrl={liveLogo}
            onFileSelected={handleLogoFileSelected}
            externalState={logoExternalState}
            externalError={logoUploadState.error ?? undefined}
          />
        </Surface>
      </fieldset>

      {/* ── SECCIÓN 1 — Identidad ─────────────────────────────────────────── */}
      <fieldset disabled={pending} className="min-w-0">
        <Surface className="rounded-xl p-4 sm:p-5">
          <SectionHeading
            icon={<Building2 className="h-4 w-4" />}
            title="Identidad"
            badge={
              <span className="ml-auto rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Requerido
              </span>
            }
          />
          <Field
            id="gym-name"
            label="Nombre del gimnasio"
            icon={<Building2 className="h-3.5 w-3.5" />}
            error={state.fieldErrors?.name}
            required
          >
            {renderInput("name", {
              maxLength: 160,
              autoComplete: "organization",
              placeholder: "Ej. Academia Deportiva Central",
            })}
          </Field>
        </Surface>
      </fieldset>

      {/* ── SECCIÓN 2 — Ubicación ─────────────────────────────────────────── */}
      <fieldset disabled={pending} className="min-w-0">
        <Surface className="rounded-xl p-4 sm:p-5">
          <SectionHeading
            icon={<MapPin className="h-4 w-4" />}
            title="Ubicación"
          />
          <div className="space-y-4">
            <Field
              id="gym-address"
              label="Dirección"
              icon={<MapPin className="h-3.5 w-3.5" />}
              error={state.fieldErrors?.address}
            >
              {renderInput("address", {
                maxLength: 250,
                autoComplete: "street-address",
                placeholder: "Calle, número y local",
              })}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="gym-city"
                label="Ciudad"
                error={state.fieldErrors?.city}
              >
                {renderInput("city", {
                  maxLength: 120,
                  autoComplete: "address-level2",
                  placeholder: "Santiago",
                })}
              </Field>
              <Field
                id="gym-region"
                label="Región"
                error={state.fieldErrors?.region}
              >
                {renderInput("region", {
                  maxLength: 120,
                  autoComplete: "address-level1",
                  placeholder: "Región Metropolitana",
                })}
              </Field>
            </div>
          </div>
        </Surface>
      </fieldset>

      {/* ── SECCIÓN 3 — Contacto principal ───────────────────────────────── */}
      <fieldset disabled={pending} className="min-w-0">
        <Surface className="rounded-xl p-4 sm:p-5">
          <SectionHeading
            icon={<User className="h-4 w-4" />}
            title="Contacto principal"
          />
          <div className="space-y-4">
            <Field
              id="gym-contactName"
              label="Nombre del contacto"
              icon={<User className="h-3.5 w-3.5" />}
              error={state.fieldErrors?.contactName}
            >
              {renderInput("contactName", {
                maxLength: 120,
                autoComplete: "name",
                placeholder: "Nombre y apellido",
              })}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                id="gym-contactEmail"
                label="Email del contacto"
                icon={<Mail className="h-3.5 w-3.5" />}
                error={state.fieldErrors?.contactEmail}
              >
                {renderInput("contactEmail", {
                  type: "email",
                  maxLength: 254,
                  autoComplete: "email",
                  placeholder: "contacto@academia.cl",
                })}
              </Field>
              <Field
                id="gym-phone"
                label="Teléfono"
                icon={<Phone className="h-3.5 w-3.5" />}
                error={state.fieldErrors?.phone}
              >
                {renderInput("phone", {
                  type: "tel",
                  maxLength: 30,
                  autoComplete: "tel",
                  placeholder: "+56 9 1234 5678",
                })}
              </Field>
            </div>
          </div>
        </Surface>
      </fieldset>

      {/* ── Feedback global ───────────────────────────────────────────────── */}
      <div aria-live="polite" className="space-y-3">
        {state.error ? (
          <div
            role="alert"
            tabIndex={-1}
            className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertCircle
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>{state.error}</span>
          </div>
        ) : null}
        {state.saved && !dirty ? (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm text-success"
          >
            <CheckCircle2
              aria-hidden="true"
              className="mt-0.5 h-4 w-4 shrink-0"
            />
            <span>Datos del gimnasio actualizados correctamente.</span>
          </div>
        ) : null}
      </div>

      {/* ── Footer de acciones ────────────────────────────────────────────── */}
      <div
        className={classes(
          "rounded-xl border p-4 transition-colors",
          dirty || pending
            ? "border-primary/20 bg-primary/5"
            : "border-border bg-card",
        )}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            className={classes(
              "flex items-center gap-2 text-sm",
              dirty || pending ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Info aria-hidden="true" className="h-4 w-4 shrink-0" />
            {pending
              ? "Guardando…"
              : dirty
                ? "Tienes cambios sin guardar."
                : "No hay cambios pendientes."}
          </p>
          <div className="flex gap-2 sm:shrink-0">
            <Button
              type="button"
              disabled={pending || !dirty}
              onClick={() => {
                if (window.confirm("¿Descartar los cambios sin guardar?"))
                  setValues(baseline);
              }}
              className="min-h-11 flex-1 focus-visible:outline-2 focus-visible:outline-primary sm:flex-none"
            >
              Descartar cambios
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={pending}
              disabled={!dirty || logoPending}
              className="min-h-11 flex-1 focus-visible:outline-2 focus-visible:outline-primary sm:flex-none"
            >
              {!pending ? (
                <Save className="h-4 w-4 shrink-0" aria-hidden="true" />
              ) : null}
              {pending ? "Guardando…" : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
