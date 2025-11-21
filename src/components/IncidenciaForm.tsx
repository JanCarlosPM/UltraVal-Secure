import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useIncidenciaForm } from "@/hooks/useIncidenciaForm";
import IncidentFormFields from "@/components/incident-form/IncidentFormFields";
import ImageUpload from "@/components/incident-form/ImageUpload";
import IncidenciaConfirmationDialog from "@/components/IncidenciaConfirmationDialog";
import { useState } from "react";

const IncidenciaForm = () => {
  const { toast } = useToast();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const {
    formData,
    uploadedImages,
    isUploading,
    handleInputChange,
    handleImageUpload,
    removeImage,
    crearIncidencia,
    user,
    profile,
  } = useIncidenciaForm();

  // Obtener áreas
  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  // Obtener clasificaciones
  const { data: clasificaciones } = useQuery({
    queryKey: ["clasificaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clasificaciones")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  // Obtener salas
  const { data: salas } = useQuery({
    queryKey: ["salas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salas")
        .select("*")
        .eq("activo", true)
        .order("nombre");
      if (error) throw error;
      return data || [];
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar campos obligatorios básicos
    if (
      !formData.titulo.trim() ||
      !formData.descripcion.trim() ||
      !formData.area_id ||
      formData.clasificacion_ids.length === 0 ||
      !formData.reportado_por.trim() ||
      !formData.sala_id
    ) {
      toast({
        title: "Campos requeridos",
        description:
          "Por favor completa todos los campos obligatorios incluyendo al menos un tipo de incidencia.",
        variant: "destructive",
      });
      return;
    }

    // Validar campo de tiempo si es requerido
    const selectedClasificaciones =
      clasificaciones?.filter((c) =>
        formData.clasificacion_ids.includes(c.id)
      ) || [];

    const requiresTimeField = selectedClasificaciones.some((clasificacion) => {
      const nombre = clasificacion.nombre.toLowerCase();
      return (
        nombre.includes("tardio") ||
        nombre.includes("tardío") ||
        nombre.includes("prematuro") ||
        nombre.includes("ingreso") ||
        nombre.includes("cierre")
      );
    });

    if (
      requiresTimeField &&
      (!formData.tiempo_minutos || formData.tiempo_minutos <= 0)
    ) {
      toast({
        title: "Campo de tiempo requerido",
        description:
          "Por favor ingresa el tiempo en minutos para este tipo de incidencia.",
        variant: "destructive",
      });
      return;
    }

    // Verificar autenticación antes de mostrar confirmación
    if (!user || !profile) {
      toast({
        title: "Error de autenticación",
        description: "Debes iniciar sesión para crear incidencias.",
        variant: "destructive",
      });
      return;
    }

    if (
      profile.role !== "monitor" &&
      profile.role !== "admin" &&
      profile.role !== "supervisor_monitoreo"
    ) {
      toast({
        title: "Sin permisos",
        description:
          "Solo monitores, supervisores y administradores pueden crear incidencias.",
        variant: "destructive",
      });
      return;
    }

    // Mostrar diálogo de confirmación
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = () => {
    setShowConfirmDialog(false);
    crearIncidencia.mutate();
  };

  // Mostrar mensaje si el usuario no tiene permisos / no está logueado
  if (!user || !profile) {
    return (
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-8">
        <Card className="border border-emerald-100 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-50 via-white to-transparent">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Acceso restringido
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-700">
              Debes iniciar sesión para crear incidencias.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (
    profile.role !== "monitor" &&
    profile.role !== "admin" &&
    profile.role !== "supervisor_monitoreo"
  ) {
    return (
      <div className="w-full max-w-4xl mx-auto px-2 sm:px-4 py-8">
        <Card className="border border-emerald-100 shadow-sm">
          <CardHeader className="border-b bg-gradient-to-r from-emerald-50 via-white to-transparent">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Acceso restringido
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-slate-700">
              No tienes permisos para crear incidencias. Solo los monitores,
              supervisores y administradores pueden crear incidencias.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-6">
        <Card className="w-full border border-emerald-100 shadow-md bg-white">
          <CardHeader className="p-4 sm:p-6 border-b bg-gradient-to-r from-emerald-50 via-white to-transparent">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-lg sm:text-xl text-slate-900">
              <span className="font-semibold tracking-tight">
                Registrar nueva incidencia
              </span>
              <span className="text-xs sm:text-sm inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full font-normal border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Sistema inteligente activado
              </span>
            </CardTitle>
            <CardDescription className="mt-2 text-sm sm:text-base text-slate-600">
              Completa el formulario para registrar una nueva incidencia. El
              sistema seleccionará automáticamente el área y la prioridad según
              el tipo de incidencia seleccionado.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <form
              onSubmit={handleSubmit}
              className="space-y-4 sm:space-y-6"
            >
              <IncidentFormFields
                formData={formData}
                areas={areas}
                clasificaciones={clasificaciones}
                salas={salas}
                onInputChange={handleInputChange}
              />

              <ImageUpload
                uploadedImages={uploadedImages}
                onImageUpload={handleImageUpload}
                onRemoveImage={removeImage}
                isUploading={isUploading}
              />

              <Button
                type="submit"
                className="w-full h-12 text-sm sm:text-base font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-shadow disabled:opacity-70 disabled:cursor-not-allowed"
                disabled={crearIncidencia.isPending || isUploading}
              >
                {crearIncidencia.isPending
                  ? "Procesando..."
                  : isUploading
                  ? "Subiendo imágenes..."
                  : "Revisar y registrar incidencia"}
              </Button>

              <p className="text-[11px] text-slate-500 text-center">
                Toda la información registrada será enviada al equipo de
                monitoreo para su análisis y atención.
              </p>
            </form>
          </CardContent>
        </Card>
      </div>

      <IncidenciaConfirmationDialog
        isOpen={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        onConfirm={handleConfirmSubmit}
        formData={formData}
        areas={areas || []}
        clasificaciones={clasificaciones || []}
        salas={salas || []}
      />
    </>
  );
};

export default IncidenciaForm;
