// Exemplo de uso das regras de acesso: listar o quadro e criar card (modal "Novo Card").
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { exigir, podeVerCard, usuarioAtual } from "./lib/acesso";

/** Cards de um quadro (coluna a coluna), já filtrados por visibilidade. */
export const listarPorQuadro = query({
  args: { quadro_id: v.id("quadros") },
  handler: async (ctx, { quadro_id }) => {
    const s = await usuarioAtual(ctx);
    const proprios = await ctx.db
      .query("cards")
      .withIndex("by_quadro_status_ordem", (q) => q.eq("quadro_id", quadro_id))
      .collect();
    // cards de outros quadros compartilhados com este quadro (sem cópia)
    const comps = await ctx.db.query("compartilhamentos").withIndex("by_quadro", (q) => q.eq("quadro_id", quadro_id)).collect();
    const extras = (await Promise.all(comps.map((c) => ctx.db.get(c.card_id)))).filter((c): c is Doc<"cards"> => !!c);

    const unicos = new Map([...proprios, ...extras].map((c) => [c._id, c]));
    const visiveis: Doc<"cards">[] = [];
    for (const card of unicos.values()) if (await podeVerCard(ctx, s, card)) visiveis.push(card);
    return visiveis.sort((a, b) => a.ordem - b.ordem);
  },
});

export const criar = mutation({
  args: {
    titulo: v.string(),
    descricao: v.optional(v.string()),
    quadro_id: v.id("quadros"),
    subarea_id: v.optional(v.id("subareas")),
    urgente: v.boolean(),
    visibilidade: v.union(v.literal("EQUIPE_INTEIRA"), v.literal("PESSOAS_ESPECIFICAS")),
    suspender_indeterminado: v.boolean(),
    compartilhar_com: v.optional(v.array(v.id("usuarios"))),
  },
  handler: async (ctx, a) => {
    const s = await usuarioAtual(ctx);
    const escopo = await exigir(ctx, s, "CARD_CRIAR");
    if (escopo !== "TODOS" && a.quadro_id !== s.quadro_id) throw new Error("Você só pode criar cards no seu quadro.");
    if (a.subarea_id) {
      const sub = await ctx.db.get(a.subarea_id);
      if (!sub || sub.quadro_id !== a.quadro_id) throw new Error("Subárea não pertence ao quadro.");
    }
    const codigo = a.suspender_indeterminado ? "SUSPENSO" : "A_FAZER";
    const status = await ctx.db.query("status").withIndex("by_codigo", (q) => q.eq("codigo", codigo)).unique();
    if (!status) throw new Error("Status não cadastrado.");

    const ultimo = await ctx.db
      .query("cards")
      .withIndex("by_quadro_status_ordem", (q) => q.eq("quadro_id", a.quadro_id).eq("status_id", status._id))
      .order("desc").first();
    const agora = Date.now();
    const card_id = await ctx.db.insert("cards", {
      organizacao_id: s.usuario.organizacao_id,
      quadro_id: a.quadro_id,
      origin_quadro_id: a.quadro_id,
      subarea_id: a.subarea_id,
      criado_por_id: s.usuario._id,
      titulo: a.titulo.trim(),
      descricao: a.descricao,
      urgente: a.urgente,
      visibilidade: a.visibilidade,
      status_id: status._id,
      suspenso_indeterminado: a.suspender_indeterminado,
      suspenso_desde: a.suspender_indeterminado ? agora : undefined,
      ordem: (ultimo?.ordem ?? 0) + 1,
      criado_em: agora,
      atualizado_em: agora,
    });
    if (a.visibilidade === "PESSOAS_ESPECIFICAS") {
      for (const usuario_id of new Set(a.compartilhar_com ?? [])) {
        await ctx.db.insert("compartilhamentos", {
          card_id, tipo_destino: "USUARIO", usuario_id, nivel_acesso: "LEITURA",
          criado_por_id: s.usuario._id, criado_em: agora,
        });
      }
    }
    await ctx.db.insert("eventos", {
      card_id, ator_id: s.usuario._id, ator_nome: s.usuario.nome, tipo_evento: "CARD_CRIADO",
      status_novo_id: status._id, descricao: `Card criado: ${a.titulo.trim()}`, ocorrido_em: agora,
    });
    return card_id;
  },
});
