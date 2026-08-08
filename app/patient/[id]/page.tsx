import { redirect } from "next/navigation";

export default async function LegacyPatientRoute({ params }: { params: Promise<{ id?: string }> }) {
  const { id } = await params;

  if (!id) {
    redirect("/patients");
  }

  redirect(`/patients/${id}`);
}
