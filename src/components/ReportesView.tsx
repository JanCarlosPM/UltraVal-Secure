import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Download,
  Filter,
  Eye,
  Image as ImageIcon,
  FileText,
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { exportToPDF } from "@/utils/pdfExport";
import { toast } from "sonner";

/* ================= Config / Constantes ================= */

const SYSTEM_NAME = "Sistema de Monitoreo de Incidencias de Ultravalores S.A.";

/* ================= Tipos simples ================= */

interface ImagenIncidencia {
  id: string;
  url_imagen: string;
  nombre_archivo: string | null;
  tipo_archivo: string | null;
}

interface AreaLite {
  nombre: string;
  descripcion?: string | null;
}

interface ClasificacionLite {
  nombre: string;
  color: string;
}

interface SalaLite {
  nombre: string;
}

interface PerfilLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

interface IncidenciaReporte {
  id: string;
  titulo: string;
  prioridad: string;
  fecha_incidencia: string;
  descripcion: string | null;
  observaciones: string | null;
  reportado_por: string | null;
  cerrado_por: string | null;
  areas?: AreaLite | null;
  clasificaciones?: ClasificacionLite | null;
  salas?: SalaLite | null;
  imagenes_incidencias?: ImagenIncidencia[];
  reportado_por_profile?: PerfilLite | null;
  cerrado_por_profile?: PerfilLite | null;
}

/* ========================================================================== */

const ReportesView = () => {
  const { isAdmin, isRRHH, isFinanzas, isSupervisorSalas, isMantenimiento } =
    useAuth();

  // Mapeo de roles a nombres de áreas
  const roleAreaMapping = useMemo(
    () => ({
      rrhh: "Recursos Humanos",
      finanzas: "Contabilidad",
      supervisor_salas: "Supervisión Salas",
      mantenimiento: "Mantenimiento",
    }),
    []
  );

  // Obtener el área correspondiente al rol del usuario
  const userAreaName = useMemo(() => {
    if (isRRHH) return roleAreaMapping.rrhh;
    if (isFinanzas) return roleAreaMapping.finanzas;
    if (isSupervisorSalas) return roleAreaMapping.supervisor_salas;
    if (isMantenimiento) return roleAreaMapping.mantenimiento;
    return null;
  }, [isRRHH, isFinanzas, isSupervisorSalas, isMantenimiento, roleAreaMapping]);

  const [filtros, setFiltros] = useState({
    fechaInicio: "",
    fechaFin: "",
    area: "all",
    clasificacion: "all",
    prioridad: "all",
  });

  // Obtener áreas para el filtro
  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("areas")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      return data || [];
    },
  });

  // Obtener clasificaciones para el filtro
  const { data: clasificaciones } = useQuery({
    queryKey: ["clasificaciones"],
    queryFn: async () => {
      const { data } = await supabase
        .from("clasificaciones")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      return data || [];
    },
  });

  // Obtener incidencias filtradas (SOLO visibles)
  const { data: incidencias = [], isLoading } = useQuery<IncidenciaReporte[]>({
    queryKey: ["incidencias-reportes", filtros] as const,
    queryFn: async () => {
      const query = supabase
        .from("incidencias")
        .select(
          `
          *,
          areas!incidencias_area_id_fkey(nombre, descripcion),
          clasificaciones(nombre, color),
          imagenes_incidencias(id, url_imagen, nombre_archivo, tipo_archivo),
          salas(nombre)
        `
        )
        .eq("visible", "true")
        .order("fecha_incidencia", { ascending: false });

      // Aplicar filtros
      if (filtros.fechaInicio) {
        query.gte("fecha_incidencia", filtros.fechaInicio);
      }
      if (filtros.fechaFin) {
        query.lte("fecha_incidencia", filtros.fechaFin);
      }
      if (filtros.area && filtros.area !== "all") {
        query.eq("area_id", filtros.area);
      }
      if (filtros.clasificacion && filtros.clasificacion !== "all") {
        query.eq("clasificacion_id", filtros.clasificacion);
      }
      if (filtros.prioridad && filtros.prioridad !== "all") {
        query.eq("prioridad", filtros.prioridad);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredData = (data || []) as any[];

      // Filtrar por área según el rol del usuario (solo si no es admin)
      if (!isAdmin && userAreaName) {
        filteredData = filteredData.filter(
          (incidencia: any) => incidencia.areas?.nombre === userAreaName
        );
      }

      // Obtener información de perfiles (reportado y cerrado)
      const uniqueUserIds = [
        ...new Set(
          filteredData
            .flatMap((inc: any) => [inc.reportado_por, inc.cerrado_por])
            .filter((id: any) => id && id.length === 36)
        ),
      ] as string[];

      let userProfiles: Record<string, PerfilLite> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .in("id", uniqueUserIds);

        if (profiles) {
          userProfiles = (profiles as PerfilLite[]).reduce(
            (acc: Record<string, PerfilLite>, profile: PerfilLite) => {
              acc[profile.id] = profile;
              return acc;
            },
            {}
          );
        }
      }

      // Enriquecer datos con información de perfiles
      return filteredData.map((incidencia: any) => ({
        ...incidencia,
        reportado_por_profile:
          userProfiles[incidencia.reportado_por as string] || null,
        cerrado_por_profile:
          userProfiles[incidencia.cerrado_por as string] || null,
      })) as IncidenciaReporte[];
    },
  });

  const handleFiltroChange = (campo: string, valor: string) => {
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const limpiarFiltros = () => {
    setFiltros({
      fechaInicio: "",
      fechaFin: "",
      area: "all",
      clasificacion: "all",
      prioridad: "all",
    });
  };

  const exportarCSV = () => {
    if (!incidencias || incidencias.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    const csv = [
      [
        "Título",
        "Área",
        "Clasificación",
        "Prioridad",
        "Reportado por",
        "Cerrado por",
        "Fecha",
        "Descripción",
      ].join(","),
      ...incidencias.map((inc: any) =>
        [
          `"${inc.titulo}"`,
          `"${inc.areas?.nombre || ""}"`,
          `"${inc.clasificaciones?.nombre || ""}"`,
          `"${inc.prioridad}"`,
          `"${inc.reportado_por_profile?.full_name || inc.reportado_por_profile?.email || inc.reportado_por}"`,
          `"${inc.cerrado_por_profile?.full_name || inc.cerrado_por_profile?.email || inc.cerrado_por || ""}"`,
          `"${format(new Date(inc.fecha_incidencia), "dd/MM/yyyy HH:mm", {
            locale: es,
          })}"`,
          `"${inc.descripcion || ""}"`,
        ].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `reporte_incidencias_${format(new Date(), "yyyy-MM-dd")}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportarPDF = () => {
    if (!incidencias || incidencias.length === 0) {
      toast.error("No hay datos para exportar");
      return;
    }

    // Forzamos que reportado_por y cerrado_por lleven nombre/correo y no UUID
    const incidenciasConNombres = incidencias.map((inc) => ({
      ...inc,
      reportado_por:
        inc.reportado_por_profile?.full_name ||
        inc.reportado_por_profile?.email ||
        inc.reportado_por,
      cerrado_por:
        inc.cerrado_por_profile?.full_name ||
        inc.cerrado_por_profile?.email ||
        inc.cerrado_por,
    }));

    exportToPDF(incidenciasConNombres as any, filtros);
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad.toLowerCase()) {
      case "critica":
        return "text-red-700 bg-red-100";
      case "alta":
        return "text-orange-700 bg-orange-100";
      case "media":
        return "text-amber-700 bg-amber-100";
      case "baja":
        return "text-emerald-700 bg-emerald-100";
      default:
        return "text-slate-700 bg-slate-100";
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-emerald-900">
            Reportes de Incidencias
          </h1>
          <p className="text-slate-600 mt-1 text-sm">
            Módulo de reportes del{" "}
            <span className="font-semibold">{SYSTEM_NAME}</span>
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card className="border border-emerald-100 shadow-sm">
        <CardHeader className="border-b border-emerald-50 bg-emerald-50/40">
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <Filter className="h-5 w-5" />
            Filtros de búsqueda
          </CardTitle>
          <CardDescription className="text-slate-600">
            Aplica filtros para refinar tu búsqueda de incidencias
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-700">Fecha inicio</Label>
              <Input
                type="date"
                value={filtros.fechaInicio}
                onChange={(e) =>
                  handleFiltroChange("fechaInicio", e.target.value)
                }
                className="border-slate-300 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-700">Fecha fin</Label>
              <Input
                type="date"
                value={filtros.fechaFin}
                onChange={(e) =>
                  handleFiltroChange("fechaFin", e.target.value)
                }
                className="border-slate-300 focus-visible:ring-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-700">Área</Label>
              <Select
                value={filtros.area}
                onValueChange={(value) => handleFiltroChange("area", value)}
                disabled={!isAdmin && !!userAreaName}
              >
                <SelectTrigger className="border-slate-300 focus-visible:ring-emerald-500">
                  <SelectValue
                    placeholder={
                      !isAdmin && userAreaName
                        ? `Área: ${userAreaName}`
                        : "Todas las áreas"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && (
                    <SelectItem value="all">Todas las áreas</SelectItem>
                  )}
                  {areas?.map((area: any) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && userAreaName && (
                <p className="text-xs text-slate-500">
                  Solo puedes ver incidencias de tu área: {userAreaName}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-700">Clasificación</Label>
              <Select
                value={filtros.clasificacion}
                onValueChange={(value) =>
                  handleFiltroChange("clasificacion", value)
                }
              >
                <SelectTrigger className="border-slate-300 focus-visible:ring-emerald-500">
                  <SelectValue placeholder="Todas las clasificaciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las clasificaciones</SelectItem>
                  {clasificaciones?.map((clasificacion: any) => (
                    <SelectItem key={clasificacion.id} value={clasificacion.id}>
                      {clasificacion.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-slate-700">Prioridad</Label>
              <Select
                value={filtros.prioridad}
                onValueChange={(value) =>
                  handleFiltroChange("prioridad", value)
                }
              >
                <SelectTrigger className="border-slate-300 focus-visible:ring-emerald-500">
                  <SelectValue placeholder="Todas las prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las prioridades</SelectItem>
                  <SelectItem value="critica">Crítica</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button
              variant="outline"
              onClick={limpiarFiltros}
              className="border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              Limpiar filtros
            </Button>
            <Button
              onClick={exportarCSV}
              className="bg-emerald-700 hover:bg-emerald-800 text-white"
            >
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
            <Button
              onClick={exportarPDF}
              className="bg-emerald-900 hover:bg-emerald-950 text-white"
            >
              <FileText className="w-4 h-4 mr-2" />
              Exportar PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resultados */}
      <Card className="border border-emerald-100 shadow-sm">
        <CardHeader className="border-b border-emerald-50 bg-white">
          <CardTitle className="flex items-center justify-between text-emerald-900">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Resultados
            </div>
            <Badge className="bg-emerald-50 text-emerald-900 border border-emerald-200">
              {incidencias?.length || 0} incidencias encontradas
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
              <p className="text-slate-500 mt-2">Cargando incidencias...</p>
            </div>
          ) : incidencias && incidencias.length > 0 ? (
            <div className="space-y-4">
              {incidencias.map((incidencia: any) => (
                <Card
                  key={incidencia.id}
                  className="hover:shadow-md transition-shadow border border-slate-200"
                >
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4 gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg mb-2 text-slate-900">
                          {incidencia.titulo}
                        </h3>
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Badge
                            variant="outline"
                            className="border-slate-300 text-slate-800"
                          >
                            {incidencia.areas?.nombre}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border bg-white"
                            style={{
                              borderColor: incidencia.clasificaciones?.color,
                              color: incidencia.clasificaciones?.color,
                            }}
                          >
                            {incidencia.clasificaciones?.nombre}
                          </Badge>
                          <Badge
                            className={getPrioridadColor(
                              incidencia.prioridad
                            )}
                          >
                            {incidencia.prioridad}
                          </Badge>
                          {incidencia.salas?.nombre && (
                            <Badge
                              variant="secondary"
                              className="bg-emerald-50 text-emerald-900 border border-emerald-100"
                            >
                              Sucursal: {incidencia.salas.nombre}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-sm text-slate-500">
                        <p className="flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3" />
                          {format(
                            new Date(incidencia.fecha_incidencia),
                            "dd/MM/yyyy HH:mm",
                            { locale: es }
                          )}
                        </p>
                        <p className="mt-1">
                          <span className="font-medium text-slate-700">
                            Reportado por:{" "}
                          </span>
                          {incidencia.reportado_por_profile?.full_name ||
                            incidencia.reportado_por_profile?.email ||
                            incidencia.reportado_por}
                        </p>
                        {incidencia.cerrado_por_profile ||
                        incidencia.cerrado_por ? (
                          <p className="mt-1">
                            <span className="font-medium text-slate-700">
                              Cerrado por:{" "}
                            </span>
                            {incidencia.cerrado_por_profile?.full_name ||
                              incidencia.cerrado_por_profile?.email ||
                              incidencia.cerrado_por}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    <p className="text-slate-700 mb-4">
                      {incidencia.descripcion}
                    </p>

                    {incidencia.observaciones && (
                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg mb-4 text-sm text-emerald-900">
                        <strong>Observaciones:</strong>{" "}
                        {incidencia.observaciones}
                      </div>
                    )}

                    {incidencia.imagenes_incidencias &&
                      incidencia.imagenes_incidencias.length > 0 && (
                        <div className="border-top border-slate-100 pt-4">
                          <p className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                            <ImageIcon className="w-4 h-4" />
                            Evidencia multimedia (
                            {incidencia.imagenes_incidencias.length} archivos)
                          </p>
                          <div className="grid grid-cols-4 gap-2">
                            {incidencia.imagenes_incidencias.map(
                              (imagen: any) => {
                                const isVideo =
                                  imagen.tipo_archivo?.startsWith("video/");
                                return (
                                  <div key={imagen.id} className="relative">
                                    {isVideo ? (
                                      <div className="w-full h-20 bg-slate-100 rounded flex items-center justify-center">
                                        <span className="text-xs text-slate-500">
                                          🎥 Video
                                        </span>
                                      </div>
                                    ) : (
                                      <img
                                        src={imagen.url_imagen}
                                        alt="Evidencia"
                                        className="w-full h-20 object-cover rounded cursor-pointer hover:opacity-80 border border-slate-200"
                                        onClick={() =>
                                          window.open(
                                            imagen.url_imagen,
                                            "_blank"
                                          )
                                        }
                                      />
                                    )}
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-500">
                No se encontraron incidencias con los filtros aplicados
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportesView;