"use client";

import { useActionState } from "react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/presentation/components/primitives";
import {
  redeemPortalInvitationAction,
  switchAccountForPortalInviteAction,
} from "../actions";

const initialState = { error: null, success: false };

export function RedeemInvitationForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(
    redeemPortalInvitationAction,
    initialState,
  );

  return (
    <div className="grid gap-2">
      <form action={formAction} className="grid gap-4">
        <input type="hidden" name="token" value={token} />
        {state.error ? (
          <p role="alert" className="flex gap-2 text-sm text-destructive">
            <AlertCircle aria-hidden="true" className="h-4 w-4 shrink-0" />
            {state.error}
          </p>
        ) : null}
        <Button
          type="submit"
          variant="primary"
          isLoading={pending}
          className="min-h-12 w-full"
        >
          {pending ? "Vinculando ficha…" : "Aceptar invitación"}
          {!pending ? (
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          ) : null}
        </Button>
      </form>
      <form action={switchAccountForPortalInviteAction}>
        <input type="hidden" name="token" value={token} />
        <button
          type="submit"
          className="min-h-10 w-full text-sm font-semibold text-muted-foreground underline underline-offset-4"
        >
          Cambiar de cuenta
        </button>
      </form>
    </div>
  );
}
