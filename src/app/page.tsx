import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("cris_tech_session")?.value;

  if (!token) {
    redirect("/login");
  }

  const user = await verifySessionToken(token);
  if (!user) {
    redirect("/login");
  }

  redirect("/operacao");
}
