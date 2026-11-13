import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { v } from "convex/values";

export const stats = query({
  args: { gameSlug: v.string() },
  handler: async (ctx, { gameSlug }) => {
    const totals = await ctx.db.query("gameStats")
      .withIndex("by_game", (q) => q.eq("gameSlug", gameSlug)).unique();
    return { plays: totals?.plays ?? 0, durationMs: totals?.durationMs ?? 0 };
  }
});

// A session's cumulative duration makes retries and out-of-order unload saves safe.
export const record = mutation({
  args: { gameSlug: v.string(), sessionId: v.string(), durationMs: v.number() },
  handler: async (ctx, { gameSlug, sessionId, durationMs }) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(gameSlug) || gameSlug.length > 100 ||
        !/^[a-f0-9-]{36}$/.test(sessionId) ||
        !Number.isSafeInteger(durationMs) || durationMs < 0) {
      throw new Error("Invalid play session.");
    }

    const session = await ctx.db.query("playSessions")
      .withIndex("by_session", (q) => q.eq("sessionId", sessionId)).unique();
    if (session && session.gameSlug !== gameSlug) {
      throw new Error("Session belongs to another game.");
    }
    const previousDuration = session?.durationMs ?? 0;
    const nextDuration = Math.max(previousDuration, durationMs);
    if (session && nextDuration === previousDuration) {
      return null;
    }

    if (session) {
      await ctx.db.patch(session._id, { durationMs: nextDuration });
    } else {
      await ctx.db.insert("playSessions", { gameSlug, sessionId, durationMs: nextDuration });
    }

    const totals = await ctx.db.query("gameStats")
      .withIndex("by_game", (q) => q.eq("gameSlug", gameSlug)).unique();
    const updated = {
      plays: (totals?.plays ?? 0) + (session ? 0 : 1),
      durationMs: (totals?.durationMs ?? 0) + nextDuration - previousDuration
    };
    if (totals) {
      await ctx.db.patch(totals._id, updated);
    } else {
      await ctx.db.insert("gameStats", { gameSlug, ...updated });
    }
    return null;
  }
});
