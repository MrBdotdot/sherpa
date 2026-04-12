import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { gameId } = await params;

  // Verify ownership
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id, title")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  let body: { newOwnerEmail?: unknown; previousOwnerStaysAsEditor?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { newOwnerEmail, previousOwnerStaysAsEditor } = body;
  if (typeof newOwnerEmail !== "string" || !newOwnerEmail.includes("@")) {
    return Response.json({ error: "Invalid newOwnerEmail" }, { status: 400 });
  }
  if (newOwnerEmail.toLowerCase() === (user.email ?? "").toLowerCase()) {
    return Response.json({ error: "Cannot transfer to yourself" }, { status: 400 });
  }

  // Look up new owner in auth.users
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const newOwner = users?.users?.find(
    (u) => u.email?.toLowerCase() === newOwnerEmail.toLowerCase()
  );
  if (!newOwner) {
    return Response.json({ error: "user_not_found" }, { status: 404 });
  }

  // If previous owner stays as editor, insert them into game_members
  if (previousOwnerStaysAsEditor === true) {
    const displayName =
      typeof user.user_metadata?.first_name === "string"
        ? user.user_metadata.first_name
        : null;
    await supabaseAdmin.from("game_members").upsert(
      {
        game_id: gameId,
        user_id: user.id,
        role: "editor",
        email: user.email ?? "",
        display_name: displayName,
      },
      { onConflict: "game_id,user_id" }
    );
  }

  // Remove new owner from game_members if they were already a member
  await supabaseAdmin
    .from("game_members")
    .delete()
    .eq("game_id", gameId)
    .eq("user_id", newOwner.id);

  // Transfer ownership
  const { error } = await supabaseAdmin
    .from("games")
    .update({ user_id: newOwner.id })
    .eq("id", gameId);

  if (error) return Response.json({ error: "Transfer failed" }, { status: 500 });

  return Response.json({ ok: true });
}
