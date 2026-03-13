export function getBackendBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!url) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not defined");
  }

  return url.replace(/\/+$/, "");
}
