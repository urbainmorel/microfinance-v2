import { NextResponse, type NextRequest } from "next/server";

import { resolvePostAuthPath } from "@/lib/auth-flow";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const code = request.nextUrl.searchParams.get("code");
  const destination = new URL("/auth/login?reason=verification", request.url);
  if (!code) return NextResponse.redirect(destination);

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(destination);

  return NextResponse.redirect(new URL(await resolvePostAuthPath(supabase), request.url));
}
