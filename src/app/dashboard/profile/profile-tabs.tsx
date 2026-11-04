"use client";

import { useState } from "react";
import { User, Settings, CreditCard, FileText } from "lucide-react";
import type { OwnerBilling } from "@/domain/saas-administration/owner-billing";
import type { SaasCatalogPlan } from "@/domain/saas-administration/plan-catalog";
import { ProfileForm } from "./profile-form";
import { SecurityPanel } from "./security-panel";
import { SubscriptionPanel } from "./subscription-panel";
import { BillingPanel } from "./billing-panel";

// ── Tab definitions ──────────────────────────────────────────────────────────

type TabId = "profile" | "account" | "plan" | "billing";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  ownerOnly?: boolean;
}

const TABS: Tab[] = [
  {
    id: "profile",
    label: "Perfil",
    icon: <User className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: "account",
    label: "Configuración",
    icon: <Settings className="h-4 w-4" aria-hidden="true" />,
  },
  {
    id: "plan",
    label: "Plan de precio",
    icon: <CreditCard className="h-4 w-4" aria-hidden="true" />,
    ownerOnly: true,
  },
  {
    id: "billing",
    label: "Facturación",
    icon: <FileText className="h-4 w-4" aria-hidden="true" />,
    ownerOnly: true,
  },
];

// ── Props ────────────────────────────────────────────────────────────────────

export interface ProfileTabsProps {
  fullName: string;
  avatarUrl: string | null;
  email: string | null;
  phone: string | null;
  isOwner: boolean;
  billing: OwnerBilling | null;
  catalogPlans: SaasCatalogPlan[];
}

// ── Component ────────────────────────────────────────────────────────────────

export function ProfileTabs({
  fullName,
  avatarUrl,
  email,
  phone,
  isOwner,
  billing,
  catalogPlans,
}: ProfileTabsProps) {
  const visibleTabs = TABS.filter((t) => !t.ownerOnly || isOwner);
  const [activeTab, setActiveTab] = useState<TabId>(visibleTabs[0]!.id);

  return (
    <div className="mx-auto max-w-6xl pb-10">
      {/* ── Tab bar ── */}
      <div className="sticky top-0 z-10 -mx-4 mb-6 border-b border-border/60 bg-background/90 px-4 backdrop-blur-md sm:-mx-6 sm:px-6">
        <nav
          role="tablist"
          aria-label="Secciones del perfil"
          className="flex gap-0 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          {visibleTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                id={`tab-${tab.id}`}
                aria-selected={isActive}
                aria-controls={`panel-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={[
                  "relative flex shrink-0 items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-0",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                ].join(" ")}
              >
                {tab.icon}
                <span className="hidden sm:inline">{tab.label}</span>
                {/* Mobile: only label (no icon duplication) */}
                <span className="sm:hidden">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ── Tab panels ── */}

      {/* Profile Settings */}
      <div
        role="tabpanel"
        id="panel-profile"
        aria-labelledby="tab-profile"
        hidden={activeTab !== "profile"}
      >
        {activeTab === "profile" && (
          <div className="space-y-6">
            {/* Section heading */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Configuración de perfil
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gestiona y controla todos tus datos de perfil.
                </p>
              </div>
            </div>
            <ProfileForm
              fullName={fullName}
              avatarUrl={avatarUrl}
              email={email}
              phone={phone}
            />
          </div>
        )}
      </div>

      {/* Account Settings */}
      <div
        role="tabpanel"
        id="panel-account"
        aria-labelledby="tab-account"
        hidden={activeTab !== "account"}
      >
        {activeTab === "account" && (
          <div className="space-y-6">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-foreground">
                Configuración de cuenta
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Gestiona y actualiza la seguridad de tu cuenta.
              </p>
            </div>
            <SecurityPanel />
          </div>
        )}
      </div>

      {/* Pricing Plan */}
      {isOwner && (
        <div
          role="tabpanel"
          id="panel-plan"
          aria-labelledby="tab-plan"
          hidden={activeTab !== "plan"}
        >
          {activeTab === "plan" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Plan de precio
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Revisa tu suscripción activa y explora los planes disponibles.
                </p>
              </div>
              <SubscriptionPanel
                subscription={billing?.subscription ?? null}
                scheduledChange={billing?.scheduled_change ?? null}
                catalogPlans={catalogPlans.filter((p) => p.status === "active")}
              />
            </div>
          )}
        </div>
      )}

      {/* Billing & Invoices */}
      {isOwner && (
        <div
          role="tabpanel"
          id="panel-billing"
          aria-labelledby="tab-billing"
          hidden={activeTab !== "billing"}
        >
          {activeTab === "billing" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-semibold tracking-tight text-foreground">
                  Facturación e historial
                </h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gestiona tu método de pago y revisa el historial de facturas.
                </p>
              </div>
              <BillingPanel invoices={billing?.invoices ?? []} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
