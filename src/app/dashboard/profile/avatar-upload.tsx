"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type DragEvent,
  type ChangeEvent,
} from "react";
import {
  Camera,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Avatar } from "@/presentation/components/primitives";

// ── Types ────────────────────────────────────────────────────────────────────

type UploadState =
  | { status: "idle" }
  | { status: "dragging" }
  | { status: "previewing"; objectUrl: string; file: File }
  | { status: "uploading"; objectUrl: string }
  | { status: "success"; objectUrl: string }
  | { status: "error"; message: string; objectUrl?: string };

const MAX_SIZE_MB = 5;
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type))
    return "Solo se aceptan imágenes JPG, PNG, WebP o GIF.";
  if (file.size > MAX_SIZE_BYTES)
    return `El archivo supera el límite de ${MAX_SIZE_MB} MB.`;
  return null;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function UploadRing({
  children,
  isDragging,
  hasPreview,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  children: React.ReactNode;
  isDragging: boolean;
  hasPreview: boolean;
  onClick: () => void;
  onDragOver: (e: DragEvent<HTMLButtonElement>) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      aria-label="Subir imagen de avatar"
      className={[
        "group relative h-24 w-24 shrink-0 overflow-hidden rounded-full outline-none",
        "transition-all duration-200",
        "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card",
        isDragging
          ? "scale-105 ring-2 ring-primary ring-offset-2 ring-offset-card"
          : "ring-1 ring-white/10 hover:ring-primary/50",
      ].join(" ")}
    >
      {children}

      {/* Hover/drag overlay — only when there's a preview */}
      {hasPreview && (
        <span
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full bg-black/55 opacity-0 backdrop-blur-[1px] transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100"
        >
          <Camera className="h-5 w-5 text-white" />
          <span className="text-[10px] font-semibold text-white">Cambiar</span>
        </span>
      )}

      {/* Empty state — always visible when no preview */}
      {!hasPreview && (
        <span
          aria-hidden="true"
          className={[
            "absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full transition-colors duration-200",
            isDragging
              ? "bg-primary/20"
              : "bg-muted/60 group-hover:bg-primary/10",
          ].join(" ")}
        >
          <Upload
            className={[
              "h-5 w-5 transition-colors",
              isDragging
                ? "text-primary"
                : "text-muted-foreground group-hover:text-primary",
            ].join(" ")}
          />
          <span
            className={[
              "text-[10px] font-semibold transition-colors",
              isDragging
                ? "text-primary"
                : "text-muted-foreground group-hover:text-primary",
            ].join(" ")}
          >
            {isDragging ? "Soltar" : "Subir"}
          </span>
        </span>
      )}
    </button>
  );
}

function StatusBanner({
  state,
  onDismissError,
}: {
  state: UploadState;
  onDismissError: () => void;
}) {
  if (state.status === "uploading") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-info/25 bg-info/10 px-3 py-2">
        <Loader2
          className="h-4 w-4 shrink-0 animate-spin text-info"
          aria-hidden="true"
        />
        <p className="text-xs text-info">Subiendo imagen…</p>
      </div>
    );
  }
  if (state.status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-success/25 bg-success/10 px-3 py-2">
        <CheckCircle2
          className="h-4 w-4 shrink-0 text-success"
          aria-hidden="true"
        />
        <p className="text-xs text-success">
          Avatar actualizado correctamente.
        </p>
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div className="flex items-start justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2">
        <div className="flex items-start gap-2">
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
            aria-hidden="true"
          />
          <p className="text-xs text-destructive">{state.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismissError}
          aria-label="Cerrar error"
          className="shrink-0 text-destructive/60 hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    );
  }
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────

export interface AvatarUploadProps {
  name: string;
  currentUrl: string | null;
  /** Called with the selected File so the parent can upload it. */
  onFileSelected: (file: File) => Promise<void>;
  /** Called when the user cancels a pending preview. */
  onCancel?: () => void;
  /** External upload state for controlled feedback. */
  externalState?: "idle" | "uploading" | "success" | "error";
  externalError?: string;
}

export function AvatarUpload({
  name,
  currentUrl,
  onFileSelected,
  onCancel,
  externalState,
  externalError,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ status: "idle" });

  // Derive the effective display state by overlaying externalState on top of
  // the local state machine. This avoids calling setState inside an effect.
  const effectiveState: UploadState = (() => {
    if (externalState === "uploading" && state.status === "previewing") {
      return { status: "uploading", objectUrl: state.objectUrl };
    }
    if (externalState === "success" && state.status === "uploading") {
      return { status: "success", objectUrl: state.objectUrl };
    }
    if (externalState === "error" && externalError) {
      return {
        status: "error",
        message: externalError,
        objectUrl:
          state.status === "uploading" || state.status === "previewing"
            ? state.objectUrl
            : undefined,
      };
    }
    return state;
  })();

  // Cleanup object URLs on unmount or state change
  useEffect(() => {
    return () => {
      if (
        state.status === "previewing" ||
        state.status === "uploading" ||
        state.status === "success" ||
        (state.status === "error" && state.objectUrl)
      ) {
        const url =
          state.status === "error" ? state.objectUrl : state.objectUrl;
        if (url) URL.revokeObjectURL(url);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const processFile = useCallback((file: File) => {
    const error = validateFile(file);
    if (error) {
      setState({ status: "error", message: error });
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setState({ status: "previewing", objectUrl, file });
  }, []);

  function handleInputChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so selecting the same file again fires onChange
    e.target.value = "";
  }

  function handleDragOver(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setState((prev) =>
      prev.status === "idle" || prev.status === "dragging"
        ? { status: "dragging" }
        : prev,
    );
  }

  function handleDragLeave() {
    setState((prev) =>
      prev.status === "dragging" ? { status: "idle" } : prev,
    );
  }

  function handleDrop(e: DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
    else setState({ status: "idle" });
  }

  async function handleConfirmUpload() {
    if (state.status !== "previewing") return;
    const { file, objectUrl } = state;
    setState({ status: "uploading", objectUrl });
    try {
      await onFileSelected(file);
      // externalState will drive the final success/error transition
    } catch {
      setState({
        status: "error",
        message: "No se pudo subir la imagen. Intenta de nuevo.",
        objectUrl,
      });
    }
  }

  function handleCancel() {
    if (state.status === "previewing" || state.status === "error") {
      const url =
        state.status === "previewing"
          ? state.objectUrl
          : state.status === "error"
            ? state.objectUrl
            : undefined;
      if (url) URL.revokeObjectURL(url);
    }
    setState({ status: "idle" });
    onCancel?.();
  }

  // Derive display URL: local preview > current saved URL
  const displayUrl =
    effectiveState.status === "previewing" ||
    effectiveState.status === "uploading" ||
    effectiveState.status === "success" ||
    (effectiveState.status === "error" && effectiveState.objectUrl)
      ? effectiveState.status === "error"
        ? (effectiveState.objectUrl ?? currentUrl)
        : effectiveState.objectUrl
      : currentUrl;

  const isDragging = effectiveState.status === "dragging";
  const isPreviewing = effectiveState.status === "previewing";
  const isUploading = effectiveState.status === "uploading";
  const isSuccess = effectiveState.status === "success";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
      {/* ── Avatar ring (click or drag) ── */}
      <div className="flex shrink-0 flex-col items-center gap-2">
        <UploadRing
          isDragging={isDragging}
          hasPreview={!!displayUrl}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {displayUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <Avatar name={name} src={null} size="lg" />
          )}

          {/* Uploading spinner overlay */}
          {isUploading && (
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50"
            >
              <Loader2 className="h-6 w-6 animate-spin text-white" />
            </span>
          )}

          {/* Success checkmark overlay */}
          {isSuccess && (
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center rounded-full bg-success/30"
            >
              <CheckCircle2 className="h-7 w-7 text-white drop-shadow" />
            </span>
          )}
        </UploadRing>

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="sr-only"
          aria-label="Seleccionar imagen de avatar"
          onChange={handleInputChange}
          tabIndex={-1}
        />
      </div>

      {/* ── Info + actions ── */}
      <div className="min-w-0 flex-1 space-y-3">
        {/* Identity */}
        <div>
          <p className="text-sm font-semibold text-foreground">
            {name || "Tu cuenta"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            JPG, PNG, WebP o GIF · máx. {MAX_SIZE_MB} MB
          </p>
        </div>

        {/* Drag & drop hint — idle only */}
        {(effectiveState.status === "idle" ||
          effectiveState.status === "dragging") && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className={[
              "flex w-full items-center gap-3 rounded-xl border border-dashed px-3 py-2.5",
              "text-left text-xs transition-colors",
              isDragging
                ? "border-primary bg-primary/10 text-primary"
                : "border-border/60 text-muted-foreground hover:border-primary/50 hover:bg-primary/5 hover:text-primary",
            ].join(" ")}
          >
            <Upload className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              {isDragging
                ? "Suelta la imagen aquí…"
                : "Haz clic o arrastra una imagen aquí"}
            </span>
          </button>
        )}

        {/* Preview confirm/cancel */}
        {isPreviewing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleConfirmUpload}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-transparent bg-primary px-3 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Upload className="h-3.5 w-3.5" aria-hidden="true" />
              Usar esta imagen
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-transparent px-3 text-xs font-semibold text-foreground transition-colors hover:bg-surface-raised focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Cancelar
            </button>
          </div>
        )}

        {/* Status banners */}
        <StatusBanner
          state={effectiveState}
          onDismissError={() => setState({ status: "idle" })}
        />
      </div>
    </div>
  );
}
