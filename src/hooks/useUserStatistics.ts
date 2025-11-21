
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UserStatistic {
  nombre: string;
  total: number;
  criticas: number;
  altas: number;
  medias: number;
  bajas: number;
  ultimas_incidencias: Array<{
    fecha: string;
    prioridad: string;
  }>;
}

export const useUserStatistics = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-statistics"],
    queryFn: async (): Promise<UserStatistic[]> => {
      if (!user) return [];

      // Obtener estadísticas por usuario con JOIN a profiles - SOLO INCIDENCIAS APROBADAS
      const { data, error } = await supabase
        .from("incidencias")
        .select(`
          reportado_por,
          prioridad,
          created_at
        `)
        .eq("estado", "aprobado") // Solo incidencias aprobadas
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching user statistics:", error);
        return [];
      }

      if (!data || data.length === 0) {
        console.log("No se encontraron incidencias aprobadas");
        return [];
      }

      // Obtener todos los profiles de los usuarios que reportaron incidencias
      const uniqueUserIds = [...new Set(data.map(inc => inc.reportado_por))];
      
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", uniqueUserIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
        return [];
      }

      // Crear un mapa de ID -> perfil
      const profilesMap = new Map();
      profiles?.forEach(profile => {
        profilesMap.set(profile.id, profile);
      });

      // Agrupar por usuario
      const userStats = data.reduce((acc: Record<string, UserStatistic>, incidencia: any) => {
        const userId = incidencia.reportado_por;
        const profile = profilesMap.get(userId);
        const userName = profile?.full_name || profile?.email || `Usuario ${userId.substring(0, 8)}`;
        
        if (!acc[userId]) {
          acc[userId] = {
            nombre: userName,
            total: 0,
            criticas: 0,
            altas: 0,
            medias: 0,
            bajas: 0,
            ultimas_incidencias: []
          };
        }

        acc[userId].total += 1;
        
        // Incrementar contador por prioridad
        switch(incidencia.prioridad) {
          case 'critica':
            acc[userId].criticas += 1;
            break;
          case 'alta':
            acc[userId].altas += 1;
            break;
          case 'media':
            acc[userId].medias += 1;
            break;
          case 'baja':
            acc[userId].bajas += 1;
            break;
        }
        
        if (acc[userId].ultimas_incidencias.length < 5) {
          acc[userId].ultimas_incidencias.push({
            fecha: incidencia.created_at,
            prioridad: incidencia.prioridad
          });
        }

        return acc;
      }, {});

      return Object.values(userStats).sort((a, b) => b.total - a.total);
    },
    enabled: !!user,
  });
};
