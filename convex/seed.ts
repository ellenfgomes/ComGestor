import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const organizationName = "Converge";

const initialAreas = [
  { name: "Assistencial", color: "#ec4899", backgroundColor: "#fce7f3" },
  { name: "Administrativo", color: "#3b82f6", backgroundColor: "#dbeafe" },
  { name: "Diretoria", color: "#8b5cf6", backgroundColor: "#ede9fe" },
  { name: "Ocupacional", color: "#10b981", backgroundColor: "#d1fae5" },
  { name: "Qualidade", color: "#06b6d4", backgroundColor: "#cffafe" },
  { name: "Dados", color: "#6366f1", backgroundColor: "#e0e7ff" },
  { name: "Geral", color: "#64748b", backgroundColor: "#e2e8f0" },
];

export const seedInitialData = internalMutation({
  args: {
    profiles: v.array(v.object({
      email: v.string(),
      area: v.string(),
      role: v.union(v.literal("user"), v.literal("admin")),
      displayName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, { profiles }) => {
    if (profiles.length === 0 || profiles.filter((profile) => profile.role === "admin").length !== 1) {
      throw new Error("Informe os perfis privados e exatamente um administrador inicial.");
    }

    const normalizedEmails = profiles.map((profile) => profile.email.trim().toLowerCase());
    if (new Set(normalizedEmails).size !== normalizedEmails.length) {
      throw new Error("A lista de perfis contém e-mails duplicados.");
    }

    if (normalizedEmails.some((email) => !email.endsWith("@hc.fm.usp.br"))) {
      throw new Error("Todos os perfis iniciais devem usar e-mail @hc.fm.usp.br.");
    }

    const now = Date.now();
    let organization = await ctx.db
      .query("organizations")
      .withIndex("by_name", (q) => q.eq("name", organizationName))
      .first();

    if (!organization) {
      const organizationId = await ctx.db.insert("organizations", {
        name: organizationName,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
      organization = await ctx.db.get(organizationId);
    }

    if (!organization) throw new Error("Não foi possível criar a organização Converge.");

    const areaIds = new Map<string, Id<"areas">>();
    let createdAreas = 0;

    for (const [sortOrder, area] of initialAreas.entries()) {
      const existingArea = await ctx.db
        .query("areas")
        .withIndex("by_organization_name", (q) =>
          q.eq("organizationId", organization._id).eq("name", area.name),
        )
        .first();

      if (existingArea) {
        await ctx.db.patch(existingArea._id, {
          color: area.color,
          backgroundColor: area.backgroundColor,
          sortOrder,
          isActive: true,
          updatedAt: now,
        });
        areaIds.set(area.name, existingArea._id);
      } else {
        const areaId = await ctx.db.insert("areas", {
          organizationId: organization._id,
          ...area,
          sortOrder,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        areaIds.set(area.name, areaId);
        createdAreas += 1;
      }
    }

    let createdProfiles = 0;
    let updatedProfiles = 0;

    for (const profile of profiles) {
      const email = profile.email.trim().toLowerCase();
      const areaId = areaIds.get(profile.area);
      if (!areaId) throw new Error(`Área inicial não encontrada: ${profile.area}`);

      const existingProfile = await ctx.db
        .query("users")
        .withIndex("by_organization_email", (q) =>
          q.eq("organizationId", organization._id).eq("email", email),
        )
        .first();

      if (existingProfile) {
        await ctx.db.patch(existingProfile._id, {
          areaId,
          role: profile.role,
          ...(profile.displayName?.trim() ? { displayName: profile.displayName.trim() } : {}),
          isActive: true,
          updatedAt: now,
        });
        updatedProfiles += 1;
      } else {
        await ctx.db.insert("users", {
          organizationId: organization._id,
          areaId,
          displayName: profile.displayName?.trim() || email.split("@")[0],
          email,
          role: profile.role,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        createdProfiles += 1;
      }
    }

    return {
      organizationId: organization._id,
      createdAreas,
      createdProfiles,
      updatedProfiles,
      totalProfiles: profiles.length,
    };
  },
});
