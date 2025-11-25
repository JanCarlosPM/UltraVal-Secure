import { useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  CheckCircle,
  Clock,
  User,
  Calendar,
  MapPin,
  AlertTriangle,
  ListChecks,
} from "lucide-react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

/* =========================================================
   Tipos y helpers
   ========================================================= */

type Prioridad = "baja" | "media" | "alta" | "critica";

interface ImagenIncidencia {
  id: string;
  url_imagen: string;
  nombre_archivo: string | null;
  tipo_archivo: string | null;
}

type EstadoTecnico =
  | "asignada"
  | "en_curso"
  | "en_pausa"
  | "en_espera_info"
  | "cerrada"
  | "rechazada"
  | "reasignar"; // estado para solicitar reasignación

interface AreaLite {
  nombre: string;
  descripcion?: string | null;
}

interface ClasificacionLite {
  nombre: string;
  color: string;
}

interface IncidenciaClasRelacion {
  id: string;
  clasificaciones: {
    id: string;
    nombre: string;
    color: string;
  };
}

interface IncidenciaAsignada {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad | string;
  estado: EstadoTecnico | string;
  area_id: string | null;
  clasificacion_id: string | null;
  observaciones: string | null;
  tiempo_minutos: number | null;
  fecha_incidencia: string;
  created_at: string;

  areas?: AreaLite | null;
  clasificaciones?: ClasificacionLite | null;
  incidencia_clasificaciones?: IncidenciaClasRelacion[];
  imagenes_incidencias?: ImagenIncidencia[];
}

interface HistorialEstado {
  id: string;
  incidencia_id: string;
  estado: string;
  comentario: string | null;
  cambiado_por: string | null;
  fecha_cambio: string;
}

// Colores de prioridad (semáforo)
const getPrioridadColor = (prioridad: Prioridad | string) => {
  switch (prioridad) {
    case "critica":
      return "bg-red-600";
    case "alta":
      return "bg-amber-500";
    case "media":
      return "bg-amber-300";
    case "baja":
      return "bg-emerald-600";
    default:
      return "bg-slate-500";
  }
};

const formatFechaHora = (value?: string | null) =>
  value
    ? format(new Date(value), "dd/MM/yyyy HH:mm", { locale: es })
    : "Sin fecha";

/* =========================================================
   Componente
   ========================================================= */

const MisIncidenciasAsignadasView = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  // Seguimiento / cambio de estado
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [incidenciaSeguimiento, setIncidenciaSeguimiento] =
    useState<IncidenciaAsignada | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<string>("");
  const [comentarioEstado, setComentarioEstado] = useState("");

  // Cierre de incidencia (comentario obligatorio)
  const [isCloseDialogOpen, setIsCloseDialogOpen] = useState(false);
  const [incidenciaCerrar, setIncidenciaCerrar] =
    useState<IncidenciaAsignada | null>(null);
  const [comentarioCierre, setComentarioCierre] = useState("");

  if (!profile) {
    return (
      <Card className="border border-emerald-100 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-white via-emerald-50 to-white border-b border-emerald-100">
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <User className="h-5 w-5 text-emerald-700" />
            Mis incidencias asignadas
          </CardTitle>
        </CardHeader>
        <CardContent className="py-6">
          <p className="text-sm text-slate-600">
            Debes iniciar sesión para ver tus incidencias asignadas.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* =========================================================
     Query incidencias asignadas al técnico (solo visible = true)
     ========================================================= */

  const {
    data: incidencias = [],
    isLoading,
    refetch,
  } = useQuery<IncidenciaAsignada[]>({
    queryKey: ["incidencias-asignadas", profile.id],
    enabled: !!profile?.id,
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
          imagenes_incidencias(id, url_imagen, nombre_archivo, tipo_archivo)
        `
        )
        .eq("responsable_id", profile.id)
        .eq("visible", true) // SOLO incidencias visibles
        .in("estado", [
          "asignada",
          "en_curso",
          "en_pausa",
          "en_espera_info",
          "cerrada",
          "rechazada",
          "reasignar", // incluir también las que están en solicitud de reasignación
        ])
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching incidencias asignadas:", error);
        throw error;
      }

      return (data || []) as IncidenciaAsignada[];
    },
  });

  const pendientes = useMemo(
    () =>
      incidencias.filter(
        (i) => i.estado !== "cerrada" && i.estado !== "rechazada"
      ),
    [incidencias]
  );

  const cerradas = useMemo(
    () => incidencias.filter((i) => i.estado === "cerrada"),
    [incidencias]
  );

  /* =========================================================
     Query historial de estados (cuando hay incidencia seleccionada)
     ========================================================= */

  const {
    data: historialEstados = [],
    isLoading: loadingHistorial,
  } = useQuery<HistorialEstado[]>({
    queryKey: ["historial-incidencia", incidenciaSeguimiento?.id],
    enabled: !!incidenciaSeguimiento?.id && isStatusDialogOpen,
    queryFn: async () => {
      if (!incidenciaSeguimiento?.id) return [];
      const { data, error } = await supabase
        .from("incidencia_historial_estados")
        .select("*")
        .eq("incidencia_id", incidenciaSeguimiento.id)
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

  // Cerrar incidencia (desde botón externo, con comentario)
  const cerrarIncidencia = useMutation({
    mutationFn: async (params: {
      incidenciaId: string;
      comentario: string;
    }) => {
      const { incidenciaId, comentario } = params;

      if (!comentario.trim()) {
        throw new Error(
          "Debes ingresar un comentario para cerrar la incidencia."
        );
      }

      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("incidencias")
        .update({
          estado: "cerrada",
          observaciones: comentario,
          updated_at: now,
        })
        .eq("id", incidenciaId)
        .eq("responsable_id", profile.id)
        .neq("estado", "cerrada");

      if (updateError) throw updateError;

      const { error: histError } = await supabase
        .from("incidencia_historial_estados")
        .insert([
          {
            incidencia_id: incidenciaId,
            estado: "cerrada",
            comentario,
            cambiado_por: profile.id,
            fecha_cambio: now,
          },
        ]);

      if (histError) throw histError;
    },
    onSuccess: (_data, variables) => {
      toast.success("Incidencia cerrada correctamente");
      setIsCloseDialogOpen(false);
      setIncidenciaCerrar(null);
      setComentarioCierre("");
      queryClient.invalidateQueries({
        queryKey: ["incidencias-asignadas", profile.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["historial-incidencia", variables.incidenciaId],
      });
    },
    onError: (error: any) => {
      console.error("Error cerrando incidencia:", error);
      toast.error(
        error?.message ||
          "Error al cerrar la incidencia. Verifica los datos."
      );
    },
  });

  // Cambiar estado desde diálogo de seguimiento (incluye 'reasignar')
  const actualizarEstadoIncidencia = useMutation({
    mutationFn: async (params: {
      incidenciaId: string;
      estado: string;
      comentario: string;
    }) => {
      const { incidenciaId, estado, comentario } = params;

      if (!estado) {
        throw new Error("Debes seleccionar un estado.");
      }
      if (!comentario.trim()) {
        throw new Error(
          "Debes ingresar un comentario para el cambio de estado."
        );
      }

      // El cierre sigue siendo desde el botón dedicado
      if (estado === "cerrada") {
        throw new Error(
          "El estado 'Cerrada' solo puede aplicarse desde el botón Cerrar incidencia."
        );
      }

      const now = new Date().toISOString();

      const { error: updateError } = await supabase
        .from("incidencias")
        .update({
          estado, // aquí puede ir 'en_curso', 'en_pausa', 'en_espera_info' o 'reasignar'
          updated_at: now,
        })
        .eq("id", incidenciaId)
        .eq("responsable_id", profile.id);

      if (updateError) throw updateError;

      const { error: histError } = await supabase
        .from("incidencia_historial_estados")
        .insert([
          {
            incidencia_id: incidenciaId,
            estado,
            comentario,
            cambiado_por: profile.id,
            fecha_cambio: now,
          },
        ]);

      if (histError) throw histError;
    },
    onSuccess: (_data, variables) => {
      toast.success("Estado actualizado correctamente");
      setComentarioEstado("");
      setNuevoEstado("");
      setIsStatusDialogOpen(false);
      setIncidenciaSeguimiento(null);

      queryClient.invalidateQueries({
        queryKey: ["incidencias-asignadas", profile.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["historial-incidencia", variables.incidenciaId],
      });
    },
    onError: (error: any) => {
      console.error("Error actualizando estado:", error);
      toast.error(
        error?.message || "Error al actualizar el estado de la incidencia."
      );
    },
  });

  /* =========================================================
     Helpers de UI
     ========================================================= */

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "asignada":
        return (
          <Badge className="border border-emerald-400 bg-emerald-50 text-emerald-800 flex items-center">
            <Clock className="w-3 h-3 mr-1 text-emerald-700" />
            Asignada
          </Badge>
        );
      case "en_curso":
        return (
          <Badge className="border border-emerald-500 bg-emerald-50 text-emerald-900 flex items-center">
            <Clock className="w-3 h-3 mr-1 text-emerald-800" />
            En curso
          </Badge>
        );
      case "en_pausa":
        return (
          <Badge className="border border-amber-400 bg-amber-50 text-amber-800 flex items-center">
            <Clock className="w-3 h-3 mr-1 text-amber-700" />
            En pausa
          </Badge>
        );
      case "en_espera_info":
        return (
          <Badge className="border border-slate-400 bg-slate-50 text-slate-800 flex items-center">
            <Clock className="w-3 h-3 mr-1 text-slate-700" />
            En espera de info
          </Badge>
        );
      case "cerrada":
        return (
          <Badge className="border border-emerald-600 bg-emerald-50 text-emerald-900 flex items-center">
            <CheckCircle className="w-3 h-3 mr-1 text-emerald-700" />
            Cerrada
          </Badge>
        );
      case "rechazada":
        return (
          <Badge className="border border-red-500 bg-red-50 text-red-700 flex items-center">
            Rechazada
          </Badge>
        );
      case "reasignar":
        return (
          <Badge className="border border-sky-500 bg-sky-50 text-sky-800 flex items-center">
            Reasignar
          </Badge>
        );
      default:
        return (
          <Badge className="border border-slate-300 bg-slate-50 text-slate-800">
            {estado}
          </Badge>
        );
    }
  };

  const abrirDialogoSeguimiento = (incidencia: IncidenciaAsignada) => {
    setIncidenciaSeguimiento(incidencia);
    setComentarioEstado("");
    setNuevoEstado("");
    setIsStatusDialogOpen(true);
  };

  const handleConfirmarCambioEstado = () => {
    if (!incidenciaSeguimiento) return;
    actualizarEstadoIncidencia.mutate({
      incidenciaId: incidenciaSeguimiento.id,
      estado: nuevoEstado,
      comentario: comentarioEstado.trim(),
    });
  };

  const abrirDialogoCerrar = (incidencia: IncidenciaAsignada) => {
    setIncidenciaCerrar(incidencia);
    setComentarioCierre("");
    setIsCloseDialogOpen(true);
  };

  const handleConfirmarCierre = () => {
    if (!incidenciaCerrar) return;
    cerrarIncidencia.mutate({
      incidenciaId: incidenciaCerrar.id,
      comentario: comentarioCierre.trim(),
    });
  };

  /* =========================================================
     Render
     ========================================================= */

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card
            key={i}
            className="animate-pulse border border-emerald-50 shadow-sm"
          >
            <CardContent className="pt-6">
              <div className="h-4 bg-emerald-50 rounded w-3/4 mb-2" />
              <div className="h-4 bg-emerald-50 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header principal */}
      <Card className="border border-emerald-100 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-white via-emerald-50 to-white border-b border-emerald-100">
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <User className="h-5 w-5 text-emerald-700" />
            Mis incidencias asignadas
          </CardTitle>
          <CardDescription className="text-slate-600">
            Incidencias asignadas al usuario{" "}
            <span className="font-semibold text-emerald-900">
              {profile.full_name || profile.email}
            </span>
            .
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <Badge className="bg-emerald-50 text-emerald-900 border border-emerald-200">
                Total: {incidencias.length}
              </Badge>
              <Badge className="bg-amber-50 text-amber-800 border border-amber-200">
                Abiertas: {pendientes.length}
              </Badge>
              <Badge className="bg-slate-50 text-slate-800 border border-slate-200">
                Cerradas: {cerradas.length}
              </Badge>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="border-emerald-300 text-emerald-800 hover:bg-emerald-50"
            >
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de incidencias */}
      {incidencias.length > 0 ? (
        <div className="space-y-4">
          {incidencias.map((incidencia) => (
            <Card
              key={incidencia.id}
              className="hover:shadow-md transition-shadow border border-slate-200 hover:border-emerald-300"
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-start mb-4 gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-2 text-slate-900">
                      {incidencia.titulo}
                    </h3>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {/* Área */}
                      <Badge className="border border-slate-200 bg-slate-50 text-slate-800 flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-slate-600" />
                        {incidencia.areas?.nombre || "Sin área"}
                      </Badge>

                      {/* Clasificaciones múltiples o simple */}
                      {incidencia.incidencia_clasificaciones &&
                      incidencia.incidencia_clasificaciones.length > 0 ? (
                        incidencia.incidencia_clasificaciones.map((rel) => (
                          <Badge
                            key={rel.id}
                            className="border bg-white text-slate-800"
                            style={{
                              borderColor:
                                rel.clasificaciones?.color || "#CBD5F5",
                              color:
                                rel.clasificaciones?.color || "#111827",
                            }}
                          >
                            {rel.clasificaciones?.nombre}
                          </Badge>
                        ))
                      ) : (
                        <Badge
                          className="border bg-white text-slate-800"
                          style={{
                            borderColor:
                              incidencia.clasificaciones?.color || "#CBD5F5",
                            color:
                              incidencia.clasificaciones?.color || "#111827",
                          }}
                        >
                          {incidencia.clasificaciones?.nombre ||
                            "Sin clasificación"}
                        </Badge>
                      )}

                      {/* Prioridad */}
                      <Badge
                        className={`text-white flex items-center ${getPrioridadColor(
                          incidencia.prioridad
                        )}`}
                      >
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        {incidencia.prioridad}
                      </Badge>

                      {/* Estado */}
                      {getEstadoBadge(incidencia.estado)}
                    </div>
                  </div>

                  <div className="text-right text-xs sm:text-sm text-slate-500 space-y-1">
                    <p className="flex items-center gap-1 justify-end">
                      <Calendar className="w-3 h-3" />
                      {formatFechaHora(incidencia.fecha_incidencia)}
                    </p>
                    <p className="flex items-center gap-1 justify-end">
                      <Clock className="w-3 h-3" />
                      Creada:{" "}
                      {format(
                        new Date(incidencia.created_at),
                        "dd/MM/yyyy",
                        { locale: es }
                      )}
                    </p>
                  </div>
                </div>

                {/* Descripción */}
                <p className="text-slate-700 mb-3">
                  {incidencia.descripcion}
                </p>

                {/* Observaciones */}
                {incidencia.observaciones && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg mb-3 text-sm text-slate-800">
                    <strong className="text-slate-900">
                      Observaciones / Comentarios:
                    </strong>{" "}
                    {incidencia.observaciones}
                  </div>
                )}

                {/* Tiempo reportado (opcional) */}
                {typeof incidencia.tiempo_minutos === "number" && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg mb-3 text-sm text-emerald-900">
                    <strong>Tiempo estimado / invertido:</strong>{" "}
                    {incidencia.tiempo_minutos} minutos
                  </div>
                )}

                {/* Evidencias */}
                {incidencia.imagenes_incidencias &&
                  incidencia.imagenes_incidencias.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-slate-800 mb-2">
                        Evidencia multimedia (
                        {incidencia.imagenes_incidencias.length} archivos)
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {incidencia.imagenes_incidencias.map((img) => {
                          const isVideo =
                            img.tipo_archivo?.startsWith("video/");
                          return (
                            <div key={img.id} className="relative">
                              {isVideo ? (
                                <div className="w-full h-20 bg-slate-100 rounded flex items-center justify-center text-xs text-slate-500">
                                  Video
                                </div>
                              ) : (
                                <a
                                  href={img.url_imagen}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  <img
                                    src={img.url_imagen}
                                    alt={img.nombre_archivo || "Evidencia"}
                                    className="w-full h-20 object-cover rounded border border-slate-200"
                                  />
                                </a>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Botones de acción */}
                <div className="flex flex-col md:flex-row gap-2 pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-300 text-slate-800 hover:border-emerald-400 hover:bg-emerald-50"
                    onClick={() => abrirDialogoSeguimiento(incidencia)}
                  >
                    <ListChecks className="w-4 h-4 mr-2" />
                    Seguimiento / cambiar estado
                  </Button>

                  <Button
                    className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white"
                    disabled={incidencia.estado === "cerrada"}
                    onClick={() => abrirDialogoCerrar(incidencia)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Cerrar incidencia
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border border-emerald-100">
          <CardContent className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
            <p className="text-slate-600">
              No tienes incidencias asignadas en este momento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* DIALOGO SEGUIMIENTO / CAMBIO DE ESTADO */}
      <Dialog
        open={isStatusDialogOpen}
        onOpenChange={(open) => {
          setIsStatusDialogOpen(open);
          if (!open) {
            setIncidenciaSeguimiento(null);
            setComentarioEstado("");
            setNuevoEstado("");
          }
        }}
      >
        <DialogContent className="max-w-3xl border border-emerald-100">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              Seguimiento de incidencia
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Visualiza el historial de estados y actualiza el estado actual con
              un comentario técnico.
            </DialogDescription>
          </DialogHeader>

          {incidenciaSeguimiento && (
            <div className="space-y-4 mb-4">
              {/* Info básica */}
              <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-sm space-y-1 text-emerald-900">
                <p>
                  <span className="font-semibold">Título:</span>{" "}
                  {incidenciaSeguimiento.titulo}
                </p>
                <p>
                  <span className="font-semibold">Área:</span>{" "}
                  {incidenciaSeguimiento.areas?.nombre || "Sin área"}
                </p>
                <p>
                  <span className="font-semibold">Estado actual:</span>{" "}
                  {incidenciaSeguimiento.estado}
                </p>
              </div>

              {/* Historial */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">
                  Historial de estados
                </p>
                <div className="border rounded-lg max-h-64 overflow-y-auto border-slate-200">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-3 py-2 text-left w-32 text-slate-700">
                          Estado
                        </th>
                        <th className="px-3 py-2 text-left w-40 text-slate-700">
                          Hora
                        </th>
                        <th className="px-3 py-2 text-left text-slate-700">
                          Comentario
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingHistorial ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-4 text-center text-slate-500"
                          >
                            Cargando historial...
                          </td>
                        </tr>
                      ) : historialEstados.length === 0 ? (
                        <tr>
                          <td
                            colSpan={3}
                            className="px-3 py-4 text-center text-slate-500"
                          >
                            No hay registros de historial aún.
                          </td>
                        </tr>
                      ) : (
                        historialEstados.map((h) => (
                          <tr key={h.id} className="border-t border-slate-100">
                            <td className="px-3 py-2 capitalize text-slate-800">
                              {h.estado}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {h.fecha_cambio
                                ? format(
                                    new Date(h.fecha_cambio),
                                    "dd/MM/yyyy HH:mm",
                                    { locale: es }
                                  )
                                : "-"}
                            </td>
                            <td className="px-3 py-2 text-slate-700">
                              {h.comentario || "-"}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Formulario de nuevo estado */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-800">
                  Actualizar estado de la incidencia
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Nuevo estado
                    </label>
                    <Select
                      value={nuevoEstado}
                      onValueChange={setNuevoEstado}
                    >
                      <SelectTrigger className="border-slate-300 focus-visible:ring-emerald-500">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* NO incluimos 'cerrada' aquí, eso se hace desde el botón Cerrar incidencia */}
                        <SelectItem value="en_curso">En curso</SelectItem>
                        <SelectItem value="en_pausa">En pausa</SelectItem>
                        <SelectItem value="en_espera_info">
                          En espera de información
                        </SelectItem>
                        <SelectItem value="reasignar">
                          Reasignar
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="md:col-span-2 space-y-1">
                    <label className="text-xs font-medium text-slate-700">
                      Comentario técnico
                    </label>
                    <Textarea
                      rows={3}
                      value={comentarioEstado}
                      onChange={(e) => setComentarioEstado(e.target.value)}
                      placeholder="Describe el motivo del cambio de estado, acciones realizadas, bloqueos, etc. Si solicitas reasignar, indica el motivo."
                      className="border-slate-300 focus-visible:ring-emerald-500"
                    />
                    <p className="text-[11px] text-slate-500">
                      Este comentario quedará registrado en el historial de la
                      incidencia.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarCambioEstado}
              disabled={actualizarEstadoIncidencia.isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {actualizarEstadoIncidencia.isPending
                ? "Guardando..."
                : "Guardar cambio de estado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOGO CIERRE DE INCIDENCIA */}
      <Dialog
        open={isCloseDialogOpen}
        onOpenChange={(open) => {
          setIsCloseDialogOpen(open);
          if (!open) {
            setIncidenciaCerrar(null);
            setComentarioCierre("");
          }
        }}
      >
        <DialogContent className="max-w-lg border border-emerald-100">
          <DialogHeader>
            <DialogTitle className="text-emerald-900">
              Cerrar incidencia
            </DialogTitle>
            <DialogDescription className="text-slate-600">
              Añade un comentario de cierre que justifique la finalización de la
              incidencia.
            </DialogDescription>
          </DialogHeader>

          {incidenciaCerrar && (
            <div className="space-y-2 mb-4 text-sm bg-emerald-50 border border-emerald-100 rounded-lg p-3">
              <p className="text-emerald-900">
                <span className="font-semibold">Título:</span>{" "}
                {incidenciaCerrar.titulo}
              </p>
              <p className="text-emerald-900">
                <span className="font-semibold">Área:</span>{" "}
                {incidenciaCerrar.areas?.nombre || "Sin área"}
              </p>
              <p className="text-emerald-900">
                <span className="font-semibold">Estado actual:</span>{" "}
                {incidenciaCerrar.estado}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-800">
              Comentario de cierre (obligatorio)
            </label>
            <Textarea
              rows={5}
              value={comentarioCierre}
              onChange={(e) => setComentarioCierre(e.target.value)}
              placeholder="Describe el diagnóstico final, solución aplicada o motivo del cierre."
              className="border-slate-300 focus-visible:ring-emerald-500"
            />
            <p className="text-xs text-slate-500">
              Este comentario se registrará en el historial de la incidencia y
              en las observaciones.
            </p>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsCloseDialogOpen(false)}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarCierre}
              disabled={cerrarIncidencia.isPending}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              {cerrarIncidencia.isPending
                ? "Cerrando..."
                : "Confirmar cierre"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MisIncidenciasAsignadasView;