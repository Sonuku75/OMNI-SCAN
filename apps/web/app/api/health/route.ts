import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    app: "@omniscan/web",
    version: "1.0.0-m0",
    timestamp: new Date().toISOString(),
  });
}
