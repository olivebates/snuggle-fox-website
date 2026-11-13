import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  playSessions: defineTable({
    gameSlug: v.string(),
    sessionId: v.string(),
    durationMs: v.number()
  }).index("by_session", ["sessionId"]),
  gameStats: defineTable({
    gameSlug: v.string(),
    plays: v.number(),
    durationMs: v.number()
  }).index("by_game", ["gameSlug"])
});
