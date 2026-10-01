import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";

type AuthContext = QueryCtx | MutationCtx;

export async function requireCurrentUser(ctx: AuthContext) {
  const identity = await ctx.auth.getUserIdentity();
  const email = identity?.email?.trim().toLowerCase();

  if (!identity || !email || identity.emailVerified !== true) {
    throw new Error("Entre com uma conta institucional cujo e-mail esteja verificado.");
  }

  const organization = await ctx.db
    .query("organizations")
    .withIndex("by_name", (q) => q.eq("name", "Converge"))
    .first();

  if (!organization || !organization.isActive) {
    throw new Error("A organização Converge não está disponível.");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_organization_email", (q) =>
      q.eq("organizationId", organization._id).eq("email", email),
    )
    .first();

  if (!user || !user.isActive) {
    throw new Error("Este e-mail não possui um perfil de acesso ativo.");
  }

  if (user.authSubject && user.authSubject !== identity.subject) {
    throw new Error("Esta conta não corresponde ao perfil cadastrado.");
  }

  return { identity, organization, user };
}

export async function requireAreaAccess(ctx: AuthContext, areaId: Id<"areas">) {
  const profile = await requireCurrentUser(ctx);
  const area = await ctx.db.get(areaId);

  if (!area || area.organizationId !== profile.organization._id || !area.isActive) {
    throw new Error("Área indisponível.");
  }

  if (profile.user.role !== "admin" && profile.user.areaId !== areaId) {
    throw new Error("Seu perfil não tem acesso a esta área.");
  }

  return profile;
}

export async function requireCardAccess(ctx: AuthContext, card: Doc<"cards">) {
  const profile = await requireCurrentUser(ctx);

  if (card.organizationId !== profile.organization._id) {
    throw new Error("Card indisponível.");
  }

  if (profile.user.role === "admin" || card.createdByUserId === profile.user._id) {
    return profile;
  }

  if (card.visibility === "area" && card.areaId === profile.user.areaId) {
    return profile;
  }

  if (profile.user.areaId) {
    const areaShare = await ctx.db
      .query("cardAreaShares")
      .withIndex("by_card_area", (q) =>
        q.eq("cardId", card._id).eq("areaId", profile.user.areaId!),
      )
      .first();

    if (areaShare) return profile;
  }

  const userShare = await ctx.db
    .query("cardUserShares")
    .withIndex("by_card_user", (q) =>
      q.eq("cardId", card._id).eq("userId", profile.user._id),
    )
    .first();

  if (userShare) return profile;

  throw new Error("Seu perfil não tem acesso a este card.");
}
