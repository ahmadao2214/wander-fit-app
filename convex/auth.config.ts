// Clerk issuer, e.g. https://<instance>.clerk.accounts.dev. Set CLERK_JWT_ISSUER_DOMAIN
// on the Convex dashboard; see https://docs.convex.dev/auth/clerk#configuring-dev-and-prod-instances
const clerkIssuer = process.env.CLERK_JWT_ISSUER_DOMAIN;

// The MCP endpoint's own address, e.g. https://<deployment>.convex.site/mcp. When set,
// Convex also accepts Clerk OAuth access tokens whose audience is that address, so a
// chat connector (Claude, ChatGPT) runs as the athlete who signed in. Unset: app sign-in only.
const mcpResource = process.env.MCP_RESOURCE_URL;

export default {
  providers: [
    {
      // The app's own sign-in: Clerk session tokens from the "convex" JWT template.
      domain: clerkIssuer,
      applicationID: "convex",
    },
    ...(mcpResource && clerkIssuer
      ? [
          {
            type: "customJwt" as const,
            issuer: clerkIssuer,
            jwks: `${clerkIssuer.replace(/\/$/, "")}/.well-known/jwks.json`,
            algorithm: "RS256" as const,
            applicationID: mcpResource,
          },
        ]
      : []),
  ],
};
