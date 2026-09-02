export function json(response, status = 200) {
  return Response.json(response, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
