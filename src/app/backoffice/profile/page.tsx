import { Surface } from "@/presentation/components/primitives";
import { BackofficeShell } from "@/presentation/components/backoffice-shell";
import { ProfileForm } from "@/app/dashboard/profile/profile-form";
import { loadBackofficeContext } from "../_lib/backoffice-context";

export default async function BackofficeProfilePage() {
  const { profile, shell } = await loadBackofficeContext();

  return (
    <BackofficeShell
      title="Perfil"
      description="Datos de tu cuenta de administración"
      current="profile"
      {...shell}
    >
      <div className="mx-auto max-w-3xl">
        <Surface className="rounded-2xl border-white/6 p-5 sm:p-6">
          <div className="mb-5 border-b border-border/70 pb-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-warning">
              Cuenta SaaS
            </p>
            <h2 className="mt-2 text-xl font-medium tracking-tight">
              Perfil del usuario
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Estos datos se usan para identificar tu cuenta dentro de Sport
              Admin.
            </p>
          </div>
          <ProfileForm
            fullName={profile?.fullName ?? ""}
            avatarUrl={profile?.avatarUrl ?? null}
          />
        </Surface>
      </div>
    </BackofficeShell>
  );
}
