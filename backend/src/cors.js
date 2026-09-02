export function isAllowedOrigin(origin, allowedOrigins) {
  return !origin || allowedOrigins.includes(origin);
}

export function corsMiddleware(allowedOrigins) {
  return (request, response, next) => {
    const origin = request.get("origin");
    if (!isAllowedOrigin(origin, allowedOrigins)) {
      response.status(403).json({ error: "Browser origin is not authorized for this API." });
      return;
    }

    if (origin) {
      response.setHeader("Access-Control-Allow-Origin", origin);
      response.setHeader("Access-Control-Allow-Credentials", "true");
      response.setHeader("Vary", "Origin");
    }
    response.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Worker-Secret");

    if (request.method === "OPTIONS") {
      response.status(204).end();
      return;
    }
    next();
  };
}
