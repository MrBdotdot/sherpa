import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

async function verifyOwnership(memberId: string, userId: string): Promise<boolean> {
  const { data: member } = await supabaseAdmin
    .from("game_members")
    .select("game_id")
    .eq("id", memberId)
    .single();
  if (!member) return false;

  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", member.game_id)
    .eq("user_id", userId)
    .single();
  return !!game;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  if (!(await verifyOwnership(memberId, user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { role } = body;
  if (role !== "editor" && role !== "viewer") {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from("game_members")
    .update({ role })
    .eq("id", memberId);

  if (error) return Response.json({ error: "Failed to update role" }, { status: 500 });
  return Response.json({ ok: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { memberId } = await params;
  if (!(await verifyOwnership(memberId, user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("game_members")
    .delete()
    .eq("id", memberId);

  if (error) return Response.json({ error: "Failed to remove member" }, { status: 500 });
  return Response.json({ ok: true });
}
