// Login com Convex Auth. Só entra quem está em "usuarios" (e-mail cadastrado) e ativo.
// O provedor precisa VERIFICAR o e-mail (Google OAuth verifica). Não use Password sem verificação
// por código: qualquer pessoa poderia se cadastrar com o e-mail de um administrador.
import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import type { MutationCtx } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      const email = String(args.profile.email ?? "").trim().toLowerCase();
      if (!email) throw new Error("Conta sem e-mail.");

      const db = (ctx as unknown as MutationCtx).db; // o ctx do callback não conhece o schema
      const usuario = await db
        .query("usuarios")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();
      if (!usuario || !usuario.ativo) throw new Error("E-mail não autorizado no ComGestor.");

      if (args.existingUserId) return args.existingUserId;
      return await db.insert("users", {
        email,
        name: usuario.nome,
        emailVerificationTime: Date.now(),
      });
    },
  },
});
