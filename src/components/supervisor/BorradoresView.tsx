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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  CheckCircle,
  XCircle,
  Clock,
  User,
  Calendar,
  MapPin,
  AlertTriangle,
  Edit,
  Save,
  X,
} from "lucide-react";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

/* =========================================================
   Tipos y helpers compartidos
   ========================================================= */

export type Prioridad = "baja" | "media" | "alta" | "critica";

export interface Area {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

export interface Clasificacion {
  id: string;
  nombre: string;
  color: string;
  activo?: boolean;
}

export interface Sala {
  id: string;
  nombre: string;
  activo?: boolean;
}

export interface PerfilBasico {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

export interface ImagenIncidencia {
  id: string;
  url_imagen: string;
  nombre_archivo: string | null;
  tipo_archivo: string | null;
}

export interface IncidenciaPendiente {
  id: string;
  titulo: string;
  descripcion: string | null;
  prioridad: Prioridad;
  estado: string; // en esta vista solo usamos "pendiente"
  area_id: string | null;
  clasificacion_id: string | null;
  sala_id: string | null;
  observaciones: string | null;
  tiempo_minutos: number | null;
  fecha_incidencia: string | null;
  reportado_por: string | null;
  created_at: string;

  areas?: {
    nombre: string;
    descripcion?: string | null;
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

  imagenes_incidencias?: ImagenIncidencia[];
}

export interface HistorialEstado {
  id: string;
  incidencia_id: string;
  estado: string;
  comentario: string | null;
  cambiado_por: string | null;
  fecha_cambio: string;
  tiempo_minutos: number | null;
}

const getPrioridadColor = (prioridad: Prioridad | string) => {
  switch (prioridad) {
    case "critica":
      return "bg-red-500";
    case "alta":
      return "bg-orange-500";
    case "media":
      return "bg-amber-500";
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
   Componente principal
   ========================================================= */

const BorradoresView = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<IncidenciaPendiente>>({});

  // estado para asignar
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [incidenciaSeleccionada, setIncidenciaSeleccionada] =
    useState<IncidenciaPendiente | null>(null);
  const [responsableSeleccionado, setResponsableSeleccionado] =
    useState<string>("");

  // estado para rechazar (confirm dialog)
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [incidenciaARechazar, setIncidenciaARechazar] =
    useState<IncidenciaPendiente | null>(null);

  // Verificar permisos (solo supervisor_monitoreo y admin)
  if (
    !profile ||
    (profile.role !== "supervisor_monitoreo" && profile.role !== "admin")
  ) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <XCircle className="h-5 w-5 text-red-500" />
            Acceso restringido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Solo los supervisores de monitoreo y administradores pueden acceder
            a esta sección.
          </p>
        </CardContent>
      </Card>
    );
  }

  /* =========================================================
     Queries
     ========================================================= */

  // Incidencias pendientes
  const {
    data: borradores = [],
    isLoading,
    refetch,
  } = useQuery<IncidenciaPendiente[]>({
    queryKey: ["incidencias-borradores"],
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
        .eq("estado", "pendiente")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching borradores:", error);
        throw error;
      }

      return (data || []) as IncidenciaPendiente[];
    },
  });

  // Catálogos
  const { data: areas = [] } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("areas")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      return (data || []) as Area[];
    },
  });

  const { data: clasificaciones = [] } = useQuery<Clasificacion[]>({
    queryKey: ["clasificaciones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clasificaciones")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      return (data || []) as Clasificacion[];
    },
  });

  const { data: salas = [] } = useQuery<Sala[]>({
    queryKey: ["salas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("salas")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      return (data || []) as Sala[];
    },
  });

  // Perfiles (reportado por, responsables)
  const { data: perfiles = [] } = useQuery<PerfilBasico[]>({
    queryKey: ["profiles-basic"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .order("full_name", { ascending: true });

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

  // Responsables = todos los perfiles
  const responsables = perfiles;

  /* =========================================================
     Mutaciones
     ========================================================= */

  // Editar incidencia
  const editarIncidencia = useMutation({
    mutationFn: async (params: {
      incidenciaId: string;
      updatedData: Partial<IncidenciaPendiente>;
    }) => {
      const { incidenciaId, updatedData } = params;

      const { data, error } = await supabase
        .from("incidencias")
        .update(updatedData)
        .eq("id", incidenciaId)
        .eq("estado", "pendiente")
        .select()
        .single();

      if (error) throw error;
      return data as IncidenciaPendiente;
    },
    onSuccess: () => {
      toast.success("Incidencia actualizada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["incidencias-borradores"] });
      setEditingId(null);
      setEditData({});
    },
    onError: (error) => {
      console.error("Error editando incidencia:", error);
      toast.error("Error al actualizar la incidencia");
    },
  });

  // Rechazar incidencia (desde pendiente) + historial
  const rechazarIncidencia = useMutation({
    mutationFn: async ({ incidenciaId }: { incidenciaId: string }) => {
      const now = new Date().toISOString();

      // 1) actualizar incidencia
      const { error: updateError } = await supabase
        .from("incidencias")
        .update({ estado: "rechazado" })
        .eq("id", incidenciaId)
        .eq("estado", "pendiente");

      if (updateError) throw updateError;

      // 2) insertar en historial de estados
      const { error: histError } = await supabase
        .from("incidencia_historial_estados")
        .insert([
          {
            incidencia_id: incidenciaId,
            estado: "rechazado",
            comentario: "Incidencia rechazada por supervisor",
            cambiado_por: profile?.id ?? null,
            fecha_cambio: now,
          },
        ]);

      if (histError) throw histError;
    },
    onSuccess: () => {
      toast.success("Incidencia rechazada exitosamente");
      queryClient.invalidateQueries({ queryKey: ["incidencias-borradores"] });
      setProcessingId(null);
      setIncidenciaARechazar(null);
      setIsRejectDialogOpen(false);
    },
    onError: (error) => {
      console.error("Error rechazando incidencia:", error);
      toast.error("Error al procesar la incidencia");
      setProcessingId(null);
    },
  });

  // Asignar incidencia (desde pendiente) + historial
  const asignarIncidencia = useMutation({
    mutationFn: async (params: {
      incidenciaId: string;
      responsableId: string;
    }) => {
      const { incidenciaId, responsableId } = params;
      const now = new Date().toISOString();

      // 1) actualizar incidencia
      const { error: updateError } = await supabase
        .from("incidencias")
        .update({
          responsable_id: responsableId,
          estado: "asignada",
          fecha_asignacion: now,
        })
        .eq("id", incidenciaId)
        .eq("estado", "pendiente");

      if (updateError) throw updateError;

      // 2) insertar en historial de estados
      const { error: histError } = await supabase
        .from("incidencia_historial_estados")
        .insert([
          {
            incidencia_id: incidenciaId,
            estado: "asignada",
            comentario: "Incidencia asignada al responsable",
            cambiado_por: profile?.id ?? null,
            fecha_cambio: now,
          },
        ]);

      if (histError) throw histError;
    },
    onSuccess: () => {
      toast.success("Incidencia asignada correctamente");
      setProcessingId(null);
      setIsAssignDialogOpen(false);
      setIncidenciaSeleccionada(null);
      setResponsableSeleccionado("");
      queryClient.invalidateQueries({ queryKey: ["incidencias-borradores"] });
      queryClient.invalidateQueries({ queryKey: ["resumen-incidencias"] });
    },
    onError: (error) => {
      console.error("Error asignando incidencia:", error);
      toast.error("Error al asignar la incidencia");
      setProcessingId(null);
    },
  });

  /* =========================================================
     Handlers
     ========================================================= */

  const handleEdit = (incidencia: IncidenciaPendiente) => {
    setEditingId(incidencia.id);
    setEditData({
      titulo: incidencia.titulo,
      descripcion: incidencia.descripcion,
      area_id: incidencia.area_id,
      clasificacion_id: incidencia.clasificacion_id,
      sala_id: incidencia.sala_id,
      prioridad: incidencia.prioridad,
      observaciones: incidencia.observaciones || "",
      tiempo_minutos: incidencia.tiempo_minutos || 0,
    });
  };

  const handleSaveEdit = (incidenciaId: string) => {
    editarIncidencia.mutate({ incidenciaId, updatedData: editData });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const openRejectDialog = (incidencia: IncidenciaPendiente) => {
    setIncidenciaARechazar(incidencia);
    setIsRejectDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!incidenciaARechazar) return;
    setProcessingId(incidenciaARechazar.id);
    rechazarIncidencia.mutate({ incidenciaId: incidenciaARechazar.id });
  };

  const openAssignDialog = (incidencia: IncidenciaPendiente) => {
    setIncidenciaSeleccionada(incidencia);
    setResponsableSeleccionado("");
    setIsAssignDialogOpen(true);
  };

  const handleConfirmAssign = () => {
    if (!incidenciaSeleccionada) return;
    if (!responsableSeleccionado) {
      toast.error("Selecciona un responsable para asignar la incidencia");
      return;
    }
    setProcessingId(incidenciaSeleccionada.id);
    asignarIncidencia.mutate({
      incidenciaId: incidenciaSeleccionada.id,
      responsableId: responsableSeleccionado,
    });
  };

  /* =========================================================
     Render
     ========================================================= */

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse border border-slate-200">
            <CardContent className="pt-6">
              <div className="h-4 bg-slate-100 rounded w-3/4 mb-2" />
              <div className="h-4 bg-slate-100 rounded w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Clock className="h-5 w-5 text-emerald-700" />
            Incidencias pendientes de asignar
          </CardTitle>
          <CardDescription className="text-slate-500">
            Revisa, ajusta y asigna las incidencias creadas por los monitores a
            los responsables correspondientes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <Badge variant="secondary" className="text-slate-700">
              {borradores.length} incidencias pendientes
            </Badge>
            <Button
              onClick={() => {
                queryClient.invalidateQueries({
                  queryKey: ["incidencias-borradores"],
                });
                refetch();
              }}
              variant="outline"
              size="sm"
            >
              Actualizar listado
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista */}
      {borradores.length > 0 ? (
        <div className="space-y-4">
          {borradores.map((incidencia) => {
            const reporter =
              (incidencia.reportado_por &&
                perfilesPorId[incidencia.reportado_por]) ||
              null;

            return (
              <Card
                key={incidencia.id}
                className="hover:shadow-md transition-shadow border border-slate-200"
              >
                <CardContent className="pt-6">
                  {editingId === incidencia.id ? (
                    /* MODO EDICIÓN */
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700">
                            Título
                          </label>
                          <Input
                            value={editData.titulo || ""}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                titulo: e.target.value,
                              }))
                            }
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700">
                            Prioridad
                          </label>
                          <Select
                            value={editData.prioridad || ""}
                            onValueChange={(value) =>
                              setEditData((prev) => ({
                                ...prev,
                                prioridad: value as Prioridad,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona prioridad" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="baja">Baja</SelectItem>
                              <SelectItem value="media">Media</SelectItem>
                              <SelectItem value="alta">Alta</SelectItem>
                              <SelectItem value="critica">Crítica</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700">
                            Área
                          </label>
                          <Select
                            value={editData.area_id || ""}
                            onValueChange={(value) =>
                              setEditData((prev) => ({
                                ...prev,
                                area_id: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona área" />
                            </SelectTrigger>
                            <SelectContent>
                              {areas.map((area) => (
                                <SelectItem key={area.id} value={area.id}>
                                  {area.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700">
                            Clasificación
                          </label>
                          <Select
                            value={editData.clasificacion_id || ""}
                            onValueChange={(value) =>
                              setEditData((prev) => ({
                                ...prev,
                                clasificacion_id: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona clasificación" />
                            </SelectTrigger>
                            <SelectContent>
                              {clasificaciones.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700">
                            Sala
                          </label>
                          <Select
                            value={editData.sala_id || ""}
                            onValueChange={(value) =>
                              setEditData((prev) => ({
                                ...prev,
                                sala_id: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona sala" />
                            </SelectTrigger>
                            <SelectContent>
                              {salas.map((sala) => (
                                <SelectItem key={sala.id} value={sala.id}>
                                  {sala.nombre}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1 text-slate-700">
                            Tiempo (minutos)
                          </label>
                          <Input
                            type="number"
                            value={editData.tiempo_minutos ?? 0}
                            onChange={(e) =>
                              setEditData((prev) => ({
                                ...prev,
                                tiempo_minutos:
                                  parseInt(e.target.value, 10) || 0,
                              }))
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">
                          Descripción
                        </label>
                        <Textarea
                          value={editData.descripcion || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              descripcion: e.target.value,
                            }))
                          }
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-1 text-slate-700">
                          Observaciones
                        </label>
                        <Textarea
                          value={editData.observaciones || ""}
                          onChange={(e) =>
                            setEditData((prev) => ({
                              ...prev,
                              observaciones: e.target.value,
                            }))
                          }
                          rows={2}
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleSaveEdit(incidencia.id)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                          disabled={editarIncidencia.isPending}
                        >
                          <Save className="w-4 h-4 mr-2" />
                          {editarIncidencia.isPending
                            ? "Guardando..."
                            : "Guardar cambios"}
                        </Button>
                        <Button
                          onClick={handleCancelEdit}
                          variant="outline"
                          className="flex-1"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* MODO VISTA */
                    <>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg text-slate-900 mb-2">
                            {incidencia.titulo}
                          </h3>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="outline">
                              <MapPin className="w-3 h-3 mr-1" />
                              {incidencia.areas?.nombre || "Sin área"}
                            </Badge>

                            {incidencia.incidencia_clasificaciones &&
                            incidencia.incidencia_clasificaciones.length > 0 ? (
                              incidencia.incidencia_clasificaciones.map(
                                (relacion) => (
                                  <Badge
                                    key={relacion.id}
                                    variant="outline"
                                    style={{
                                      borderColor:
                                        relacion.clasificaciones?.color,
                                      color: relacion.clasificaciones?.color,
                                    }}
                                  >
                                    {relacion.clasificaciones?.nombre}
                                  </Badge>
                                )
                              )
                            ) : (
                              incidencia.clasificaciones && (
                                <Badge
                                  variant="outline"
                                  style={{
                                    borderColor:
                                      incidencia.clasificaciones?.color,
                                    color: incidencia.clasificaciones?.color,
                                  }}
                                >
                                  {incidencia.clasificaciones?.nombre}
                                </Badge>
                              )
                            )}

                            <Badge
                              className={`text-white ${getPrioridadColor(
                                incidencia.prioridad
                              )}`}
                            >
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              {incidencia.prioridad}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right text-sm text-slate-500">
                          <p className="flex items-center gap-1 justify-end">
                            <Calendar className="w-3 h-3" />
                            <span>
                              Reportada:{" "}
                              {formatFechaHora(incidencia.fecha_incidencia)}
                            </span>
                          </p>
                          <p className="flex items-center gap-1 mt-1 justify-end">
                            <User className="w-3 h-3" />
                            <span>
                              Reportado por:{" "}
                              {reporter?.full_name ||
                                reporter?.email ||
                                incidencia.reportado_por ||
                                "Sin dato"}
                            </span>
                          </p>
                        </div>
                      </div>

                      <p className="text-slate-700 mb-3">
                        {incidencia.descripcion}
                      </p>

                      {incidencia.observaciones && (
                        <div className="bg-slate-50 p-3 rounded-lg mb-3 text-sm">
                          <strong>Observaciones:</strong>{" "}
                          {incidencia.observaciones}
                        </div>
                      )}

                      {typeof incidencia.tiempo_minutos === "number" && (
                        <div className="bg-emerald-50 p-3 rounded-lg mb-3 text-sm">
                          <strong>Tiempo reportado:</strong>{" "}
                          {incidencia.tiempo_minutos} minutos
                        </div>
                      )}

                      {incidencia.imagenes_incidencias &&
                        incidencia.imagenes_incidencias.length > 0 && (
                          <div className="mb-4">
                            <p className="text-sm font-medium text-slate-700 mb-2">
                              Evidencia multimedia (
                              {incidencia.imagenes_incidencias.length}{" "}
                              archivos)
                            </p>
                            <div className="grid grid-cols-4 gap-2">
                              {incidencia.imagenes_incidencias.map((imagen) => {
                                const isVideo =
                                  imagen.tipo_archivo?.startsWith("video/");
                                return (
                                  <div key={imagen.id} className="relative">
                                    {isVideo ? (
                                      <div className="w-full h-16 bg-slate-100 rounded flex items-center justify-center">
                                        <span className="text-xs text-slate-500">
                                          Video
                                        </span>
                                      </div>
                                    ) : (
                                      <img
                                        src={imagen.url_imagen}
                                        alt="Evidencia"
                                        className="w-full h-16 object-cover rounded border border-slate-200"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                      <div className="flex gap-2 pt-4 border-t border-slate-200">
                        <Button
                          onClick={() => handleEdit(incidencia)}
                          variant="outline"
                          className="flex-1"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>

                        <Button
                          onClick={() => openAssignDialog(incidencia)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Asignar
                        </Button>

                        <Button
                          onClick={() => openRejectDialog(incidencia)}
                          disabled={processingId === incidencia.id}
                          variant="destructive"
                          className="flex-1"
                        >
                          <XCircle className="w-4 h-4 mr-2" />
                          {processingId === incidencia.id
                            ? "Procesando..."
                            : "Rechazar"}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border border-slate-200">
          <CardContent className="text-center py-8">
            <CheckCircle className="mx-auto h-12 w-12 text-emerald-500 mb-4" />
            <p className="text-slate-600">
              No hay incidencias pendientes de asignación.
            </p>
          </CardContent>
        </Card>
      )}

      {/* DIALOGO DE ASIGNACIÓN */}
      <Dialog
        open={isAssignDialogOpen}
        onOpenChange={(open) => {
          setIsAssignDialogOpen(open);
          if (!open) {
            setIncidenciaSeleccionada(null);
            setResponsableSeleccionado("");
            setProcessingId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar incidencia</DialogTitle>
            <DialogDescription>
              Selecciona el responsable que atenderá esta incidencia.
            </DialogDescription>
          </DialogHeader>

          {incidenciaSeleccionada && (
            <div className="space-y-2 mb-4 text-sm">
              <p>
                <span className="font-semibold text-slate-800">Título:</span>{" "}
                {incidenciaSeleccionada.titulo}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Área:</span>{" "}
                {incidenciaSeleccionada.areas?.nombre || "Sin área"}
              </p>
              <p className="text-xs text-slate-500 line-clamp-3">
                {incidenciaSeleccionada.descripcion}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Responsable
            </label>
            <Select
              value={responsableSeleccionado}
              onValueChange={setResponsableSeleccionado}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un responsable" />
              </SelectTrigger>
              <SelectContent>
                {responsables.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {(r.full_name || r.email || "Sin nombre") +
                      " (" +
                      (r.role || "sin rol") +
                      ")"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmAssign}
              disabled={asignarIncidencia.isPending}
            >
              {asignarIncidencia.isPending
                ? "Asignando..."
                : "Confirmar asignación"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOGO DE CONFIRMACIÓN DE RECHAZO */}
      <Dialog
        open={isRejectDialogOpen}
        onOpenChange={(open) => {
          setIsRejectDialogOpen(open);
          if (!open) {
            setIncidenciaARechazar(null);
            setProcessingId(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar incidencia</DialogTitle>
            <DialogDescription>
              ¿Estás seguro de que deseas rechazar esta incidencia? Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>

          {incidenciaARechazar && (
            <div className="space-y-2 mb-4 text-sm">
              <p>
                <span className="font-semibold text-slate-800">Título:</span>{" "}
                {incidenciaARechazar.titulo}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Área:</span>{" "}
                {incidenciaARechazar.areas?.nombre || "Sin área"}
              </p>
              <p className="text-xs text-slate-500 line-clamp-3">
                {incidenciaARechazar.descripcion}
              </p>
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmReject}
              disabled={rechazarIncidencia.isPending}
            >
              {rechazarIncidencia.isPending
                ? "Rechazando..."
                : "Confirmar rechazo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BorradoresView;
