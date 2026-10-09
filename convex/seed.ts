// Carga inicial. Rodar UMA vez:  npx convex run seed:carregar
// Troca os códigos da planilha (USR_001, AREA_001...) pelos _id gerados pelo Convex.
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { seedData as d } from "./seedData";

export const carregar = internalMutation({
  args: {},
  handler: async (ctx) => {
    if (await ctx.db.query("organizacoes").first()) return "Já carregado — nada feito.";

    const org = new Map<string, Id<"organizacoes">>();
    for (const o of d.organizacoes)
      org.set(o.codigo, await ctx.db.insert("organizacoes", {
        nome: o.nome, descricao: o.descricao ?? undefined, ativa: o.ativa, criado_em: o.criado_em, atualizado_em: o.atualizado_em }));

    const quadro = new Map<string, Id<"quadros">>();
    for (const q of d.quadros)
      quadro.set(q.codigo, await ctx.db.insert("quadros", {
        organizacao_id: org.get(q.organizacao)!, nome: q.nome, cor: q.cor, ordem: q.ordem, ativo: q.ativo }));

    const area = new Map<string, Id<"areas">>();
    for (const a of d.areas)
      area.set(a.codigo, await ctx.db.insert("areas", {
        organizacao_id: org.get(a.organizacao)!, quadro_id: quadro.get(a.quadro)!, macroarea: a.macroarea,
        setor: a.setor, descricao: a.descricao ?? undefined, ativa: a.ativa }));

    const perfil = new Map<string, Id<"perfis_acesso">>();
    for (const p of d.perfis)
      perfil.set(p.codigo, await ctx.db.insert("perfis_acesso", { codigo: p.cod, nome: p.nome, descricao: p.descricao ?? undefined }));

    const permissao = new Map<string, Id<"permissoes">>();
    for (const p of d.permissoes)
      permissao.set(p.codigo, await ctx.db.insert("permissoes", { codigo: p.cod, recurso: p.recurso, acao: p.acao }));

    for (const pp of d.perfilPermissoes)
      await ctx.db.insert("perfil_permissoes", {
        perfil_id: perfil.get(pp.perfil)!, permissao_id: permissao.get(pp.permissao)!, escopo: pp.escopo });

    for (const s of d.status)
      await ctx.db.insert("status", {
        codigo: s.cod, nome: s.nome, descricao: s.descricao ?? undefined, ordem: s.ordem, final: s.final, ativo: s.ativo });

    for (const u of d.usuarios)
      await ctx.db.insert("usuarios", {
        organizacao_id: org.get(u.organizacao)!, email: u.email, nome: u.nome,
        area_id: area.get(u.area)!, perfil_id: perfil.get(u.perfil)!, ativo: u.ativo });

    return `Carregado: ${d.quadros.length} quadros, ${d.areas.length} áreas, ${d.usuarios.length} usuários.`;
  },
});
