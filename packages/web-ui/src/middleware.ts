import { NextResponse, type NextRequest } from "next/server";
import {
  applyOccupancyPageCorsHeaders,
  occupancyPagePreflightResponse,
} from "./server/agent-play/occupancy-page-cors";

export const middleware = (request: NextRequest): Response => {
  const origin = request.headers.get("origin");
  if (request.method === "OPTIONS") {
    return occupancyPagePreflightResponse(origin);
  }
  const response = NextResponse.next();
  applyOccupancyPageCorsHeaders({
    headers: response.headers,
    originHeader: origin,
  });
  return response;
};

export const config = {
  matcher: [
    "/api/agent-play/session/:path*",
    "/api/agent-play/session",
    "/api/agent-play/sdk/:path*",
    "/api/agent-play/bootstrap",
    "/api/agent-play/events",
    "/api/agent-play/snapshot",
    "/api/agent-play/nodes/:path*",
    "/api/nodes/validate",
  ],
};
