export async function GET() {
  const isConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  return Response.json({
    configured: isConfigured,
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
  });
}
