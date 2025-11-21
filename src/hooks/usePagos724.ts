import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { uploadImageToStorage, UploadedImage } from "@/utils/supabaseStorage";
import { generateFolderPath, generateFileName } from "@/utils/imageCompression";

export interface Pago724 {
  id: string;
  nombres: string;
  apellidos: string;
  monto_pagar: number;
  foto_documento_url: string | null;
  usuario_registro: string;
  fecha_pago: string;
  hora_pago: string;
  created_at: string;
  updated_at: string;
}

export interface EstadisticasPagos724 {
  total_pagos_historico: number;
  suma_total_historica: number;
  pagos_hoy: number;
  suma_hoy: number;
  pagos_mes_actual: number;
  suma_mes_actual: number;
}

export interface CrearPagoData {
  nombres: string;
  apellidos: string;
  monto_pagar: number;
  documento_imagen: File;
}

export const usePagos724 = () => {
  const [pagos, setPagos] = useState<Pago724[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPagos724 | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  const cargarPagos = async () => {
    try {
      const { data, error } = await supabase
        .from('pagos_724')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPagos(data || []);
    } catch (error) {
      console.error('Error cargando pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarEstadisticas = async () => {
    try {
      const { data, error } = await supabase
        .rpc('obtener_estadisticas_generales_724');

      if (error) throw error;
      if (data && data.length > 0) {
        setEstadisticas(data[0]);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  };

  const crearPago = async (datosPago: CrearPagoData) => {
    if (!user) throw new Error('Usuario no autenticado');

    try {
      // Subir imagen del documento
      const folderPath = generateFolderPath();
      const fileName = generateFileName(
        `${datosPago.nombres}_${datosPago.apellidos}`,
        datosPago.documento_imagen.name
      );
      const fullPath = `${folderPath}${fileName}`;

      const imagenSubida: UploadedImage = await uploadImageToStorage(
        datosPago.documento_imagen,
        fullPath
      );

      // Crear registro en la base de datos
      const { data, error } = await supabase
        .from('pagos_724')
        .insert({
          nombres: datosPago.nombres,
          apellidos: datosPago.apellidos,
          monto_pagar: datosPago.monto_pagar,
          foto_documento_url: imagenSubida.url,
          usuario_registro: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Recargar datos
      await cargarPagos();
      await cargarEstadisticas();

      return data;
    } catch (error) {
      console.error('Error creando pago:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (user) {
      cargarPagos();
      cargarEstadisticas();
    }
  }, [user]);

  // Suscripción en tiempo real para pagos
  useEffect(() => {
    if (!user) return;

    const subscription = supabase
      .channel('pagos_724_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pagos_724'
        },
        () => {
          cargarPagos();
          cargarEstadisticas();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user]);

  return {
    pagos,
    estadisticas,
    loading,
    crearPago,
    recargarDatos: () => {
      cargarPagos();
      cargarEstadisticas();
    }
  };
};