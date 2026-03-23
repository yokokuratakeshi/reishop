import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";

/**
 * セッションクッキーを作成・削除する API
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    // セッションクッキーの有効期限（5日間）
    const expiresIn = 60 * 60 * 24 * 5 * 1000;

    // セッションクッキーの作成
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const response = NextResponse.json({ status: "success" });

    // クッキーの設定
    response.cookies.set("session", sessionCookie, {
      maxAge: expiresIn / 1000,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      sameSite: "lax",
    });

    return response;
  } catch (error) {
    console.error("Session cookie creation error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ status: "success" });
  
  response.cookies.set("session", "", {
    maxAge: 0,
    path: "/",
  });

  return response;
}
