import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from './useAuth';

export interface Activo {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_activo: 'camara' | 'dvr' | 'fuente_poder' | 'ups' | 'otro';
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  sala_id: string;
  estado: 'activo' | 'inactivo' | 'dado_baja' | 'en_mantenimiento';
  fecha_asignacion: string;
  fecha_baja?: string;
  observaciones?: string;
  valor_compra?: number;
  fecha_compra?: string;
  garantia_meses?: number;
  proveedor?: string;
  usuario_registro: string;
  created_at: string;
  updated_at: string;
  salas?: { nombre: string };
}

export interface Movimiento {
  id: string;
  activo_id: string;
  tipo_movimiento: 'asignacion' | 'baja' | 'traslado' | 'mantenimiento';
  sala_origen_id?: string;
  sala_destino_id?: string;
  fecha_movimiento: string;
  motivo: string;
  observaciones?: string;
  usuario_registro: string;
  created_at: string;
  activos_salas?: Activo;
  sala_origen?: { nombre: string };
  sala_destino?: { nombre: string };
}

export interface CrearActivoData {
  codigo: string;
  nombre: string;
  descripcion?: string;
  tipo_activo: 'camara' | 'dvr' | 'fuente_poder' | 'ups' | 'otro';
  marca?: string;
  modelo?: string;
  numero_serie?: string;
  sala_id: string;
  valor_compra?: number;
  fecha_compra?: string;
  garantia_meses?: number;
  proveedor?: string;
  observaciones?: string;
}

export interface ActualizarActivoData extends CrearActivoData {
  estado: 'activo' | 'inactivo' | 'dado_baja' | 'en_mantenimiento';
  fecha_baja?: string;
}

export interface CrearMovimientoData {
  activo_id: string;
  tipo_movimiento: 'asignacion' | 'baja' | 'traslado' | 'mantenimiento';
  sala_origen_id?: string;
  sala_destino_id?: string;
  fecha_movimiento: string;
  motivo: string;
  observaciones?: string;
}

export interface FiltrosActivos {
  codigo?: string;
  tipo_activo?: string;
  sala_id?: string;
  estado?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

export const useMovimientoActivos = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Obtener activos con filtros
  const { data: activos = [], isLoading } = useQuery({
    queryKey: ['activos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activos_salas')
        .select(`
          *,
          salas(nombre)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Activo[];
    },
  });

  // Obtener activos con filtros aplicados
  const obtenerActivosFiltrados = async (filtros: FiltrosActivos) => {
    let query = supabase
      .from('activos_salas')
      .select(`
        *,
        salas(nombre)
      `);

    if (filtros.codigo) {
      query = query.ilike('codigo', `%${filtros.codigo}%`);
    }
    if (filtros.tipo_activo) {
      query = query.eq('tipo_activo', filtros.tipo_activo);
    }
    if (filtros.sala_id) {
      query = query.eq('sala_id', filtros.sala_id);
    }
    if (filtros.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros.fecha_desde) {
      query = query.gte('fecha_asignacion', filtros.fecha_desde);
    }
    if (filtros.fecha_hasta) {
      query = query.lte('fecha_asignacion', filtros.fecha_hasta);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return (data || []) as Activo[];
  };

  // Obtener movimientos
  const { data: movimientos = [] } = useQuery({
    queryKey: ['movimientos', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimientos_activos')
        .select(`
          *,
          activos_salas(*),
          sala_origen:salas!sala_origen_id(nombre),
          sala_destino:salas!sala_destino_id(nombre)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Movimiento[];
    },
  });

  // Validar código único
  const validarCodigoUnico = async (codigo: string, activoId?: string) => {
    try {
      const { error } = await supabase.rpc('validar_codigo_activo', {
        p_codigo: codigo,
        p_id: activoId || null
      });
      
      if (error) throw error;
      return true;
    } catch (error: any) {
      throw new Error(error.message || 'Error al validar el código');
    }
  };

  // Generar código automático
  const generarCodigoAutomatico = async () => {
    const { data, error } = await supabase.rpc('generar_codigo_activo');
    if (error) throw error;
    return data;
  };

  // Crear activo
  const crearActivo = useMutation({
    mutationFn: async (datos: CrearActivoData) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      // Validar código antes de crear
      await validarCodigoUnico(datos.codigo);

      const { data, error } = await supabase
        .from('activos_salas')
        .insert({
          ...datos,
          usuario_registro: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activos'] });
      toast({
        title: 'Activo creado',
        description: 'El activo ha sido registrado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Hubo un error al crear el activo.',
        variant: 'destructive',
      });
    },
  });

  // Actualizar activo
  const actualizarActivo = useMutation({
    mutationFn: async ({ id, datos }: { id: string; datos: ActualizarActivoData }) => {
      // Validar código antes de actualizar
      await validarCodigoUnico(datos.codigo, id);

      const { data, error } = await supabase
        .from('activos_salas')
        .update(datos)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activos'] });
      toast({
        title: 'Activo actualizado',
        description: 'El activo ha sido actualizado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Hubo un error al actualizar el activo.',
        variant: 'destructive',
      });
    },
  });

  // Registrar movimiento
  const registrarMovimiento = useMutation({
    mutationFn: async (datos: CrearMovimientoData) => {
      if (!user?.id) throw new Error('Usuario no autenticado');

      const { data, error } = await supabase
        .from('movimientos_activos')
        .insert({
          ...datos,
          usuario_registro: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Si es una baja, actualizar el estado del activo
      if (datos.tipo_movimiento === 'baja') {
        await supabase
          .from('activos_salas')
          .update({
            estado: 'dado_baja',
            fecha_baja: datos.fecha_movimiento
          })
          .eq('id', datos.activo_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activos'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos'] });
      toast({
        title: 'Movimiento registrado',
        description: 'El movimiento ha sido registrado exitosamente.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Hubo un error al registrar el movimiento.',
        variant: 'destructive',
      });
    },
  });

  return {
    activos,
    movimientos,
    isLoading,
    crearActivo: crearActivo.mutateAsync,
    isCreating: crearActivo.isPending,
    actualizarActivo: actualizarActivo.mutateAsync,
    isUpdating: actualizarActivo.isPending,
    registrarMovimiento: registrarMovimiento.mutateAsync,
    isRegistering: registrarMovimiento.isPending,
    obtenerActivosFiltrados,
    validarCodigoUnico,
    generarCodigoAutomatico,
  };
};