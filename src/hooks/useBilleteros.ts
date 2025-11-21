import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Billetero {
  id: string;
  codigo: string;
  serial?: string;
  tipo: 'MJ' | 'PK';
  estado: 'asignado' |'en_stock' | 'reparacion' | 'en_programacion' | 'descarte';
  sala_id?: string;
  numero_maquina?: string;
  descripcion?: string;
  observaciones?: string;
  fecha_ingreso: string;
  usuario_registro: string;
  created_at: string;
  updated_at: string;
  salas?: {
    nombre: string;
  };
}

export interface MovimientoBilletero {
  id: string;
  billetero_id: string;
  tipo_movimiento: 'asignacion' | 'cambio_estado' | 'transferencia';
  estado_anterior?: string;
  estado_nuevo?: string;
  sala_origen_id?: string;
  sala_destino_id?: string;
  numero_maquina_anterior?: string;
  numero_maquina_nuevo?: string;
  motivo: string;
  observaciones?: string;
  fecha_movimiento: string;
  usuario_registro: string;
  created_at: string;
  billeteros?: Billetero;
  sala_origen?: { nombre: string };
  sala_destino?: { nombre: string };
}

export interface FiltrosBilleteros {
  codigo?: string;
  serial?: string;
  tipo?: 'MJ' | 'PK';
  estado?: 'asignado' | 'en_stock' | 'reparacion' | 'en_programacion' | 'descarte';
  sala_id?: string;
}

export interface CrearBilleteroData {
  codigo: string;
  serial?: string;
  tipo: 'MJ' | 'PK';
  estado?: 'asignado' | 'en_stock' | 'reparacion' | 'en_programacion' | 'descarte';
  descripcion?: string;
  observaciones?: string;
}

export interface ActualizarBilleteroData {
  codigo?: string;
  serial?: string;
  tipo?: 'MJ' | 'PK';
  estado?: 'asignado' | 'en_stock' | 'reparacion' | 'en_programacion' | 'descarte';
  sala_id?: string | null;
  numero_maquina?: string | null;
  descripcion?: string;
  observaciones?: string;
}

export interface CrearMovimientoBilleteroData {
  billetero_id: string;
  tipo_movimiento: 'asignacion' | 'cambio_estado' | 'transferencia' | 'baja';
  sala_destino_id?: string;
  numero_maquina_nuevo?: string;
  motivo: string;
  observaciones?: string;
}

export const useBilleteros = () => {
  const queryClient = useQueryClient();

  // Obtener todos los billeteros
  const { data: billeteros = [], isLoading: billeterosLoading } = useQuery({
    queryKey: ['billeteros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('billeteros')
        .select('*, salas(nombre)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Billetero[];
    },
  });

  // Obtener movimientos de billeteros
  const { data: movimientos = [], isLoading: movimientosLoading } = useQuery({
    queryKey: ['movimientos_billeteros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('movimientos_billeteros')
        .select(`
          *,
          billeteros(codigo, tipo),
          sala_origen:salas!movimientos_billeteros_sala_origen_id_fkey(nombre),
          sala_destino:salas!movimientos_billeteros_sala_destino_id_fkey(nombre)
        `)
        .order('fecha_movimiento', { ascending: false });

      if (error) throw error;
      return data as MovimientoBilletero[];
    },
  });

  // Obtener billeteros filtrados
  const obtenerBilleterosFiltrados = async (filtros: FiltrosBilleteros) => {
    let query = supabase
      .from('billeteros')
      .select('*, salas(nombre)');

    if (filtros.codigo) {
      query = query.ilike('codigo', `%${filtros.codigo}%`);
    }
    if (filtros.serial) {
      query = query.ilike('serial', `%${filtros.serial}%`);
    }
    if (filtros.tipo) {
      query = query.eq('tipo', filtros.tipo);
    }
    if (filtros.estado) {
      query = query.eq('estado', filtros.estado);
    }
    if (filtros.sala_id) {
      query = query.eq('sala_id', filtros.sala_id);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    return data as Billetero[];
  };

  // Validar código único
  const validarCodigoUnico = async (codigo: string, billetteroId?: string) => {
    try {
      const { data, error } = await supabase
        .rpc('validar_codigo_billetero', { 
          p_codigo: codigo,
          p_id: billetteroId || null 
        });
      
      if (error) throw error;
      return data;
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  // Generar código automático
  const generarCodigoAutomatico = async () => {
    const { data, error } = await supabase
      .rpc('generar_codigo_billetero');
    
    if (error) throw error;
    return data as string;
  };

  // Crear billetero
  const crearBilletero = useMutation({
    mutationFn: async (data: CrearBilleteroData) => {
      // Validar código único
      await validarCodigoUnico(data.codigo);

      const { data: billetero, error } = await supabase
        .from('billeteros')
        .insert({
          codigo: data.codigo,
          serial: data.serial,
          tipo: data.tipo,
          estado: data.estado || 'en_stock',
          descripcion: data.descripcion,
          observaciones: data.observaciones,
        })
        .select()
        .single();

      if (error) throw error;
      return billetero;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billeteros'] });
      toast.success('Billetero creado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al crear el billetero');
    },
  });

  // Actualizar billetero
  const actualizarBilletero = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ActualizarBilleteroData }) => {
      // Si se está actualizando el código, validar que sea único
      if (data.codigo) {
        await validarCodigoUnico(data.codigo, id);
      }

      const { data: billetero, error } = await supabase
        .from('billeteros')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return billetero;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billeteros'] });
      toast.success('Billetero actualizado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al actualizar el billetero');
    },
  });

  // Registrar movimiento
  const registrarMovimiento = useMutation({
    mutationFn: async (data: CrearMovimientoBilleteroData) => {
      // Obtener datos del billetero actual
      const { data: billeteroActual, error: billError } = await supabase
        .from('billeteros')
        .select('estado, sala_id, numero_maquina')
        .eq('id', data.billetero_id)
        .single();

      if (billError) throw billError;

      // Validar que solo billeteros en stock puedan asignarse
      if (data.tipo_movimiento === 'asignacion' && billeteroActual.estado !== 'en_stock') {
        throw new Error('Solo se pueden asignar billeteros que están en stock');
      }

      // Determinar el nuevo estado basado en el tipo de movimiento
      let nuevoEstado = billeteroActual.estado;
      
      if (data.tipo_movimiento === 'asignacion') {
        nuevoEstado = 'asignado';
      } else if (data.tipo_movimiento === 'baja') {
        nuevoEstado = 'descarte';
      } else if (data.tipo_movimiento === 'cambio_estado') {
        // Para cambio de estado, mantener el estado actual si no se especifica uno nuevo
        nuevoEstado = billeteroActual.estado;
      }

      // Registrar movimiento
      const { data: movimiento, error: movError } = await supabase
        .from('movimientos_billeteros')
        .insert({
          billetero_id: data.billetero_id,
          tipo_movimiento: data.tipo_movimiento,
          estado_anterior: billeteroActual.estado,
          estado_nuevo: nuevoEstado,
          sala_origen_id: billeteroActual.sala_id,
          sala_destino_id: data.sala_destino_id,
          numero_maquina_anterior: billeteroActual.numero_maquina,
          numero_maquina_nuevo: data.numero_maquina_nuevo,
          motivo: data.motivo,
          observaciones: data.observaciones,
        })
        .select()
        .single();

      if (movError) throw movError;

      // Actualizar el billetero según el tipo de movimiento
      let updateData: any = {};
      
      if (data.tipo_movimiento === 'asignacion') {
        updateData = {
          sala_id: data.sala_destino_id,
          numero_maquina: data.numero_maquina_nuevo,
          estado: 'asignado',
        };
      } else if (data.tipo_movimiento === 'cambio_estado') {
        updateData = {
          estado: nuevoEstado,
        };
      } else if (data.tipo_movimiento === 'baja') {
        updateData = {
          estado: 'descarte',
          sala_id: null,
          numero_maquina: null,
        };
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('billeteros')
          .update(updateData)
          .eq('id', data.billetero_id);

        if (updateError) throw updateError;
      }

      return movimiento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billeteros'] });
      queryClient.invalidateQueries({ queryKey: ['movimientos_billeteros'] });
      toast.success('Movimiento registrado exitosamente');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Error al registrar el movimiento');
    },
  });

  return {
    billeteros,
    movimientos,
    billeterosLoading,
    movimientosLoading,
    obtenerBilleterosFiltrados,
    generarCodigoAutomatico,
    crearBilletero,
    actualizarBilletero,
    registrarMovimiento,
  };
};
