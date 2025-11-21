export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      acciones_sistema: {
        Row: {
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
        }
        Relationships: []
      }
      activos_salas: {
        Row: {
          codigo: string
          created_at: string
          descripcion: string | null
          estado: string
          fecha_asignacion: string
          fecha_baja: string | null
          fecha_compra: string | null
          garantia_meses: number | null
          id: string
          marca: string | null
          modelo: string | null
          nombre: string
          numero_serie: string | null
          observaciones: string | null
          proveedor: string | null
          sala_id: string
          tipo_activo: string
          updated_at: string
          usuario_registro: string
          valor_compra: number | null
        }
        Insert: {
          codigo: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_asignacion?: string
          fecha_baja?: string | null
          fecha_compra?: string | null
          garantia_meses?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre: string
          numero_serie?: string | null
          observaciones?: string | null
          proveedor?: string | null
          sala_id: string
          tipo_activo: string
          updated_at?: string
          usuario_registro?: string
          valor_compra?: number | null
        }
        Update: {
          codigo?: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_asignacion?: string
          fecha_baja?: string | null
          fecha_compra?: string | null
          garantia_meses?: number | null
          id?: string
          marca?: string | null
          modelo?: string | null
          nombre?: string
          numero_serie?: string | null
          observaciones?: string | null
          proveedor?: string | null
          sala_id?: string
          tipo_activo?: string
          updated_at?: string
          usuario_registro?: string
          valor_compra?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activos_salas_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      areas: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      billeteros: {
        Row: {
          codigo: string
          created_at: string
          descripcion: string | null
          estado: string
          fecha_ingreso: string
          id: string
          numero_maquina: string | null
          observaciones: string | null
          sala_id: string | null
          tipo: string
          updated_at: string
          usuario_registro: string
        }
        Insert: {
          codigo: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_ingreso?: string
          id?: string
          numero_maquina?: string | null
          observaciones?: string | null
          sala_id?: string | null
          tipo: string
          updated_at?: string
          usuario_registro?: string
        }
        Update: {
          codigo?: string
          created_at?: string
          descripcion?: string | null
          estado?: string
          fecha_ingreso?: string
          id?: string
          numero_maquina?: string | null
          observaciones?: string | null
          sala_id?: string | null
          tipo?: string
          updated_at?: string
          usuario_registro?: string
        }
        Relationships: [
          {
            foreignKeyName: "billeteros_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string
          room_id: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string
          room_id: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string
          room_id?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          id: string
          joined_at: string
          last_read_at: string | null
          room_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          room_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          last_read_at?: string | null
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "chat_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_rooms: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_group: boolean
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_group?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_group?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      clasificacion_area: {
        Row: {
          activo: boolean
          area_id: string
          clasificacion_id: string
          created_at: string
          id: string
          prioridad_sugerida: string | null
          updated_at: string
        }
        Insert: {
          activo?: boolean
          area_id: string
          clasificacion_id: string
          created_at?: string
          id?: string
          prioridad_sugerida?: string | null
          updated_at?: string
        }
        Update: {
          activo?: boolean
          area_id?: string
          clasificacion_id?: string
          created_at?: string
          id?: string
          prioridad_sugerida?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clasificacion_area_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clasificacion_area_clasificacion_id_fkey"
            columns: ["clasificacion_id"]
            isOneToOne: true
            referencedRelation: "clasificaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      clasificacion_area_mapping: {
        Row: {
          activo: boolean
          area_id: string
          clasificacion_id: string
          created_at: string
          id: string
          prioridad_sugerida: string | null
        }
        Insert: {
          activo?: boolean
          area_id: string
          clasificacion_id: string
          created_at?: string
          id?: string
          prioridad_sugerida?: string | null
        }
        Update: {
          activo?: boolean
          area_id?: string
          clasificacion_id?: string
          created_at?: string
          id?: string
          prioridad_sugerida?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clasificacion_area_mapping_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clasificacion_area_mapping_clasificacion_id_fkey"
            columns: ["clasificacion_id"]
            isOneToOne: false
            referencedRelation: "clasificaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      clasificaciones: {
        Row: {
          activo: boolean
          color: string | null
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          color?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          color?: string | null
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      conceptos_pago: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      conteos_quincenales_maquinas: {
        Row: {
          año: number
          created_at: string
          id: string
          mes: number
          quincena: number
          sala_id: string
          total_incidencias_maquinas: number
          total_maquinas_apagadas: number
          updated_at: string
        }
        Insert: {
          año: number
          created_at?: string
          id?: string
          mes: number
          quincena: number
          sala_id: string
          total_incidencias_maquinas?: number
          total_maquinas_apagadas?: number
          updated_at?: string
        }
        Update: {
          año?: number
          created_at?: string
          id?: string
          mes?: number
          quincena?: number
          sala_id?: string
          total_incidencias_maquinas?: number
          total_maquinas_apagadas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteos_quincenales_maquinas_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      conteos_quincenales_sala: {
        Row: {
          año: number
          created_at: string
          id: string
          mes: number
          minutos_cierres_prematuros: number
          minutos_ingresos_tardios: number
          quincena: number
          sala_id: string
          total_incidencias_cierres: number
          total_incidencias_ingresos: number
          updated_at: string
        }
        Insert: {
          año: number
          created_at?: string
          id?: string
          mes: number
          minutos_cierres_prematuros?: number
          minutos_ingresos_tardios?: number
          quincena: number
          sala_id: string
          total_incidencias_cierres?: number
          total_incidencias_ingresos?: number
          updated_at?: string
        }
        Update: {
          año?: number
          created_at?: string
          id?: string
          mes?: number
          minutos_cierres_prematuros?: number
          minutos_ingresos_tardios?: number
          quincena?: number
          sala_id?: string
          total_incidencias_cierres?: number
          total_incidencias_ingresos?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conteos_quincenales_sala_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_solicitudes_pago: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre_archivo: string
          solicitud_pago_id: string
          tamaño_bytes: number | null
          tipo_archivo: string | null
          url_documento: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_archivo: string
          solicitud_pago_id: string
          tamaño_bytes?: number | null
          tipo_archivo?: string | null
          url_documento: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_archivo?: string
          solicitud_pago_id?: string
          tamaño_bytes?: number | null
          tipo_archivo?: string | null
          url_documento?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_solicitudes_pago_solicitud_pago_id_fkey"
            columns: ["solicitud_pago_id"]
            isOneToOne: false
            referencedRelation: "solicitudes_pago"
            referencedColumns: ["id"]
          },
        ]
      }
      fcm_tokens: {
        Row: {
          created_at: string
          device_type: string | null
          id: string
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          id?: string
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          id?: string
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      imagenes_incidencias: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          incidencia_id: string
          nombre_archivo: string
          tamaño_bytes: number | null
          tipo_archivo: string | null
          url_imagen: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          incidencia_id: string
          nombre_archivo: string
          tamaño_bytes?: number | null
          tipo_archivo?: string | null
          url_imagen: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          incidencia_id?: string
          nombre_archivo?: string
          tamaño_bytes?: number | null
          tipo_archivo?: string | null
          url_imagen?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagenes_incidencias_incidencia_id_fkey"
            columns: ["incidencia_id"]
            isOneToOne: false
            referencedRelation: "incidencias"
            referencedColumns: ["id"]
          },
        ]
      }
      imagenes_solicitudes: {
        Row: {
          created_at: string
          descripcion: string | null
          id: string
          nombre_archivo: string
          solicitud_id: string
          tamaño_bytes: number | null
          tipo_archivo: string | null
          url_imagen: string
        }
        Insert: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_archivo: string
          solicitud_id: string
          tamaño_bytes?: number | null
          tipo_archivo?: string | null
          url_imagen: string
        }
        Update: {
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre_archivo?: string
          solicitud_id?: string
          tamaño_bytes?: number | null
          tipo_archivo?: string | null
          url_imagen?: string
        }
        Relationships: [
          {
            foreignKeyName: "imagenes_solicitudes_solicitud_id_fkey"
            columns: ["solicitud_id"]
            isOneToOne: false
            referencedRelation: "solicitudes"
            referencedColumns: ["id"]
          },
        ]
      }
      incidencia_clasificaciones: {
        Row: {
          clasificacion_id: string
          created_at: string
          id: string
          incidencia_id: string
        }
        Insert: {
          clasificacion_id: string
          created_at?: string
          id?: string
          incidencia_id: string
        }
        Update: {
          clasificacion_id?: string
          created_at?: string
          id?: string
          incidencia_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencia_clasificaciones_clasificacion_id_fkey"
            columns: ["clasificacion_id"]
            isOneToOne: false
            referencedRelation: "clasificaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencia_clasificaciones_incidencia_id_fkey"
            columns: ["incidencia_id"]
            isOneToOne: false
            referencedRelation: "incidencias"
            referencedColumns: ["id"]
          },
        ]
      }
      incidencias: {
        Row: {
          aprobado_por: string | null
          area_id: string
          clasificacion_id: string
          created_at: string
          descripcion: string
          estado: string
          fecha_aprobacion: string | null
          fecha_incidencia: string
          id: string
          observaciones: string | null
          prioridad: string
          reportado_por: string
          sala_id: string | null
          tiempo_minutos: number | null
          titulo: string
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          area_id: string
          clasificacion_id: string
          created_at?: string
          descripcion: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_incidencia?: string
          id?: string
          observaciones?: string | null
          prioridad?: string
          reportado_por: string
          sala_id?: string | null
          tiempo_minutos?: number | null
          titulo: string
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          area_id?: string
          clasificacion_id?: string
          created_at?: string
          descripcion?: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_incidencia?: string
          id?: string
          observaciones?: string | null
          prioridad?: string
          reportado_por?: string
          sala_id?: string | null
          tiempo_minutos?: number | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "incidencias_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_clasificacion_id_fkey"
            columns: ["clasificacion_id"]
            isOneToOne: false
            referencedRelation: "clasificaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "incidencias_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos_sistema: {
        Row: {
          activo: boolean
          codigo: string
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          codigo: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          codigo?: string
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      movimientos_activos: {
        Row: {
          activo_id: string
          created_at: string
          fecha_movimiento: string
          id: string
          motivo: string
          observaciones: string | null
          sala_destino_id: string | null
          sala_origen_id: string | null
          tipo_movimiento: string
          usuario_registro: string
        }
        Insert: {
          activo_id: string
          created_at?: string
          fecha_movimiento?: string
          id?: string
          motivo: string
          observaciones?: string | null
          sala_destino_id?: string | null
          sala_origen_id?: string | null
          tipo_movimiento: string
          usuario_registro?: string
        }
        Update: {
          activo_id?: string
          created_at?: string
          fecha_movimiento?: string
          id?: string
          motivo?: string
          observaciones?: string | null
          sala_destino_id?: string | null
          sala_origen_id?: string | null
          tipo_movimiento?: string
          usuario_registro?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_activos_activo_id_fkey"
            columns: ["activo_id"]
            isOneToOne: false
            referencedRelation: "activos_salas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_activos_sala_destino_id_fkey"
            columns: ["sala_destino_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_activos_sala_origen_id_fkey"
            columns: ["sala_origen_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      movimientos_billeteros: {
        Row: {
          billetero_id: string
          created_at: string
          estado_anterior: string | null
          estado_nuevo: string | null
          fecha_movimiento: string
          id: string
          motivo: string
          numero_maquina_anterior: string | null
          numero_maquina_nuevo: string | null
          observaciones: string | null
          sala_destino_id: string | null
          sala_origen_id: string | null
          tipo_movimiento: string
          usuario_registro: string
        }
        Insert: {
          billetero_id: string
          created_at?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          fecha_movimiento?: string
          id?: string
          motivo: string
          numero_maquina_anterior?: string | null
          numero_maquina_nuevo?: string | null
          observaciones?: string | null
          sala_destino_id?: string | null
          sala_origen_id?: string | null
          tipo_movimiento: string
          usuario_registro?: string
        }
        Update: {
          billetero_id?: string
          created_at?: string
          estado_anterior?: string | null
          estado_nuevo?: string | null
          fecha_movimiento?: string
          id?: string
          motivo?: string
          numero_maquina_anterior?: string | null
          numero_maquina_nuevo?: string | null
          observaciones?: string | null
          sala_destino_id?: string | null
          sala_origen_id?: string | null
          tipo_movimiento?: string
          usuario_registro?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimientos_billeteros_billetero_id_fkey"
            columns: ["billetero_id"]
            isOneToOne: false
            referencedRelation: "billeteros"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_billeteros_sala_destino_id_fkey"
            columns: ["sala_destino_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "movimientos_billeteros_sala_origen_id_fkey"
            columns: ["sala_origen_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_settings: {
        Row: {
          created_at: string | null
          email_notifications: boolean | null
          high_priority_alerts: boolean | null
          id: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email_notifications?: boolean | null
          high_priority_alerts?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email_notifications?: boolean | null
          high_priority_alerts?: boolean | null
          id?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      pagos_724: {
        Row: {
          apellidos: string
          created_at: string
          fecha_pago: string
          foto_documento_url: string | null
          hora_pago: string
          id: string
          monto_pagar: number
          nombres: string
          updated_at: string
          usuario_registro: string
        }
        Insert: {
          apellidos: string
          created_at?: string
          fecha_pago?: string
          foto_documento_url?: string | null
          hora_pago?: string
          id?: string
          monto_pagar: number
          nombres: string
          updated_at?: string
          usuario_registro: string
        }
        Update: {
          apellidos?: string
          created_at?: string
          fecha_pago?: string
          foto_documento_url?: string | null
          hora_pago?: string
          id?: string
          monto_pagar?: number
          nombres?: string
          updated_at?: string
          usuario_registro?: string
        }
        Relationships: []
      }
      permisos_sistema: {
        Row: {
          accion_id: string
          activo: boolean
          area_id: string | null
          created_at: string
          id: string
          modulo_id: string
          rol_id: string
          updated_at: string
        }
        Insert: {
          accion_id: string
          activo?: boolean
          area_id?: string | null
          created_at?: string
          id?: string
          modulo_id: string
          rol_id: string
          updated_at?: string
        }
        Update: {
          accion_id?: string
          activo?: boolean
          area_id?: string | null
          created_at?: string
          id?: string
          modulo_id?: string
          rol_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "permisos_sistema_accion_id_fkey"
            columns: ["accion_id"]
            isOneToOne: false
            referencedRelation: "acciones_sistema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_sistema_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_sistema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permisos_sistema_rol_id_fkey"
            columns: ["rol_id"]
            isOneToOne: false
            referencedRelation: "roles_generales"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          area_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          rol_general_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          area_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          rol_general_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          area_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          rol_general_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_rol_general_id_fkey"
            columns: ["rol_general_id"]
            isOneToOne: false
            referencedRelation: "roles_generales"
            referencedColumns: ["id"]
          },
        ]
      }
      reportes_consolidados: {
        Row: {
          archivo_pdf_url: string | null
          areas_afectadas: number
          created_at: string
          fecha_reporte: string
          id: string
          incidencias_altas: number
          incidencias_bajas: number
          incidencias_criticas: number
          incidencias_medias: number
          salas_afectadas: number
          total_incidencias: number
          updated_at: string
        }
        Insert: {
          archivo_pdf_url?: string | null
          areas_afectadas?: number
          created_at?: string
          fecha_reporte: string
          id?: string
          incidencias_altas?: number
          incidencias_bajas?: number
          incidencias_criticas?: number
          incidencias_medias?: number
          salas_afectadas?: number
          total_incidencias?: number
          updated_at?: string
        }
        Update: {
          archivo_pdf_url?: string | null
          areas_afectadas?: number
          created_at?: string
          fecha_reporte?: string
          id?: string
          incidencias_altas?: number
          incidencias_bajas?: number
          incidencias_criticas?: number
          incidencias_medias?: number
          salas_afectadas?: number
          total_incidencias?: number
          updated_at?: string
        }
        Relationships: []
      }
      role_area_mapping: {
        Row: {
          area_id: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          area_id?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          area_id?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "role_area_mapping_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      roles_generales: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nivel_jerarquia: number
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nivel_jerarquia?: number
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nivel_jerarquia?: number
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      salas: {
        Row: {
          activo: boolean
          created_at: string
          descripcion: string | null
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activo?: boolean
          created_at?: string
          descripcion?: string | null
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      solicitudes: {
        Row: {
          aceptada_por: string | null
          area_id: string
          cerrada_por: string | null
          created_at: string
          descripcion: string
          estado: string
          fecha_aceptacion: string | null
          fecha_cierre: string | null
          fecha_creacion: string
          fecha_inicio_ejecucion: string | null
          horas_transcurridas: number | null
          id: string
          progreso_ejecucion: string | null
          solicitante_id: string
          titulo: string
          updated_at: string
        }
        Insert: {
          aceptada_por?: string | null
          area_id: string
          cerrada_por?: string | null
          created_at?: string
          descripcion: string
          estado?: string
          fecha_aceptacion?: string | null
          fecha_cierre?: string | null
          fecha_creacion?: string
          fecha_inicio_ejecucion?: string | null
          horas_transcurridas?: number | null
          id?: string
          progreso_ejecucion?: string | null
          solicitante_id: string
          titulo: string
          updated_at?: string
        }
        Update: {
          aceptada_por?: string | null
          area_id?: string
          cerrada_por?: string | null
          created_at?: string
          descripcion?: string
          estado?: string
          fecha_aceptacion?: string | null
          fecha_cierre?: string | null
          fecha_creacion?: string
          fecha_inicio_ejecucion?: string | null
          horas_transcurridas?: number | null
          id?: string
          progreso_ejecucion?: string | null
          solicitante_id?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      solicitudes_pago: {
        Row: {
          aprobado_por: string | null
          concepto_pago_id: string
          created_at: string
          descripcion: string
          estado: string
          fecha_aprobacion: string | null
          fecha_pago: string | null
          id: string
          monto: number
          numero_solicitud: string
          observaciones: string | null
          sala_id: string
          solicitante_id: string
          updated_at: string
        }
        Insert: {
          aprobado_por?: string | null
          concepto_pago_id: string
          created_at?: string
          descripcion: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_pago?: string | null
          id?: string
          monto: number
          numero_solicitud?: string
          observaciones?: string | null
          sala_id: string
          solicitante_id: string
          updated_at?: string
        }
        Update: {
          aprobado_por?: string | null
          concepto_pago_id?: string
          created_at?: string
          descripcion?: string
          estado?: string
          fecha_aprobacion?: string | null
          fecha_pago?: string | null
          id?: string
          monto?: number
          numero_solicitud?: string
          observaciones?: string | null
          sala_id?: string
          solicitante_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "solicitudes_pago_aprobado_por_fkey1"
            columns: ["aprobado_por"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_pago_concepto_pago_id_fkey"
            columns: ["concepto_pago_id"]
            isOneToOne: false
            referencedRelation: "conceptos_pago"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_pago_sala_id_fkey"
            columns: ["sala_id"]
            isOneToOne: false
            referencedRelation: "salas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solicitudes_pago_solicitante_id_fkey"
            columns: ["solicitante_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_actions: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_email: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_email: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_email?: string
          user_id?: string
        }
        Relationships: []
      }
      user_area_access: {
        Row: {
          area_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_area_access_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
        ]
      }
      user_area_assignments: {
        Row: {
          area_id: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          area_id: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          area_id?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_area_assignments_area_id_fkey"
            columns: ["area_id"]
            isOneToOne: false
            referencedRelation: "areas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_area_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      estadisticas_pagos_724: {
        Row: {
          fecha_pago: string | null
          pago_maximo: number | null
          pago_minimo: number | null
          promedio_pago: number | null
          suma_total: number | null
          total_pagos: number | null
        }
        Relationships: []
      }
      vista_consolidados_detallados: {
        Row: {
          archivo_pdf_url: string | null
          areas_afectadas: number | null
          created_at: string | null
          fecha_reporte: string | null
          id: string | null
          incidencias_altas: number | null
          incidencias_bajas: number | null
          incidencias_criticas: number | null
          incidencias_detalle: Json | null
          incidencias_medias: number | null
          salas_afectadas: number | null
          total_incidencias: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      actualizar_conteo_quincenal_maquinas: {
        Args: {
          p_cantidad_maquinas: number
          p_fecha?: string
          p_sala_id: string
        }
        Returns: boolean
      }
      actualizar_conteo_quincenal_sala: {
        Args: {
          p_fecha?: string
          p_minutos: number
          p_sala_id: string
          p_tipo_incidencia: string
        }
        Returns: boolean
      }
      add_participant_to_group: {
        Args: {
          _new_participant_id: string
          _room_id: string
          _user_id: string
        }
        Returns: boolean
      }
      aprobar_incidencia: {
        Args: { incidencia_id: string; nuevo_estado: string }
        Returns: boolean
      }
      calcular_dias_pendientes: {
        Args: { p_solicitud_id: string }
        Returns: number
      }
      calcular_horas_solicitud: {
        Args: { p_solicitud_id: string }
        Returns: number
      }
      create_group_chat: {
        Args: {
          _creator_id: string
          _description: string
          _name: string
          _participant_ids: string[]
        }
        Returns: string
      }
      create_private_chat: {
        Args: { _user1_id: string; _user2_id: string }
        Returns: string
      }
      delete_user_fcm_tokens: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      formatear_tiempo_tradicional: {
        Args: { minutos_totales: number }
        Returns: string
      }
      generar_codigo_activo: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generar_codigo_billetero: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      generar_reporte_consolidado: {
        Args: { fecha_objetivo?: string }
        Returns: string
      }
      get_notification_admins: {
        Args: Record<PropertyKey, never>
        Returns: {
          email: string
          full_name: string
          id: string
          role: string
        }[]
      }
      get_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_fcm_token: {
        Args: { p_device_type?: string; p_token: string; p_user_id: string }
        Returns: undefined
      }
      log_user_action: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_ip_address?: string
          p_resource_id?: string
          p_resource_type?: string
          p_user_agent?: string
        }
        Returns: string
      }
      mark_messages_as_read: {
        Args: { _room_id: string; _user_id: string }
        Returns: number
      }
      obtener_areas_sugeridas_multiple: {
        Args: { clasificacion_ids: string[] }
        Returns: {
          area_id: string
          area_nombre: string
          prioridad_sugerida: string
        }[]
      }
      obtener_consolidado_con_medios: {
        Args: { fecha_consolidado: string }
        Returns: Json
      }
      obtener_conteo_quincenal_maquinas: {
        Args: { p_fecha?: string; p_sala_id: string }
        Returns: string
      }
      obtener_conteo_quincenal_sala: {
        Args: { p_fecha?: string; p_sala_id: string }
        Returns: string
      }
      obtener_estadisticas_generales_724: {
        Args: Record<PropertyKey, never>
        Returns: {
          pagos_hoy: number
          pagos_mes_actual: number
          suma_hoy: number
          suma_mes_actual: number
          suma_total_historica: number
          total_pagos_historico: number
        }[]
      }
      obtener_estadisticas_quincenales_maquinas: {
        Args: { p_año?: number; p_mes?: number }
        Returns: {
          año: number
          mes: number
          quincena: number
          sala_id: string
          sala_nombre: string
          total_incidencias_maquinas: number
          total_maquinas_apagadas: number
        }[]
      }
      obtener_estadisticas_quincenales_sala: {
        Args: { p_año?: number; p_mes?: number }
        Returns: {
          año: number
          mes: number
          minutos_cierres_prematuros: number
          minutos_ingresos_tardios: number
          quincena: number
          sala_id: string
          sala_nombre: string
          total_incidencias_cierres: number
          total_incidencias_ingresos: number
          total_minutos: number
        }[]
      }
      obtener_estadisticas_solicitudes_pago: {
        Args: Record<PropertyKey, never>
        Returns: {
          monto_total_aprobado: number
          monto_total_pagado: number
          monto_total_pendiente: number
          solicitudes_aprobadas: number
          solicitudes_pagadas: number
          solicitudes_pendientes: number
          solicitudes_rechazadas: number
          total_solicitudes: number
        }[]
      }
      recalcular_conteos_quincenales: {
        Args: { p_año?: number; p_mes?: number }
        Returns: string
      }
      user_can_access_chat_room: {
        Args: { _room_id: string; _user_id: string }
        Returns: boolean
      }
      user_has_area_access: {
        Args: { _area_id: string; _user_id: string }
        Returns: boolean
      }
      usuario_tiene_permiso: {
        Args: {
          _accion_codigo: string
          _modulo_codigo: string
          _user_id: string
        }
        Returns: boolean
      }
      validar_codigo_activo: {
        Args: { p_codigo: string; p_id?: string }
        Returns: boolean
      }
      validar_codigo_billetero: {
        Args: { p_codigo: string; p_id?: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "monitor"
        | "supervisor_monitoreo"
        | "rrhh"
        | "supervisor_salas"
        | "finanzas"
        | "mantenimiento"
        | "tecnico"
        | "lector"
        | "gestor_solicitudes"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "monitor",
        "supervisor_monitoreo",
        "rrhh",
        "supervisor_salas",
        "finanzas",
        "mantenimiento",
        "tecnico",
        "lector",
        "gestor_solicitudes",
      ],
    },
  },
} as const
