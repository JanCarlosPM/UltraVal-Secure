import { useState, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

import {
  Clock,
  CheckCircle,
  User,
  Calendar,
  MapPin,
  AlertTriangle,
  MessageCircle,
  Loader2,
} from "lucide-react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

/* =========================================================
   Tipos y helpers
   ========================================================= */

type Prioridad = "baja" | "media" | "alta" | "critica";

type EstadoIncidencia =
  | "pendiente"
  | "asignada"
  | "en_curso"
  | "en_pausa"
  | "en_espera_info"
  | "cerrada"
  | "resuelta"
  | "reabierta"
  | "rechazada"
  | "rechazado"
  | "borrador"
  | "en_ejecucion"
  | "en_progreso";

interface AreaLite {
  nombre: string;
  descripcion?: string | null;
}

interface ClasificacionLite {
  nombre: string;
  color: string;
}

interface ImagenIncidencia {
  id: string;
  url_imagen: string;
  nombre_archivo: string | null;
  tipo_archivo: string | null;
}

interface IncidenciaClasRelacion {
  id: string;
  clasificaciones: {
    id: string;
    nombre: string;
    color: string;
  };
}

interface IncidenciaUsuario {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad | string;
  estado: EstadoIncidencia | string;
  area_id: string | null;
  clasificacion_id: string | null;
  sala_id: string | null;
  observaciones: string | null;
  fecha_incidencia: string | null;
  created_at: string;
  fecha_cierre?: string | null;
  visible: boolean;

  areas?: AreaLite | null;
  clasificaciones?: ClasificacionLite | null;
  incidencia_clasificaciones?: IncidenciaClasRelacion[];
  imagenes_incidencias?: ImagenIncidencia[];
}

interface HistorialEstado {
  id: string;
  incidencia_id: string;
  estado: EstadoIncidencia | string;
  comentario: string;
  cambiado_por: string | null;
  fecha_cambio: string;
}

const getPrioridadColor = (prioridad: Prioridad | string) => {
  switch (prioridad) {
    case "critica":
      return "bg-red-600";
    case "alta":
      return "bg-amber-500";
    case "media":
      return "bg-sky-500";
    case "baja":
      return "bg-emerald-500";
    default:
      return "bg-slate-500";
  }
};

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  asignada: "Asignada",
  en_curso: "En curso",
  en_pausa: "En pausa",
  en_espera_info: "En espera de información",
  cerrada: "Cerrada",
  resuelta: "Resuelta",
  reabierta: "Reabierta",
  borrador: "Borrador",
  en_ejecucion: "En ejecución",
  en_progreso: "En progreso",
  rechazada: "Rechazada",
  rechazado: "Rechazada",
};

const formatEstado = (estado?: string | null) =>
  estado ? ESTADO_LABELS[estado] ?? estado.replace(/_/g, " ") : "Sin estado";

const formatFechaHora = (value?: string | null) =>
  value
    ? format(new Date(value), "dd/MM/yyyy HH:mm", { locale: es })
    : "Sin fecha";

const formatFecha = (value?: string | null) =>
  value ? format(new Date(value), "dd/MM/yyyy", { locale: es }) : "Sin fecha";

const getEstadoBadgeClasses = (estado: string) => {
  switch (estado) {
    case "pendiente":
      return "border-amber-500 text-amber-700 bg-amber-50";
    case "asignada":
      return "border-sky-500 text-sky-700 bg-sky-50";
    case "en_curso":
      return "border-emerald-500 text-emerald-700 bg-emerald-50";
    case "en_pausa":
      return "border-violet-500 text-violet-700 bg-violet-50";
    case "en_espera_info":
      return "border-orange-500 text-orange-700 bg-orange-50";
    case "cerrada":
      return "border-slate-500 text-slate-700 bg-slate-50";
    case "resuelta":
      return "border-emerald-600 text-emerald-700 bg-emerald-50";
    case "rechazada":
    case "rechazado":
      return "border-rose-500 text-rose-700 bg-rose-50";
    default:
      return "border-slate-300 text-slate-600 bg-white";
  }
};

/* =========================================================
   Vista principal: Historial de incidencias del usuario
   ========================================================= */

const HistorialIncidenciasView = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [selectedIncidencia, setSelectedIncidencia] =
    useState<IncidenciaUsuario | null>(null);
  const [nuevoComentario, setNuevoComentario] = useState("");

  // Reabrir incidencia
  const [incidenciaAReabrir, setIncidenciaAReabrir] =
    useState<IncidenciaUsuario | null>(null);
  const [isReopenDialogOpen, setIsReopenDialogOpen] = useState(false);
  const [comentarioReapertura, setComentarioReapertura] = useState("");

  // Filtro de vista (tabs) -> TODAS / PENDIENTES / EN ESPERA INFO / CERRADAS
  const [filtro, setFiltro] = useState<
    "todas" | "pendientes" | "en_espera_info" | "cerradas"
  >("todas");

  if (!profile) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de incidencias</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Debes iniciar sesión para ver tus incidencias.</p>
        </CardContent>
      </Card>
    );
  }

  /* =========================================================
     Query: incidencias creadas por el usuario
     ========================================================= */

  const {
    data: incidencias = [],
    isLoading,
  } = useQuery<IncidenciaUsuario[]>({
    queryKey: ["mis-incidencias", profile.id],
    enabled: !!profile.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidencias")
        .select(
          `
          *,
          areas!incidencias_area_id_fkey(nombre, descripcion),
          clasificaciones(nombre, color),
          incidencia_clasificaciones(
            id,
            clasificaciones(id, nombre, color)
          ),
          imagenes_incidencias(
            id,
            url_imagen,
            nombre_archivo,
            tipo_archivo
          )
        `
        )
        .eq("reportado_por", profile.id)
        .eq("visible", true)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error obteniendo mis incidencias:", error);
        throw error;
      }

      return (data || []) as IncidenciaUsuario[];
    },
  });

  /* =========================================================
     Query: historial de estados de la incidencia seleccionada
     ========================================================= */

  const {
    data: historialEstados = [],
    isLoading: isLoadingHistorial,
  } = useQuery<HistorialEstado[]>({
    queryKey: ["historial-incidencia-usuario", selectedIncidencia?.id],
    enabled: !!selectedIncidencia?.id,
    queryFn: async () => {
      if (!selectedIncidencia?.id) return [];
      const { data, error } = await supabase
        .from("incidencia_historial_estados")
        .select(
          `
          id,
          incidencia_id,
          estado,
          comentario,
          cambiado_por,
          fecha_cambio
        `
        )
        .eq("incidencia_id", selectedIncidencia.id)
        .order("fecha_cambio", { ascending: true });

      if (error) {
        console.error("Error obteniendo historial de estados:", error);
        throw error;
      }

      return (data || []) as HistorialEstado[];
    },
  });

  /* =========================================================
     Mutaciones
     ========================================================= */

  // Comentario cuando la incidencia está en "en_espera_info"
  const agregarComentario = useMutation({
    mutationFn: async (params: {
      incidenciaId: string;
      comentario: string;
    }) => {
      const { incidenciaId, comentario } = params;

      if (!comentario.trim()) {
        throw new Error("El comentario no puede estar vacío.");
      }

      const now = new Date().toISOString();

      const { error: updError } = await supabase
        .from("incidencias")
        .update({
          observaciones: comentario,
          updated_at: now,
        })
        .eq("id", incidenciaId)
        .eq("reportado_por", profile.id);

      if (updError) throw updError;

      const { error: histError } = await supabase
        .from("incidencia_historial_estados")
        .insert({
          incidencia_id: incidenciaId,
          estado: "en_espera_info",
          comentario,
          cambiado_por: profile.id,
          fecha_cambio: now,
        });

      if (histError) throw histError;
    },
    onSuccess: () => {
      toast.success("Comentario enviado correctamente");
      setNuevoComentario("");
      queryClient.invalidateQueries({
        queryKey: ["mis-incidencias", profile.id],
      });
      if (selectedIncidencia?.id) {
        queryClient.invalidateQueries({
          queryKey: ["historial-incidencia-usuario", selectedIncidencia.id],
        });
      }
    },
    onError: (error: any) => {
      console.error("Error agregando comentario:", error);
      toast.error(
        error?.message || "No se pudo enviar el comentario. Intenta de nuevo."
      );
    },
  });

  // Reabrir incidencia (solo si está cerrada) con comentario obligatorio
  const reabrirIncidencia = useMutation({
    mutationFn: async (params: {
      incidenciaId: string;
      comentario: string;
    }) => {
      const { incidenciaId, comentario } = params;

      if (!comentario.trim()) {
        throw new Error("Debes ingresar un comentario para reabrir.");
      }

      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("incidencias")
        .update({
          estado: "reabierta",
          updated_at: now,
          visible: true,
        })
        .eq("id", incidenciaId)
        .eq("reportado_por", profile.id)
        .eq("estado", "cerrada");

      if (updateError) throw updateError;

      const { error: histError } = await supabase
        .from("incidencia_historial_estados")
        .insert({
          incidencia_id: incidenciaId,
          estado: "reabierta",
          comentario,
          cambiado_por: profile.id,
          fecha_cambio: now,
        });

      if (histError) throw histError;
    },
    onSuccess: () => {
      toast.success("Incidencia reabierta correctamente");
      setIsReopenDialogOpen(false);
      setIncidenciaAReabrir(null);
      setComentarioReapertura("");
      queryClient.invalidateQueries({
        queryKey: ["mis-incidencias", profile.id],
      });
    },
    onError: (error: any) => {
      console.error("Error reabriendo incidencia:", error);
      toast.error(error?.message || "No se pudo reabrir la incidencia");
    },
  });

  /* =========================================================
     Helpers de UI
     ========================================================= */

  const puedeComentar =
    selectedIncidencia && selectedIncidencia.estado === "en_espera_info";

  const puedeReabrir = (inc: IncidenciaUsuario) =>
    inc.estado === "cerrada";

  const abrirDetalle = (incidencia: IncidenciaUsuario) => {
    setSelectedIncidencia(incidencia);
    setNuevoComentario("");
  };

  const cerrarDetalle = () => {
    setSelectedIncidencia(null);
    setNuevoComentario("");
  };

  const abrirDialogoReabrir = (incidencia: IncidenciaUsuario) => {
    setIncidenciaAReabrir(incidencia);
    setComentarioReapertura("");
    setIsReopenDialogOpen(true);
  };

  const confirmarReapertura = () => {
    if (!incidenciaAReabrir) return;
    if (!comentarioReapertura.trim()) {
      toast.error("Debes ingresar un comentario para reabrir.");
      return;
    }
    reabrirIncidencia.mutate({
      incidenciaId: incidenciaAReabrir.id,
      comentario: comentarioReapertura.trim(),
    });
  };

  // Stats rápidas
  const total = incidencias.length;
  const abiertas = incidencias.filter(
    (i) =>
      !["cerrada", "resuelta", "rechazada", "rechazado"].includes(
        i.estado as string
      )
  );
  const enEsperaInfo = incidencias.filter(
    (i) => i.estado === "en_espera_info"
  );
  const cerradas = incidencias.filter((i) =>
    ["cerrada", "resuelta"].includes(i.estado as string)
  );
  const enPausa = incidencias.filter((i) => i.estado === "en_pausa");
  const pendientes = incidencias.filter((i) => i.estado === "pendiente");

  const ultimoHistorialId =
    historialEstados.length > 0
      ? historialEstados[historialEstados.length - 1].id
      : null;

  // Filtro según tabs: todas / pendientes / en_espera_info / cerradas
  const incidenciasFiltradas = useMemo(() => {
    switch (filtro) {
      case "pendientes":
        return pendientes;
      case "en_espera_info":
        return enEsperaInfo;
      case "cerradas":
        return cerradas;
      case "todas":
      default:
        return incidencias;
    }
  }, [filtro, incidencias, pendientes, enEsperaInfo, cerradas]);

  const renderListaIncidencias = (lista: IncidenciaUsuario[]) => {
    if (lista.length === 0) {
      return (
        <Card>
          <CardContent className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
            <p className="text-gray-600">
              No hay incidencias para este filtro.
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {lista.map((inc) => (
          <Card
            key={inc.id}
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => abrirDetalle(inc)}
          >
            <CardContent className="pt-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-2">
                    {inc.titulo}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline">
                      <MapPin className="w-3 h-3 mr-1" />
                      {inc.areas?.nombre || "Sin área"}
                    </Badge>

                    {inc.incidencia_clasificaciones &&
                    inc.incidencia_clasificaciones.length > 0 ? (
                      inc.incidencia_clasificaciones.map((rel) => (
                        <Badge
                          key={rel.id}
                          variant="outline"
                          style={{
                            borderColor:
                              rel.clasificaciones?.color || "#6B7280",
                            color:
                              rel.clasificaciones?.color || "#374151",
                          }}
                        >
                          {rel.clasificaciones?.nombre}
                        </Badge>
                      ))
                    ) : (
                      <Badge
                        variant="outline"
                        style={{
                          borderColor:
                            inc.clasificaciones?.color || "#6B7280",
                          color: inc.clasificaciones?.color || "#374151",
                        }}
                      >
                        {inc.clasificaciones?.nombre || "Sin clasificación"}
                      </Badge>
                    )}

                    <Badge
                      className={`text-white ${getPrioridadColor(
                        inc.prioridad
                      )}`}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {inc.prioridad}
                    </Badge>

                    <Badge
                      variant="outline"
                      className={`capitalize ${getEstadoBadgeClasses(
                        inc.estado as string
                      )}`}
                    >
                      {formatEstado(inc.estado as string)}
                    </Badge>
                  </div>
                </div>

                <div className="text-right text-sm text-gray-500">
                  <p className="flex items-center gap-1 justify-end">
                    <Calendar className="w-3 h-3" />
                    Reportada: {formatFechaHora(inc.fecha_incidencia)}
                  </p>
                  <p className="flex items-center gap-1 mt-1 justify-end">
                    <Clock className="w-3 h-3" />
                    Creada: {formatFecha(inc.created_at)}
                  </p>
                </div>
              </div>

              <p className="text-gray-700 mb-3 line-clamp-2">
                {inc.descripcion}
              </p>

              {inc.observaciones && (
                <div className="bg-slate-50 p-3 rounded-lg mb-3 text-sm">
                  <strong>Observaciones:</strong> {inc.observaciones}
                </div>
              )}

              <div className="pt-3 border-t flex flex-wrap gap-2 justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-emerald-500 text-emerald-700 hover:bg-emerald-50"
                  disabled={!puedeReabrir(inc)}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!puedeReabrir(inc)) return;
                    abrirDialogoReabrir(inc);
                  }}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Reabrir incidencia
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  /* =========================================================
     Render
     ========================================================= */

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="pt-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header + estadísticas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de incidencias
          </CardTitle>
          <CardDescription>
            Consulta las incidencias que has reportado y el seguimiento de cada
            una.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-500 uppercase">
                Total reportadas
              </span>
              <span className="text-2xl font-bold text-slate-8
00">
                {total}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-emerald-600 uppercase">
                Abiertas / en seguimiento
              </span>
              <span className="text-2xl font-bold text-emerald-700">
                {abiertas.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-violet-600 uppercase">
                En pausa
              </span>
              <span className="text-2xl font-bold text-violet-700">
                {enPausa.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-orange-600 uppercase">
                En espera de información
              </span>
              <span className="text-2xl font-bold text-orange-700">
                {enEsperaInfo.length}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-slate-600 uppercase">
                Cerradas / resueltas
              </span>
              <span className="text-2xl font-bold text-slate-700">
                {cerradas.length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros (tabs) + lista */}
      <Tabs
        value={filtro}
        onValueChange={(val) =>
          setFiltro(
            val as "todas" | "pendientes" | "en_espera_info" | "cerradas"
          )
        }
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="todas">Todas</TabsTrigger>
          <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
          <TabsTrigger value="en_espera_info">
            En espera de info
          </TabsTrigger>
          <TabsTrigger value="cerradas">Cerradas</TabsTrigger>
        </TabsList>

        <TabsContent value="todas" className="mt-0">
          {renderListaIncidencias(incidenciasFiltradas)}
        </TabsContent>
        <TabsContent value="pendientes" className="mt-0">
          {renderListaIncidencias(incidenciasFiltradas)}
        </TabsContent>
        <TabsContent value="en_espera_info" className="mt-0">
          {renderListaIncidencias(incidenciasFiltradas)}
        </TabsContent>
        <TabsContent value="cerradas" className="mt-0">
          {renderListaIncidencias(incidenciasFiltradas)}
        </TabsContent>
      </Tabs>

      {/* DIALOGO DETALLE / SEGUIMIENTO */}
      <Dialog
        open={!!selectedIncidencia}
        onOpenChange={(open) => {
          if (!open) cerrarDetalle();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedIncidencia && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedIncidencia.titulo}</DialogTitle>
                <DialogDescription>
                  Detalle y seguimiento de la incidencia que reportaste.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-2 mb-4 border rounded-lg p-3 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={`text-white ${getPrioridadColor(
                        selectedIncidencia.prioridad
                      )}`}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {selectedIncidencia.prioridad}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={getEstadoBadgeClasses(
                        selectedIncidencia.estado as string
                      )}
                    >
                      {formatEstado(selectedIncidencia.estado as string)}
                    </Badge>
                    {selectedIncidencia.areas?.nombre && (
                      <Badge variant="outline">
                        <MapPin className="w-3 h-3 mr-1" />
                        {selectedIncidencia.areas.nombre}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-muted-foreground">
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Reportada:{" "}
                      {formatFechaHora(selectedIncidencia.fecha_incidencia)}
                    </span>
                  </p>
                  <p className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>Reportado por: Tú</span>
                  </p>
                </div>
              </div>

              <Tabs defaultValue="resumen" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4">
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                  <TabsTrigger value="seguimiento">Seguimiento</TabsTrigger>
                  <TabsTrigger value="evidencias">Evidencias</TabsTrigger>
                </TabsList>

                <TabsContent value="resumen" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Descripción de la incidencia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">
                        {selectedIncidencia.descripcion ||
                          "Sin descripción registrada."}
                      </p>
                    </CardContent>
                  </Card>

                  {selectedIncidencia.observaciones && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">
                          Observaciones
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground whitespace-pre-line">
                          {selectedIncidencia.observaciones}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="seguimiento" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Historial de estados
                      </CardTitle>
                      <CardDescription>
                        Cambios de estado registrados por el equipo técnico.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHistorial ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
                        </div>
                      ) : historialEstados.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Aún no hay historial de estados para esta incidencia.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border rounded-lg overflow-hidden">
                            <thead className="bg-slate-100">
                              <tr className="text-left">
                                <th className="px-3 py-2">Estado</th>
                                <th className="px-3 py-2">Fecha y hora</th>
                                <th className="px-3 py-2">Comentario</th>
                              </tr>
                            </thead>
                            <tbody>
                              {historialEstados.map((h) => {
                                const isUltimo = h.id === ultimoHistorialId;
                                return (
                                  <tr
                                    key={h.id}
                                    className={`border-t align-top ${
                                      isUltimo ? "bg-emerald-50" : ""
                                    }`}
                                  >
                                    <td className="px-3 py-2 capitalize whitespace-nowrap">
                                      {formatEstado(h.estado as string)}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap">
                                      {formatFechaHora(h.fecha_cambio)}
                                    </td>
                                    <td className="px-3 py-2">
                                      {h.comentario}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base exitos flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Responder solicitud de información
                      </CardTitle>
                      <CardDescription>
                        Solo puedes agregar comentarios cuando la incidencia
                        está en estado{" "}
                        <span className="font-semibold">
                          &quot;En espera de información&quot;
                        </span>
                        .
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        rows={3}
                        value={nuevoComentario}
                        onChange={(e) => setNuevoComentario(e.target.value)}
                        placeholder={
                          puedeComentar
                            ? "Escribe aquí la información adicional o aclaraciones para el equipo técnico..."
                            : "Actualmente esta incidencia no está en 'En espera de información'."
                        }
                        disabled={!puedeComentar || agregarComentario.isPending}
                      />
                      <div className="flex justify-end">
                        <Button
                          onClick={() => {
                            if (!selectedIncidencia) return;
                            agregarComentario.mutate({
                              incidenciaId: selectedIncidencia.id,
                              comentario: nuevoComentario.trim(),
                            });
                          }}
                          disabled={
                            !puedeComentar ||
                            agregarComentario.isPending ||
                            !nuevoComentario.trim()
                          }
                        >
                          {agregarComentario.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Enviar comentario
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="evidencias" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">
                        Evidencias multimedia
                      </CardTitle>
                      <CardDescription>
                        Imágenes o videos asociados a la incidencia.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedIncidencia.imagenes_incidencias &&
                      selectedIncidencia.imagenes_incidencias.length > 0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {selectedIncidencia.imagenes_incidencias.map(
                            (img) => {
                              const isVideo =
                                img.tipo_archivo?.startsWith("video/");
                              return (
                                <div
                                  key={img.id}
                                  className="border rounded-lg overflow-hidden"
                                >
                                  {isVideo ? (
                                    <div className="w-full h-24 bg-slate-100 flex items-center justify-center text-xs text-muted-foreground">
                                      Video adjunto
                                    </div>
                                  ) : (
                                    <img
                                      src={img.url_imagen}
                                      alt={img.nombre_archivo || "Evidencia"}
                                      className="w-full h-24 object-cover"
                                    />
                                  )}
                                  <div className="px-2 py-1 text-[11px] truncate text-muted-foreground">
                                    {img.nombre_archivo || "Archivo"}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No hay evidencias asociadas a esta incidencia.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOGO REABRIR INCIDENCIA */}
      <Dialog
        open={isReopenDialogOpen}
        onOpenChange={(open) => {
          setIsReopenDialogOpen(open);
          if (!open) {
            setIncidenciaAReabrir(null);
            setComentarioReapertura("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reabrir incidencia</DialogTitle>
            <DialogDescription>
              La incidencia volverá al flujo de atención con estado{" "}
              <span className="font-semibold">Reabierta</span>. Debes indicar
              el motivo de la reapertura.
            </DialogDescription>
          </DialogHeader>

          {incidenciaAReabrir && (
            <div className="space-y-2 mb-4 text-sm">
              <p>
                <span className="font-semibold">Título:</span>{" "}
                {incidenciaAReabrir.titulo}
              </p>
              <p>
                <span className="font-semibold">Estado actual:</span>{" "}
                {formatEstado(incidenciaAReabrir.estado as string)}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Comentario / justificación (obligatorio)
            </label>
            <Textarea
              rows={4}
              value={comentarioReapertura}
              onChange={(e) => setComentarioReapertura(e.target.value)}
              placeholder="Ejemplo: el problema volvió a presentarse, no se solucionó completamente, se detectaron nuevos síntomas, etc."
            />
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsReopenDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarReapertura}
              disabled={reabrirIncidencia.isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {reabrirIncidencia.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Reabriendo...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Confirmar reapertura
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HistorialIncidenciasView;