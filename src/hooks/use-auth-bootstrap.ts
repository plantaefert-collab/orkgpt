import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { hydrateStore, clearStore, defaultState, normalizeRemoteProgress, ProtocolState } from "@/lib/protocol-store";
import { AuthBootstrapStatus, UserProfile } from "@/lib/auth/types";
import { loadFromCache, saveToCache, getCacheTimestamp, setGuestActive } from "@/lib/protocol-cache";
import { fetchUserProfile, fetchUserProgress, saveProgressRemote } from "@/lib/protocol-cloud";
import { isDiagnosisCurrent, totalObservations } from "@/lib/protocol-store";

export function useAuthBootstrap() {
  const [status, setStatus] = useState<AuthBootstrapStatus>("booting");
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const activeUserIdRef = useRef<string | null>(null);
  const bootstrapGenerationRef = useRef(0);

  const bootstrap = useCallback(async (userId: string | null) => {
    const generation = ++bootstrapGenerationRef.current;
    activeUserIdRef.current = userId;

    // Se o usuário mudou, limpa o store primeiro
    clearStore();

    if (!userId) {
      const guestState = loadFromCache("guest") || defaultState;
      hydrateStore(guestState);
      setStatus("signed_out");
      return;
    }

    setGuestActive(false);
    setStatus("loading_remote_data");
    try {
      const [profileRes, progressRes] = await Promise.all([
        fetchUserProfile(userId),
        fetchUserProgress(userId),
      ]);

      // Verifica se ainda somos a geração atual e o mesmo usuário
      if (generation !== bootstrapGenerationRef.current || userId !== activeUserIdRef.current) {
        return;
      }

      if (profileRes.error && profileRes.error.code !== "PGRST116") {
        throw new Error("Erro ao carregar perfil: " + profileRes.error.message);
      }
      
      const remoteProgress = progressRes.data;
      const remoteTimestamp = remoteProgress?.updated_at || null;
      const cachedState = loadFromCache(userId);
      const cachedTimestamp = getCacheTimestamp(userId);

      // `baseState` pode apontar para o singleton `defaultState`; por isso o
      // merge do perfil abaixo é feito de forma imutável (spreads), nunca por
      // mutação in-place — caso contrário poluiríamos `defaultState` para toda a
      // sessão (inclusive para o próximo visitante).
      let baseState: ProtocolState = defaultState;

      // Reconciliação Determinística
      if (remoteProgress && cachedState) {
        const remoteNormalized = normalizeRemoteProgress(remoteProgress);
        if (remoteTimestamp && cachedTimestamp && new Date(remoteTimestamp) > new Date(cachedTimestamp)) {
          // Banco vence
          baseState = remoteNormalized;
        } else {
          // Cache vence ou são iguais
          baseState = cachedState;
          // Sincroniza cache com o banco se for mais recente
          if (cachedTimestamp && (!remoteTimestamp || new Date(cachedTimestamp) > new Date(remoteTimestamp))) {
            await saveProgressRemote(userId, cachedState);
          }
        }
      } else if (remoteProgress) {
        // Apenas banco
        baseState = normalizeRemoteProgress(remoteProgress);
      } else if (cachedState) {
        // Apenas cache
        baseState = cachedState;
        await saveProgressRemote(userId, cachedState);
      }

      // Mesclar dados do perfil (quando existirem) sem mutar o estado base.
      const profile = profileRes.data;
      const finalState: ProtocolState = profile
        ? {
            ...baseState,
            onboarded: profile.onboarded || baseState.onboarded,
            plant: {
              ...baseState.plant,
              name: profile.plant_name || baseState.plant.name,
              species: profile.plant_species || baseState.plant.species,
              unknownSpecies: profile.plant_unknown_species ?? baseState.plant.unknownSpecies,
              location: profile.plant_location || baseState.plant.location,
              pot: profile.plant_pot || baseState.plant.pot,
              substrate: profile.plant_substrate || baseState.plant.substrate,
              difficulty: profile.plant_difficulty || baseState.plant.difficulty,
            },
          }
        : baseState;

      hydrateStore(finalState);

      // Determinar destino
      // O diagnóstico e o cadastro da planta agora são opcionais.
      // Se for um novo usuário sem perfil, ele será criado via upsert em saveProfileRemote em chamadas subsequentes
      // mas aqui garantimos que o status seja 'ready' para liberar a UI.
      setStatus("ready");
    } catch (err: any) {
      if (generation === bootstrapGenerationRef.current) {
        setError(err.message);
        setStatus("auth_error");
      }
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id ?? null;
      setUser(session?.user ?? null);
      bootstrap(userId);
    };
    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const newUser = session?.user ?? null;
      if (newUser?.id !== activeUserIdRef.current) {
        setUser(newUser);
        bootstrap(newUser?.id ?? null);
      }
    });

    return () => subscription.unsubscribe();
  }, [bootstrap]);

  return { status, user, error, setStatus };
}
