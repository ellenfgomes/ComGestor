import { mutation, query } from "./_generated/server";
import { requireCurrentUser } from "./access";

export const getMyAccessProfile = query({
  args: {},
  handler: async (ctx) => {
    const { user, organization } = await requireCurrentUser(ctx);
    const primaryArea = user.areaId ? await ctx.db.get(user.areaId) : null;

    if (user.role === "admin") {
      const areas = await ctx.db
        .query("areas")
        .withIndex("by_organization_active", (q) =>
          q.eq("organizationId", organization._id).eq("isActive", true),
        )
        .collect();

      return {
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        primaryArea: primaryArea?.name ?? null,
        accessibleAreas: areas.map((area) => ({ id: area._id, name: area.name })),
      };
    }

    const accessibleArea =
      primaryArea?.organizationId === organization._id && primaryArea.isActive
        ? [{ id: primaryArea._id, name: primaryArea.name }]
        : [];

    return {
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      primaryArea: accessibleArea[0]?.name ?? null,
      accessibleAreas: accessibleArea,
    };
  },
});

export const linkAuthenticatedIdentity = mutation({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireCurrentUser(ctx);
    const now = Date.now();

    if (user.authSubject !== identity.subject) {
      await ctx.db.patch(user._id, {
        authSubject: identity.subject,
        lastLoginAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(user._id, { lastLoginAt: now, updatedAt: now });
    }

    return { linked: true, role: user.role };
  },
});
