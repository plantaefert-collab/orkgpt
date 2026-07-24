import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function supabaseForUser(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "set_current_day",
  title: "Definir dia atual do protocolo",
  description:
    "Atualiza o dia atual (1 a 21) do protocolo do usuário autenticado. Use quando o usuário disser em que dia está.",
  inputSchema: {
    day: z.number().int().min(1).max(21).describe("Dia atual do protocolo (1 a 21)."),
  },
  annotations: { readOnlyHint: false, idempotentHint: true, destructiveHint: false, openWorldHint: false },
  handler: async ({ day }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("protocol_progress")
      .update({ current_day: day, updated_at: new Date().toISOString() })
      .eq("user_id", ctx.getUserId())
      .select("current_day")
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: `Dia atual atualizado para ${data?.current_day ?? day}.` }],
      structuredContent: { current_day: data?.current_day ?? day },
    };
  },
});
