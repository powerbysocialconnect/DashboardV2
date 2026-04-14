/**
 * Utilities for interacting with the Vercel Domains API 
 * to automate subdomain allotment for merchants.
 */

const VERCEL_AUTH_TOKEN = process.env.VERCEL_AUTH_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID;
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID; // Optional

export async function addDomainToVercel(domain: string) {
  if (!VERCEL_AUTH_TOKEN || !VERCEL_PROJECT_ID) {
    console.error("Missing Vercel credentials in environment variables.");
    return { error: "Automation credentials not configured." };
  }

  const teamQuery = VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : "";
  const url = `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains${teamQuery}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${VERCEL_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: domain }),
    });

    const data = await response.json();

    if (!response.ok) {
      // If domain already exists, that's fine
      if (data.error?.code === "domain_already_in_use") {
        return { success: true, message: "Domain already registered." };
      }
      throw new Error(data.error?.message || "Failed to add domain to Vercel");
    }

    return { success: true, data };
  } catch (error: any) {
    console.error("Vercel Domain API Error:", error.message);
    return { error: error.message };
  }
}
