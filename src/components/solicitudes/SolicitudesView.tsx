import { useMemo, useState } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  User,
  Calendar,
  Loader2,
} from "lucide-react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

/* =========================================================
   Tipos y constantes
   ========================================================= */

export const ESTADOS = {
  PENDIENTE: "pendiente",
  ASIGNADA: "asignada",
  EN_CURSO: "en_curso",
  EN_PAUSA: "en_pausa",
  EN_ESPERA_INFO: "en_espera_info",
  CERRADA: "cerrada",
  RESUELTA: "resuelta",
  // REABIERTA: "reabierta",
} as const;

export type EstadoIncidenciaBase = (typeof ESTADOS)[keyof typeof ESTADOS];

// Estados que pueden existir en la tabla (incluye legacy / adicionales)
export type EstadoIncidencia =
  | EstadoIncidenciaBase
  | "borrador"
  | "en_ejecucion"
  | "en_progreso"
  | "reabierta"
  | "rechazada"
  | "rechazado";

export type Prioridad = "baja" | "media" | "alta" | "critica";

export interface Incidencia {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  estado: EstadoIncidencia;
  area_id: string | null;
  responsable_id: string | null;
  reportado_por: string | null;
  fecha_incidencia: string | null;
  tiempo_minutos: number | null;
  observaciones: string | null;
  created_at: string;
  fecha_cierre?: string | null;

  areas?: {
    nombre: string;
  };

  clasificaciones?: {
    nombre: string;
    color: string;
  };

  incidencia_clasificaciones?: {
    id: string;
    clasificaciones: {
      id: string;
      nombre: string;
      color: string;
    };
  }[];

  imagenes_incidencias?: {
    id: string;
    url_imagen: string;
    nombre_archivo: string | null;
    tipo_archivo: string | null;
  }[];
}

export interface PerfilBasico {
  id: string;
  full_name: string | null;
  email: string | null;
}

export interface HistorialEstado {
  id: string;
  incidencia_id: string;
  estado: EstadoIncidencia;
  comentario: string | null;
  cambiado_por: string | null;
  fecha_cambio: string;
  tiempo_minutos: number | null;
}

// Estados disponibles para el combo de "Registrar cambio de estado"
const ESTADOS_POSIBLES: EstadoIncidencia[] = [
  ESTADOS.PENDIENTE,
  ESTADOS.ASIGNADA,
  ESTADOS.EN_CURSO,
  ESTADOS.EN_PAUSA,
  ESTADOS.EN_ESPERA_INFO,
  ESTADOS.CERRADA,
  ESTADOS.RESUELTA,
  "reabierta",
];

// Estados que consideramos "en ejecución" para la tarjeta de estadísticas y tab
const ESTADOS_EN_EJECUCION: EstadoIncidencia[] = [
  ESTADOS.ASIGNADA,
  ESTADOS.EN_CURSO,
  ESTADOS.EN_PAUSA,
  ESTADOS.EN_ESPERA_INFO,
  "en_ejecucion",
  "en_progreso",
  "reabierta",
];

// Estados que consideramos rechazados
const ESTADOS_RECHAZADAS: EstadoIncidencia[] = ["rechazada", "rechazado"];

/* =========================================================
   Helpers
   ========================================================= */

// Paleta alineada a UltraVal (verde/blanco/negro + semáforo de riesgo)
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

const ESTADO_LABELS: Record<string, string> = {
  pendiente: "Re asignar", // mostrar diferente pero guardar "pendiente"
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

/* =========================================================
   Hook: obtener incidencias
   ========================================================= */

const useIncidencias = () => {
  return useQuery<Incidencia[]>({
    queryKey: ["incidencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("incidencias")
        .select(
          `
          *,
          areas!incidencias_area_id_fkey(nombre),
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
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching incidencias:", error);
        throw error;
      }

      return (data || []) as Incidencia[];
    },
  });
};

/* =========================================================
   Card de Incidencia (lista principal)
   ========================================================= */

interface IncidenciaCardProps {
  incidencia: Incidencia;
  onClick: (incidencia: Incidencia) => void;
}

const IncidenciaCard = ({ incidencia, onClick }: IncidenciaCardProps) => {
  return (
    <Card
      className="hover:shadow-md transition-shadow cursor-pointer border border-slate-200 hover:border-emerald-300"
      onClick={() => onClick(incidencia)}
    >
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4 gap-4">
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-2 text-slate-900">
              {incidencia.titulo}
            </h3>

            <div className="flex flex-wrap gap-2 mb-3">
              {/* Área */}
              {incidencia.areas?.nombre && (
                <Badge className="border border-slate-200 bg-slate-50 text-slate-800 flex items-center">
                  <MapPin className="w-3 h-3 mr-1 text-slate-600" />
                  {incidencia.areas.nombre}
                </Badge>
              )}

              {/* Clasificaciones múltiples o única */}
              {incidencia.incidencia_clasificaciones &&
              incidencia.incidencia_clasificaciones.length > 0 ? (
                incidencia.incidencia_clasificaciones.map((rel) => (
                  <Badge
                    key={rel.id}
                    className="border bg-white text-slate-800"
                    style={{
                      borderColor: rel.clasificaciones?.color,
                      color: rel.clasificaciones?.color,
                    }}
                  >
                    {rel.clasificaciones?.nombre}
                  </Badge>
                ))
              ) : incidencia.clasificaciones ? (
                <Badge
                  className="border bg-white text-slate-800"
                  style={{
                    borderColor: incidencia.clasificaciones?.color,
                    color: incidencia.clasificaciones?.color,
                  }}
                >
                  {incidencia.clasificaciones?.nombre}
                </Badge>
              ) : null}

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
              <Badge className="capitalize bg-emerald-50 border border-emerald-200 text-emerald-900">
                {formatEstado(incidencia.estado)}
              </Badge>
            </div>
          </div>

          {/* Fecha + reportante */}
          <div className="text-right text-xs sm:text-sm text-slate-500 space-y-1">
            {incidencia.fecha_incidencia && (
              <p className="flex items-center gap-1 justify-end">
                <Calendar className="w-3 h-3" />
                {formatFechaHora(incidencia.fecha_incidencia)}
              </p>
            )}
            <p className="flex items-center gap-1 justify-end">
              <User className="w-3 h-3" />
              {incidencia.reportado_por
                ? `Reportado por: ${incidencia.reportado_por}`
                : "Sin reportante"}
            </p>
          </div>
        </div>

        {/* Descripción */}
        <p className="text-slate-700 mb-3 line-clamp-3">
          {incidencia.descripcion}
        </p>

        {/* Observaciones */}
        {incidencia.observaciones && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg mb-3 text-sm text-slate-800">
            <strong className="text-slate-900">Observaciones:</strong>{" "}
            {incidencia.observaciones}
          </div>
        )}

        {/* Tiempo */}
        {typeof incidencia.tiempo_minutos === "number" && (
          <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg mb-1 text-sm text-emerald-900">
            <strong>Tiempo estimado:</strong> {incidencia.tiempo_minutos}{" "}
            minutos
          </div>
        )}
      </CardContent>
    </Card>
  );
};

/* =========================================================
   Vista principal: gestión de incidencias + diálogo detalle
   ========================================================= */

export const SolicitudesView = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  const { data: incidencias = [], isLoading } = useIncidencias();

  // Perfiles para mostrar nombres (reportado_por, responsable, cambiado_por)
  const { data: perfiles = [] } = useQuery<PerfilBasico[]>({
    queryKey: ["profiles-basicos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email");
      if (error) throw error;
      return (data || []) as PerfilBasico[];
    },
  });

  const perfilesPorId = useMemo(() => {
    const map: Record<string, PerfilBasico> = {};
    perfiles.forEach((p) => {
      map[p.id] = p;
    });
    return map;
  }, [perfiles]);

  // incidencia seleccionada para el diálogo
  const [selectedIncidencia, setSelectedIncidencia] =
    useState<Incidencia | null>(null);

  // estado del formulario de cambio de estado
  const [nuevoEstado, setNuevoEstado] = useState<EstadoIncidencia | "">("");
  const [comentarioEstado, setComentarioEstado] = useState("");
  const [tiempoCambio, setTiempoCambio] = useState<string>("");

  // Historial de estados de la incidencia seleccionada
  const {
    data: historialEstados = [],
    isLoading: isLoadingHistorial,
  } = useQuery<HistorialEstado[]>({
    queryKey: ["historial-incidencia", selectedIncidencia?.id],
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
          fecha_cambio,
          tiempo_minutos
        `
        )
        .eq("incidencia_id", selectedIncidencia.id)
        .order("fecha_cambio", { ascending: true });

      if (error) {
        console.error("Error fetching historial estados:", error);
        throw error;
      }

      return (data || []) as HistorialEstado[];
    },
    enabled: !!selectedIncidencia?.id,
  });

  // Mutación para registrar cambio de estado
  const registrarCambioEstado = useMutation({
    mutationFn: async (params: {
      incidenciaId: string;
      nuevoEstado: EstadoIncidencia;
      comentario: string;
      tiempoMinutos: number | null;
    }) => {
      const { incidenciaId, nuevoEstado, comentario, tiempoMinutos } = params;

      if (!profile?.id) {
        throw new Error("Usuario no autenticado para registrar el cambio.");
      }

      const now = new Date().toISOString();

      // 1) Inserta en historial
      const { error: histError } = await supabase
        .from("incidencia_historial_estados")
        .insert({
          incidencia_id: incidenciaId,
          estado: nuevoEstado,
          comentario,
          cambiado_por: profile.id,
          fecha_cambio: now,
          tiempo_minutos: tiempoMinutos,
        });

      if (histError) throw histError;

      // 2) Actualiza estado actual de la incidencia
      const updateFields: Partial<Incidencia> = {
        estado: nuevoEstado,
      };

      if (nuevoEstado === ESTADOS.CERRADA || nuevoEstado === ESTADOS.RESUELTA) {
        updateFields.fecha_cierre = now;
      }

      const { error: incError } = await supabase
        .from("incidencias")
        .update(updateFields)
        .eq("id", incidenciaId);

      if (incError) throw incError;
    },
    onSuccess: () => {
      toast.success("Estado actualizado correctamente");
      // refrescar incidencias e historial
      queryClient.invalidateQueries({ queryKey: ["incidencias"] });
      if (selectedIncidencia?.id) {
        queryClient.invalidateQueries({
          queryKey: ["historial-incidencia", selectedIncidencia.id],
        });
      }
      // limpiar formulario
      setComentarioEstado("");
      setTiempoCambio("");
      setNuevoEstado("");
    },
    onError: (error) => {
      console.error("Error registrando cambio de estado:", error);
      toast.error("No se pudo registrar el cambio de estado");
    },
  });

  const handleRegistrarEstado = () => {
    if (!selectedIncidencia) return;

    if (!nuevoEstado) {
      toast.error("Selecciona un nuevo estado");
      return;
    }

    if (!comentarioEstado.trim()) {
      toast.error("Ingresa un comentario para justificar el estado");
      return;
    }

    if (selectedIncidencia.estado === nuevoEstado) {
      toast.error("El nuevo estado debe ser diferente al actual");
      return;
    }

    if (tiempoCambio && Number(tiempoCambio) < 0) {
      toast.error("El tiempo no puede ser negativo");
      return;
    }

    registrarCambioEstado.mutate({
      incidenciaId: selectedIncidencia.id,
      nuevoEstado,
      comentario: comentarioEstado.trim(),
      tiempoMinutos: tiempoCambio
        ? Number.isNaN(Number(tiempoCambio))
          ? null
          : Number(tiempoCambio)
        : null,
    });
  };

  const handleOpenDetail = (incidencia: Incidencia) => {
    setSelectedIncidencia(incidencia);
    // al abrir, sugerimos el estado actual como valor inicial
    setNuevoEstado(incidencia.estado);
    setComentarioEstado("");
    setTiempoCambio("");
  };

  const handleCloseDetail = () => {
    setSelectedIncidencia(null);
    setNuevoEstado("");
    setComentarioEstado("");
    setTiempoCambio("");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Agrupación por estado
  const incidenciasPendientes = incidencias.filter(
    (i) => i.estado === "borrador" || i.estado === ESTADOS.PENDIENTE
  );

  const incidenciasEnEjecucion = incidencias.filter((i) =>
    ESTADOS_EN_EJECUCION.includes(i.estado)
  );

  const incidenciasCerradas = incidencias.filter((i) =>
    [ESTADOS.CERRADA, ESTADOS.RESUELTA].includes(i.estado)
  );

  const incidenciasRechazadas = incidencias.filter((i) =>
    ESTADOS_RECHAZADAS.includes(i.estado)
  );

  // Datos para el encabezado del diálogo
  const reporter =
    selectedIncidencia?.reportado_por &&
    perfilesPorId[selectedIncidencia.reportado_por as string];

  const responsable =
    selectedIncidencia?.responsable_id &&
    perfilesPorId[selectedIncidencia.responsable_id as string];

  const ultimoHistorialId =
    historialEstados.length > 0
      ? historialEstados[historialEstados.length - 1].id
      : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">
            Incidencias
          </h1>
          <p className="text-slate-600">
            Gestión y seguimiento centralizado de incidencias
          </p>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pendientes */}
        <Card className="border border-emerald-50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-white via-amber-50 to-white">
            <div>
              <CardTitle className="text-sm font-medium text-slate-900">
                Pendientes / Borrador
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Sin asignar o en revisión
              </CardDescription>
            </div>
            <Clock className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">
              {incidenciasPendientes.length}
            </div>
          </CardContent>
        </Card>

        {/* Asignadas / En ejecución */}
        <Card className="border border-emerald-50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-white via-emerald-50 to-white">
            <div>
              <CardTitle className="text-sm font-medium text-slate-900">
                Asignadas / En seguimiento
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Con responsable atendiendo
              </CardDescription>
            </div>
            <CheckCircle className="h-4 w-4 text-emerald-700" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-800">
              {incidenciasEnEjecucion.length}
            </div>
          </CardContent>
        </Card>

        {/* Cerradas */}
        <Card className="border border-slate-100 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-white via-slate-50 to-white">
            <div>
              <CardTitle className="text-sm font-medium text-slate-900">
                Cerradas / Resueltas
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Atendidas y finalizadas
              </CardDescription>
            </div>
            <CheckCircle className="h-4 w-4 text-slate-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-700">
              {incidenciasCerradas.length}
            </div>
          </CardContent>
        </Card>

        {/* Rechazadas */}
        <Card className="border border-red-50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 bg-gradient-to-r from-white via-red-50 to-white">
            <div>
              <CardTitle className="text-sm font-medium text-slate-900">
                Rechazadas
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Incidencias descartadas
              </CardDescription>
            </div>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {incidenciasRechazadas.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs por estado */}
      <Tabs defaultValue="todas" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-emerald-50/70 border border-emerald-100 rounded-lg p-1">
          <TabsTrigger
            value="todas"
            className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md"
          >
            Todas
          </TabsTrigger>
          <TabsTrigger
            value="pendientes"
            className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md"
          >
            Pendientes
          </TabsTrigger>
          <TabsTrigger
            value="en_ejecucion"
            className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md"
          >
            Asignadas
          </TabsTrigger>
          <TabsTrigger
            value="cerradas"
            className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md"
          >
            Cerradas
          </TabsTrigger>
          <TabsTrigger
            value="rechazadas"
            className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md"
          >
            Rechazadas
          </TabsTrigger>
        </TabsList>

        {/* Todas */}
        <TabsContent value="todas" className="space-y-4 mt-4">
          {incidencias.length === 0 ? (
            <Card className="border border-emerald-50">
              <CardContent className="pt-6">
                <div className="text-center text-slate-500">
                  No hay incidencias registradas
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {incidencias.map((inc) => (
                <IncidenciaCard
                  key={inc.id}
                  incidencia={inc}
                  onClick={handleOpenDetail}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Pendientes */}
        <TabsContent value="pendientes" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {incidenciasPendientes.map((inc) => (
              <IncidenciaCard
                key={inc.id}
                incidencia={inc}
                onClick={handleOpenDetail}
              />
            ))}
          </div>
        </TabsContent>

        {/* Asignadas */}
        <TabsContent value="en_ejecucion" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {incidenciasEnEjecucion.map((inc) => (
              <IncidenciaCard
                key={inc.id}
                incidencia={inc}
                onClick={handleOpenDetail}
              />
            ))}
          </div>
        </TabsContent>

        {/* Cerradas */}
        <TabsContent value="cerradas" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {incidenciasCerradas.map((inc) => (
              <IncidenciaCard
                key={inc.id}
                incidencia={inc}
                onClick={handleOpenDetail}
              />
            ))}
          </div>
        </TabsContent>

        {/* Rechazadas */}
        <TabsContent value="rechazadas" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {incidenciasRechazadas.map((inc) => (
              <IncidenciaCard
                key={inc.id}
                incidencia={inc}
                onClick={handleOpenDetail}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Diálogo de detalle de incidencia */}
      <Dialog
        open={!!selectedIncidencia}
        onOpenChange={(open) => {
          if (!open) handleCloseDetail();
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border border-emerald-100">
          {selectedIncidencia && (
            <>
              <DialogHeader>
                <DialogTitle className="text-emerald-900">
                  {selectedIncidencia.titulo}
                </DialogTitle>
                <DialogDescription className="text-slate-600">
                  Detalle y seguimiento de la incidencia.
                </DialogDescription>
              </DialogHeader>

              {/* Header con badges e info clave */}
              <div className="mt-2 mb-4 border border-emerald-100 rounded-lg p-3 bg-emerald-50/70">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={`text-white flex items-center ${getPrioridadColor(
                        selectedIncidencia.prioridad
                      )}`}
                    >
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {selectedIncidencia.prioridad}
                    </Badge>
                    <Badge className="capitalize bg-white border border-emerald-200 text-emerald-900">
                      {formatEstado(selectedIncidencia.estado)}
                    </Badge>
                    {selectedIncidencia.areas?.nombre && (
                      <Badge className="border border-slate-200 bg-slate-50 text-slate-800 flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-slate-600" />
                        {selectedIncidencia.areas.nombre}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs md:text-sm text-slate-700">
                  <p className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>
                      Reportada:{" "}
                      {formatFechaHora(selectedIncidencia.fecha_incidencia)}
                    </span>
                  </p>
                  <p className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>
                      Reportado por:{" "}
                      {reporter?.full_name ||
                        reporter?.email ||
                        selectedIncidencia.reportado_por ||
                        "Desconocido"}
                    </span>
                  </p>
                  <p className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    <span>
                      Responsable:{" "}
                      {responsable?.full_name ||
                        responsable?.email ||
                        selectedIncidencia.responsable_id ||
                        "No asignado"}
                    </span>
                  </p>
                </div>
              </div>

              {/* Tabs internas: Resumen / Seguimiento / Evidencias */}
              <Tabs defaultValue="resumen" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-4 bg-slate-50 border border-slate-200 rounded-lg p-1">
                  <TabsTrigger
                    value="resumen"
                    className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md"
                  >
                    Resumen
                  </TabsTrigger>
                  <TabsTrigger
                    value="seguimiento"
                    className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md"
                  >
                    Seguimiento
                  </TabsTrigger>
                  <TabsTrigger
                    value="evidencias"
                    className="text-xs sm:text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-emerald-900 data-[state=active]:shadow-sm rounded-md"
                  >
                    Evidencias
                  </TabsTrigger>
                </TabsList>

                {/* RESUMEN */}
                <TabsContent value="resumen" className="space-y-4">
                  <Card className="border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-base text-slate-900">
                        Descripción de la incidencia
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-slate-700 whitespace-pre-line">
                        {selectedIncidencia.descripcion ||
                          "Sin descripción registrada."}
                      </p>
                    </CardContent>
                  </Card>

                  {selectedIncidencia.observaciones && (
                    <Card className="border border-slate-200">
                      <CardHeader>
                        <CardTitle className="text-base text-slate-900">
                          Observaciones iniciales
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-slate-700 whitespace-pre-line">
                          {selectedIncidencia.observaciones}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {typeof selectedIncidencia.tiempo_minutos === "number" && (
                    <Card className="border border-emerald-100 bg-emerald-50/60">
                      <CardHeader>
                        <CardTitle className="text-base text-emerald-900">
                          Tiempo estimado
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-emerald-900">
                          {selectedIncidencia.tiempo_minutos} minutos
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* SEGUIMIENTO */}
                <TabsContent value="seguimiento" className="space-y-4">
                  <Card className="border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-base text-slate-900">
                        Historial de estados
                      </CardTitle>
                      <CardDescription className="text-slate-600">
                        Cada cambio de estado queda registrado con fecha,
                        usuario y comentario.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isLoadingHistorial ? (
                        <div className="flex justify-center py-6">
                          <LoadingSpinner />
                        </div>
                      ) : historialEstados.length === 0 ? (
                        <p className="text-sm text-slate-600">
                          Aún no hay historial de estados para esta
                          incidencia.
                        </p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
                            <thead className="bg-slate-50">
                              <tr className="text-left text-slate-700">
                                <th className="px-3 py-2">Estado</th>
                                <th className="px-3 py-2">Fecha y hora</th>
                                <th className="px-3 py-2">Usuario</th>
                                <th className="px-3 py-2">Comentario</th>
                                <th className="px-3 py-2">
                                  Tiempo (min)
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {historialEstados.map((h) => {
                                const usuario =
                                  (h.cambiado_por &&
                                    perfilesPorId[
                                      h.cambiado_por as string
                                    ]) ||
                                  null;
                                const isUltimo = h.id === ultimoHistorialId;

                                return (
                                  <tr
                                    key={h.id}
                                    className={`border-t border-slate-100 align-top ${
                                      isUltimo ? "bg-emerald-50/60" : "bg-white"
                                    }`}
                                  >
                                    <td className="px-3 py-2 capitalize whitespace-nowrap text-slate-800">
                                      {formatEstado(h.estado)}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                                      {formatFechaHora(h.fecha_cambio)}
                                    </td>
                                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                                      {usuario?.full_name ||
                                        usuario?.email ||
                                        h.cambiado_por ||
                                        "-"}
                                    </td>
                                    <td className="px-3 py-2 text-slate-700">
                                      {h.comentario}
                                    </td>
                                    <td className="px-3 py-2 text-center whitespace-nowrap text-slate-700">
                                      {h.tiempo_minutos ?? "-"}
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

                  {/* Formulario para registrar nuevo estado */}
                  <Card className="border border-emerald-100">
                    <CardHeader>
                      <CardTitle className="text-base text-emerald-900">
                        Registrar cambio de estado
                      </CardTitle>
                      <CardDescription className="text-slate-600">
                        Actualiza el estado de la incidencia y deja
                        evidencia del seguimiento.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-800">
                            Nuevo estado
                          </label>
                          <Select
                            value={nuevoEstado}
                            onValueChange={(value) =>
                              setNuevoEstado(value as EstadoIncidencia)
                            }
                          >
                            <SelectTrigger className="border-slate-300 focus-visible:ring-emerald-500">
                              <SelectValue placeholder="Selecciona estado" />
                            </SelectTrigger>
                            <SelectContent>
                              {ESTADOS_POSIBLES.map((estado) => (
                                <SelectItem key={estado} value={estado}>
                                  {formatEstado(estado)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-slate-800">
                            Tiempo invertido (min)
                            <span className="text-xs text-slate-500">
                              {" "}
                              (opcional)
                            </span>
                          </label>
                          <Input
                            type="number"
                            min={0}
                            value={tiempoCambio}
                            onChange={(e) =>
                              setTiempoCambio(e.target.value)
                            }
                            className="border-slate-300 focus-visible:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-sm font-medium text-slate-800">
                          Comentario
                        </label>
                        <Textarea
                          rows={3}
                          placeholder="Describe brevemente qué se hizo o por qué se cambia el estado..."
                          value={comentarioEstado}
                          onChange={(e) =>
                            setComentarioEstado(e.target.value)
                          }
                          className="border-slate-300 focus-visible:ring-emerald-500"
                        />
                      </div>

                      <div className="flex justify-end">
                        <Button
                          onClick={handleRegistrarEstado}
                          disabled={registrarCambioEstado.isPending}
                          className="bg-emerald-700 hover:bg-emerald-800 text-white"
                        >
                          {registrarCambioEstado.isPending && (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          )}
                          Registrar cambio
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* EVIDENCIAS */}
                <TabsContent value="evidencias" className="space-y-4">
                  <Card className="border border-slate-200">
                    <CardHeader>
                      <CardTitle className="text-base text-slate-900">
                        Evidencias multimedia
                      </CardTitle>
                      <CardDescription className="text-slate-600">
                        Imágenes o videos adjuntos a la incidencia.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {selectedIncidencia.imagenes_incidencias &&
                      selectedIncidencia.imagenes_incidencias.length >
                        0 ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          {selectedIncidencia.imagenes_incidencias.map(
                            (img) => {
                              const isVideo =
                                img.tipo_archivo?.startsWith("video/");
                              return (
                                <div
                                  key={img.id}
                                  className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50"
                                >
                                  {isVideo ? (
                                    <div className="w-full h-24 bg-slate-100 flex items-center justify-center text-xs text-slate-500">
                                      Video adjunto
                                    </div>
                                  ) : (
                                    <img
                                      src={img.url_imagen}
                                      alt={img.nombre_archivo || "Evidencia"}
                                      className="w-full h-24 object-cover"
                                    />
                                  )}
                                  <div className="px-2 py-1 text-[11px] truncate text-slate-600 bg-white">
                                    {img.nombre_archivo || "Archivo"}
                                  </div>
                                </div>
                              );
                            }
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-600">
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
    </div>
  );
};
