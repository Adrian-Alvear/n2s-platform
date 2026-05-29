import { getSupabase } from "@/lib/supabase";

export async function GET(request: Request) {
  const jwt = request.headers.get("cf-access-jwt-assertion");

  if (!jwt) {
    // Local dev — assume admin
    return Response.json({ email: "adrianalvear09@gmail.com", name: "Adrian", role: "admin" });
  }

  try {
    const payload = JSON.parse(atob(jwt.split(".")[1]));
    const email: string = payload.email;

    const { data } = await getSupabase()
      .from("platform_users")
      .select("email, name, role")
      .eq("email", email)
      .single();

    if (!data) {
      return Response.json({ email, name: email.split("@")[0], role: "viewer" });
    }

    return Response.json({ email: data.email, name: data.name, role: data.role });
  } catch {
    return Response.json({ email: null, name: "Guest", role: "viewer" });
  }
}
