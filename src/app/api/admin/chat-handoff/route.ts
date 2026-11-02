import { NextRequest, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-auth";
import { muteConversation, resolveHandoff } from "@/lib/chat-stats";

// 後台切換「這個對話誰在回」。
//
// 沒有另外做 CSRF token：avalo_admin 這個 cookie 是 sameSite:strict，
// 從別的站送過來的表單根本不會帶上它，所以到不了 isAdmin 這一關。
// 後台其他的狀態變更路由（終止扣款、標記已處理）也是同一個前提。
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const form = await req.formData();
  const id = Number(form.get("id"));
  const action = String(form.get("action") ?? "");

  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.redirect(`${site}/admin/chat`, 303);
  }

  if (action === "resolve") {
    await resolveHandoff(id);
  } else if (action === "mute") {
    await muteConversation(id);
  } else {
    return NextResponse.redirect(`${site}/admin/chat`, 303);
  }

  return NextResponse.redirect(`${site}/admin/chat/${id}`, 303);
}
