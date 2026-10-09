// Clerk como provedor de login. CLERK_JWT_ISSUER_DOMAIN = "Frontend API URL" do Clerk
// (ex.: https://nome-aleatorio.clerk.accounts.dev). Definir com: npx convex env set CLERK_JWT_ISSUER_DOMAIN <url>
export default {
  providers: [{ domain: process.env.CLERK_JWT_ISSUER_DOMAIN, applicationID: "convex" }],
};
