import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/lib/auth";
import {
  getMetaEmbeddedSignupStateCookieName,
  verifyMetaEmbeddedSignupState,
} from "@/app/lib/meta-embedded-signup";
import CallbackCompletion from "./CallbackCompletion";

type CallbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export default async function MetaEmbeddedSignupCallbackPage({ searchParams }: CallbackPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const params = await searchParams;
  const code = firstValue(params.code).trim();
  const state = firstValue(params.state).trim();
  const error = firstValue(params.error).trim();
  const businessAccountId = firstValue(params.waba_id || params.business_account_id).trim();
  const phoneNumberId = firstValue(params.phone_number_id || params.whatsapp_phone_number_id).trim();
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(getMetaEmbeddedSignupStateCookieName())?.value;

  if (!code || error || !(await verifyMetaEmbeddedSignupState(expectedState, user.id)) || state !== expectedState) {
    redirect("/settings/whatsapp?meta=callback-error");
  }

  return <CallbackCompletion code={code} businessAccountId={businessAccountId} phoneNumberId={phoneNumberId} />;
}