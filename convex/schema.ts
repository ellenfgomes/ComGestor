import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * CONVERGE — Banco de dados Convex
 *
 * Modelo principal:
 * Organization > Areas > Cards > Actions
 *
 * O modelo preserva os conceitos do schema PostgreSQL original,
 * adaptados para o padrão documental/indexado do Convex.
 *
 * IMPORTANTE:
 * - IDs são Id<"tabela"> gerados pelo Convex.
 * - Relações são representadas por IDs + índices.
 * - Não armazenar senha nesta camada.
 * - Regras de autorização devem ser validadas nas mutations/queries.
 * - createdAt/updatedAt usam timestamp em milissegundos.
 * - Datas de negócio (startDate/dueDate) usam YYYY-MM-DD.
 */

const cardStatus = v.union(
  v.literal("A Fazer"),
  v.literal("Em Andamento"),
  v.literal("Concluídos"),
  v.literal("Suspenso"),
  v.literal("Cancelado"),
);

const visibility = v.union(
  v.literal("area"),
  v.literal("selected"),
);

const attachmentType = v.union(
  v.literal("file"),
  v.literal("link"),
);

export default defineSchema({
  // ============================================================
  // 1. ORGANIZAÇÕES
  // ============================================================
  organizations: defineTable({
    name: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  // ============================================================
  // 2. ÁREAS
  // ============================================================
  areas: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    backgroundColor: v.string(),
    sortOrder: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_active", ["organizationId", "isActive"])
    .index("by_organization_name", ["organizationId", "name"]),

  // ============================================================
  // 3. USUÁRIOS
  // ============================================================
  // authSubject é o identificador do provedor de autenticação.
  // Não armazenar senha aqui.
  users: defineTable({
    organizationId: v.id("organizations"),
    areaId: v.optional(v.id("areas")),
    authSubject: v.optional(v.string()),
    displayName: v.string(),
    email: v.string(),
    jobTitle: v.optional(v.string()),
    role: v.union(
      v.literal("user"),
      v.literal("admin"),
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_active", ["organizationId", "isActive"])
    .index("by_organization_email", ["organizationId", "email"])
    .index("by_auth_subject", ["authSubject"])
    .index("by_area", ["areaId"]),

  // ============================================================
  // 4. GRUPOS DE ESPELHAMENTO
  // ============================================================
  cardMirrorGroups: defineTable({
    organizationId: v.id("organizations"),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_creator", ["createdByUserId"]),

  // ============================================================
  // 5. CARTÕES / PLANOS DE AÇÃO
  // ============================================================
  cards: defineTable({
    organizationId: v.id("organizations"),
    areaId: v.id("areas"),
    originAreaId: v.optional(v.id("areas")),
    colorAreaId: v.optional(v.id("areas")),
    mirrorGroupId: v.optional(v.id("cardMirrorGroups")),
    createdByUserId: v.optional(v.id("users")),
    completionResponsibleUserId: v.optional(v.id("users")),

    title: v.string(),
    description: v.string(),
    subarea: v.optional(v.string()),
    completionResponsibleName: v.optional(v.string()),

    urgency: v.boolean(),
    risk: v.optional(v.string()),
    effort: v.optional(v.string()),
    visibility,
    status: cardStatus,
    inProgressSince: v.optional(v.string()), // YYYY-MM-DD
    archived: v.boolean(),
    location: v.optional(v.string()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_area", ["organizationId", "areaId"])
    .index("by_organization_area_status", ["organizationId", "areaId", "status"])
    .index("by_organization_status", ["organizationId", "status"])
    .index("by_organization_updated", ["organizationId", "updatedAt"])
    .index("by_organization_created_by", ["organizationId", "createdByUserId"])
    .index("by_responsible", ["completionResponsibleUserId"])
    .index("by_mirror_group", ["mirrorGroupId"]),

  // ============================================================
  // 6. COMPARTILHAMENTO COM ÁREAS
  // ============================================================
  cardAreaShares: defineTable({
    organizationId: v.id("organizations"),
    cardId: v.id("cards"),
    areaId: v.id("areas"),
    sharedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_card", ["cardId"])
    .index("by_area", ["areaId"])
    .index("by_card_area", ["cardId", "areaId"]),

  // ============================================================
  // 7. COMPARTILHAMENTO COM USUÁRIOS
  // ============================================================
  cardUserShares: defineTable({
    organizationId: v.id("organizations"),
    cardId: v.id("cards"),
    userId: v.id("users"),
    sharedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_card", ["cardId"])
    .index("by_user", ["userId"])
    .index("by_card_user", ["cardId", "userId"]),

  // ============================================================
  // 8. ETIQUETAS
  // ============================================================
  tags: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    color: v.string(),
    isCustom: v.boolean(),
    createdByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_name", ["organizationId", "name"]),

  cardTags: defineTable({
    organizationId: v.id("organizations"),
    cardId: v.id("cards"),
    tagId: v.id("tags"),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_card", ["cardId"])
    .index("by_tag", ["tagId"])
    .index("by_card_tag", ["cardId", "tagId"]),

  // ============================================================
  // 9. AÇÕES DOS PLANOS
  // ============================================================
  actions: defineTable({
    organizationId: v.id("organizations"),
    cardId: v.id("cards"),
    responsibleUserId: v.optional(v.id("users")),
    createdByUserId: v.optional(v.id("users")),

    title: v.string(),
    startDate: v.string(), // YYYY-MM-DD
    durationDays: v.number(),
    dueDate: v.string(), // YYYY-MM-DD

    // Mantidos como snapshot para compatibilidade/histórico.
    responsibleName: v.optional(v.string()),
    createdByName: v.optional(v.string()),

    completed: v.boolean(),
    completedAt: v.optional(v.number()),
    sortOrder: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_card", ["cardId"])
    .index("by_responsible_due_date", ["responsibleUserId", "dueDate"])
    .index("by_card_sort", ["cardId", "sortOrder"])
    .index("by_organization_due_date", ["organizationId", "dueDate"]),

  // ============================================================
  // 10. COMENTÁRIOS
  // ============================================================
  comments: defineTable({
    organizationId: v.id("organizations"),
    cardId: v.id("cards"),
    actionId: v.optional(v.id("actions")),
    authorUserId: v.optional(v.id("users")),
    authorName: v.string(),
    bodyHtml: v.string(),
    bodyText: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_card", ["cardId"])
    .index("by_card_created", ["cardId", "createdAt"])
    .index("by_action", ["actionId"]),

  // ============================================================
  // 11. MENÇÕES
  // ============================================================
  commentMentions: defineTable({
    organizationId: v.id("organizations"),
    commentId: v.id("comments"),
    userId: v.id("users"),
  })
    .index("by_comment", ["commentId"])
    .index("by_user", ["userId"])
    .index("by_comment_user", ["commentId", "userId"]),

  // ============================================================
  // 12. ANEXOS E LINKS
  // ============================================================
  // Arquivos físicos devem usar storageId do Convex Storage.
  // Links externos usam externalUrl.
  attachments: defineTable({
    organizationId: v.id("organizations"),
    cardId: v.id("cards"),
    actionId: v.optional(v.id("actions")),
    commentId: v.optional(v.id("comments")),

    attachmentType,
    name: v.string(),
    storageId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    contentType: v.optional(v.string()),
    sizeBytes: v.optional(v.number()),
    uploadedByUserId: v.optional(v.id("users")),
    createdAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_card", ["cardId"])
    .index("by_action", ["actionId"])
    .index("by_comment", ["commentId"]),

  // ============================================================
  // 13. HISTÓRICO / EVENTOS DOS CARTÕES
  // ============================================================
  cardEvents: defineTable({
    organizationId: v.id("organizations"),
    cardId: v.id("cards"),
    actorUserId: v.optional(v.id("users")),
    actorName: v.optional(v.string()),
    eventType: v.string(),
    description: v.string(),
    details: v.optional(v.any()),
    occurredAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_card", ["cardId"])
    .index("by_card_occurred", ["cardId", "occurredAt"])
    .index("by_actor", ["actorUserId"]),
});

