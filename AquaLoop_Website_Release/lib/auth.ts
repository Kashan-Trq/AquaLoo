import { getSupabaseAdmin } from "./supabase-admin";

export async function requireUser(request: Request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return { user: null, error: "Missing access token" };
  }

  const token = auth.slice(7);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { user: null, error: "Invalid or expired access token" };
  }

  return { user: data.user, error: null };
}
