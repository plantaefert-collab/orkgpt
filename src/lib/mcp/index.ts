import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getMyPlant from "./tools/get-my-plant";
import getMyProgress from "./tools/get-my-progress";
import setCurrentDay from "./tools/set-current-day";

// Direct Supabase issuer (never the .lovable.cloud proxy) — required by mcp-js
// token verification (RFC 8414 issuer match on discovery document).
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "orquideas-floridas-mcp",
  title: "Guia Orquídeas Floridas",
  version: "0.1.0",
  instructions:
    "Ferramentas para o Guia Orquídeas Floridas. Use get_my_plant para ler o cadastro da orquídea, get_my_progress para ler o progresso do protocolo de 21 dias e set_current_day para atualizar o dia atual.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getMyPlant, getMyProgress, setCurrentDay],
});
