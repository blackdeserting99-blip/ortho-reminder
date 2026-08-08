import ResetPasswordForm from "./ResetPasswordForm";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ResetPasswordPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialToken = typeof resolvedSearchParams.token === "string" ? resolvedSearchParams.token : "";

  return <ResetPasswordForm initialToken={initialToken} />;
}