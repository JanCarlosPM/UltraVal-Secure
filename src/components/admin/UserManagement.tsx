import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Key,
  Building,
  Database,
  Tag,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Database as DatabaseType } from "@/integrations/supabase/types";
import BackupManagement from "./BackupManagement";

type AppRole = DatabaseType["public"]["Enums"]["app_role"];

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

interface Area {
  id: string;
  nombre: string;
  descripcion?: string | null;
  activo?: boolean;
}

interface Sala {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

interface Clasificacion {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: string | null;
  activo: boolean;
}

interface UserAreaAccess {
  id: string;
  user_id: string;
  area_id: string;
  area?: Area;
}

const UserManagement = () => {
  const { resetPassword } = useAuth();
  const queryClient = useQueryClient();

  // Usuario seleccionado para editar / reset / eliminar
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);

  // Dialogs principales existentes
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isResetPasswordDialogOpen, setIsResetPasswordDialogOpen] =
    useState(false);

  // Nuevos dialogs
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddRoleDialogOpen, setIsAddRoleDialogOpen] = useState(false);
  const [isAddTipoDialogOpen, setIsAddTipoDialogOpen] = useState(false);
  const [isAddSucursalDialogOpen, setIsAddSucursalDialogOpen] = useState(false);
  const [isAddAreaDialogOpen, setIsAddAreaDialogOpen] = useState(false);

  // Dialogs para editar / eliminar catálogos
  const [isEditTipoDialogOpen, setIsEditTipoDialogOpen] = useState(false);
  const [isDeleteTipoDialogOpen, setIsDeleteTipoDialogOpen] = useState(false);
  const [isEditSucursalDialogOpen, setIsEditSucursalDialogOpen] =
    useState(false);
  const [isDeleteSucursalDialogOpen, setIsDeleteSucursalDialogOpen] =
    useState(false);
  const [isEditAreaDialogOpen, setIsEditAreaDialogOpen] = useState(false);
  const [isDeleteAreaDialogOpen, setIsDeleteAreaDialogOpen] = useState(false);

  // Estados de formularios
  const [newPassword, setNewPassword] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedAreas, setSelectedAreas] = useState<string[]>([]);

  // Form "Agregar Usuario"
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserFullName, setNewUserFullName] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole | "">("");
  const [newUserPassword, setNewUserPassword] = useState("");

  // Form "Agregar Rol"
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [newRoleLevel, setNewRoleLevel] = useState("1");

  // Form "Agregar Tipo de Incidencia"
  const [newTipoNombre, setNewTipoNombre] = useState("");
  const [newTipoDescripcion, setNewTipoDescripcion] = useState("");
  const [newTipoColor, setNewTipoColor] = useState("#6B7280");
  const [newTipoAreaId, setNewTipoAreaId] = useState("");
  const [newTipoPrioridad, setNewTipoPrioridad] = useState("media");

  // Form "Agregar Sucursal"
  const [newSucursalNombre, setNewSucursalNombre] = useState("");
  const [newSucursalDescripcion, setNewSucursalDescripcion] = useState("");

  // Form "Agregar Área"
  const [newAreaNombre, setNewAreaNombre] = useState("");
  const [newAreaDescripcion, setNewAreaDescripcion] = useState("");

  // Seleccionados para edición/eliminación de catálogos
  const [selectedTipo, setSelectedTipo] = useState<Clasificacion | null>(null);
  const [selectedSala, setSelectedSala] = useState<Sala | null>(null);
  const [editingArea, setEditingArea] = useState<Area | null>(null);

  // ===== QUERIES =====

  // Usuarios
  const { data: users, isLoading } = useQuery({
    queryKey: ["users-management"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Profile[];
    },
  });

  // Áreas
  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas")
        .select("*")
        .order("nombre");

      if (error) throw error;
      return data as Area[];
    },
  });

  // Sucursales (salas)
  const { data: salas } = useQuery({
    queryKey: ["salas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salas")
        .select("*")
        .order("nombre");

      if (error) throw error;
      return data as Sala[];
    },
  });

  // Tipos de incidencia (clasificaciones)
  const { data: clasificaciones } = useQuery({
    queryKey: ["clasificaciones"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clasificaciones")
        .select("*")
        .order("nombre");

      if (error) throw error;
      return data as Clasificacion[];
    },
  });

  // Accesos de áreas por usuario
  const { data: userAreaAccess } = useQuery({
    queryKey: ["user-area-access", selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return [];

      const { data, error } = await supabase
        .from("user_area_access")
        .select(
          `
          *,
          area:areas!user_area_access_area_id_fkey(*)
        `
        )
        .eq("user_id", selectedUser.id);

      if (error) throw error;
      return data as UserAreaAccess[];
    },
    enabled: !!selectedUser,
  });

  // ===== MUTATIONS =====

  // Actualizar usuario
  const updateUserMutation = useMutation({
    mutationFn: async ({
      userId,
      updates,
      areaIds,
    }: {
      userId: string;
      updates: Partial<Profile>;
      areaIds?: string[];
    }) => {
      const { error: profileError } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", userId);

      if (profileError) throw profileError;

      if (areaIds !== undefined) {
        const { error: deleteError } = await supabase
          .from("user_area_access")
          .delete()
          .eq("user_id", userId);
        if (deleteError) throw deleteError;

        if (areaIds.length > 0) {
          const accesses = areaIds.map((areaId) => ({
            user_id: userId,
            area_id: areaId,
          }));
          const { error: insertError } = await supabase
            .from("user_area_access")
            .insert(accesses);
          if (insertError) throw insertError;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
      queryClient.invalidateQueries({ queryKey: ["user-area-access"] });
      toast.success("Usuario actualizado correctamente");
      setIsEditDialogOpen(false);
      setSelectedUser(null);
      setSelectedAreas([]);
    },
    onError: (error) => {
      console.error("Error updating user:", error);
      toast.error("Error al actualizar usuario");
    },
  });

  // Reset password (usa Cloud Function admin-reset-password)
  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.functions.invoke(
        "admin-reset-password",
        {
          body: { email, newPassword: password },
        }
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente");
      setIsResetPasswordDialogOpen(false);
      setSelectedUser(null);
      setNewPassword("");
    },
    onError: (error) => {
      console.error("Error resetting password:", error);
      toast.error("Error al actualizar la contraseña");
    },
  });

  // Eliminar usuario
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
      toast.success("Usuario eliminado correctamente");
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    },
    onError: (error) => {
      console.error("Error deleting user:", error);
      toast.error(
        "Error al eliminar usuario. Puede tener incidencias u otros datos asociados."
      );
    },
  });

  // Agregar Usuario (requiere Edge Function admin-create-user)
  const addUserMutation = useMutation({
    mutationFn: async () => {
      if (!newUserEmail.trim() || !newUserPassword.trim()) {
        throw new Error("Email y contraseña son obligatorios");
      }
      if (!newUserRole) {
        throw new Error("Debes seleccionar un rol");
      }

      const { data, error } = await supabase.functions.invoke(
        "admin-create-user",
        {
          body: {
            email: newUserEmail.trim(),
            password: newUserPassword,
            full_name: newUserFullName.trim() || null,
            role: newUserRole,
          },
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Usuario creado correctamente");
      setIsAddUserDialogOpen(false);
      setNewUserEmail("");
      setNewUserFullName("");
      setNewUserPassword("");
      setNewUserRole("");
      queryClient.invalidateQueries({ queryKey: ["users-management"] });
    },
    onError: (error: any) => {
      console.error("Error creando usuario:", error);
      toast.error(
        error?.message ||
          "Error al crear usuario. Asegúrate de tener la función admin-create-user configurada."
      );
    },
  });

  // Agregar Rol → roles_generales
  const addRoleMutation = useMutation({
    mutationFn: async () => {
      if (!newRoleName.trim()) {
        throw new Error("El nombre del rol es obligatorio");
      }

      const nivel = parseInt(newRoleLevel, 10);
      const nivel_jerarquia = Number.isNaN(nivel) ? 1 : nivel;

      const { error } = await supabase.from("roles_generales").insert([
        {
          nombre: newRoleName.trim(),
          descripcion: newRoleDescription.trim() || null,
          nivel_jerarquia,
          activo: true,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rol agregado correctamente");
      setIsAddRoleDialogOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setNewRoleLevel("1");
      queryClient.invalidateQueries({ queryKey: ["roles_generales"] });
    },
    onError: (error: any) => {
      console.error("Error agregando rol:", error);
      if (error?.code === "23505") {
        toast.error("Ya existe un rol con ese nombre");
      } else {
        toast.error("Error al agregar el rol");
      }
    },
  });

  // Agregar Tipo de Incidencia → clasificaciones + clasificacion_area_mapping
  const addTipoMutation = useMutation({
    mutationFn: async () => {
      if (!newTipoNombre.trim()) {
        throw new Error("El nombre del tipo es obligatorio");
      }
      if (!newTipoAreaId) {
        throw new Error("Debes seleccionar un área asociada");
      }
      if (!newTipoPrioridad) {
        throw new Error("Debes seleccionar una prioridad sugerida");
      }

      // 1) Crear clasificación
      const { data: clasif, error: clasifError } = await supabase
        .from("clasificaciones")
        .insert({
          nombre: newTipoNombre.trim(),
          descripcion: newTipoDescripcion.trim() || null,
          color: newTipoColor || "#6B7280",
          activo: true,
        })
        .select("id")
        .single();

      if (clasifError || !clasif) {
        console.error("Error creando clasificación:", clasifError);
        throw new Error("No se pudo crear la clasificación");
      }

      // 2) Crear mapping clasificacion-area-prioridad
      const { error: mappingError } = await supabase
        .from("clasificacion_area_mapping")
        .insert({
          clasificacion_id: clasif.id,
          area_id: newTipoAreaId,
          prioridad_sugerida: newTipoPrioridad,
          activo: true,
        });

      if (mappingError) {
        console.error("Error creando mapping:", mappingError);
        throw new Error(
          "La clasificación se creó, pero falló la relación con el área"
        );
      }
    },
    onSuccess: () => {
      toast.success("Tipo de incidencia agregado correctamente");
      setIsAddTipoDialogOpen(false);
      setNewTipoNombre("");
      setNewTipoDescripcion("");
      setNewTipoColor("#6B7280");
      setNewTipoAreaId("");
      setNewTipoPrioridad("media");
      queryClient.invalidateQueries({ queryKey: ["clasificaciones"] });
      queryClient.invalidateQueries({
        queryKey: ["clasificacion_area_mapping"],
      });
    },
    onError: (error: any) => {
      console.error("Error agregando tipo de incidencia:", error);
      toast.error(error?.message || "Error al agregar el tipo de incidencia");
    },
  });

  // Agregar Sucursal → salas
  const addSucursalMutation = useMutation({
    mutationFn: async () => {
      if (!newSucursalNombre.trim()) {
        throw new Error("El nombre de la sucursal es obligatorio");
      }

      const { error } = await supabase.from("salas").insert([
        {
          nombre: newSucursalNombre.trim(),
          descripcion: newSucursalDescripcion.trim() || null,
          activo: true,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sucursal agregada correctamente");
      setIsAddSucursalDialogOpen(false);
      setNewSucursalNombre("");
      setNewSucursalDescripcion("");
      queryClient.invalidateQueries({ queryKey: ["salas"] });
    },
    onError: (error) => {
      console.error("Error agregando sucursal:", error);
      toast.error("Error al agregar la sucursal");
    },
  });

  // Agregar Área → areas
  const addAreaMutation = useMutation({
    mutationFn: async () => {
      if (!newAreaNombre.trim()) {
        throw new Error("El nombre del área es obligatorio");
      }

      const { error } = await supabase.from("areas").insert([
        {
          nombre: newAreaNombre.trim(),
          descripcion: newAreaDescripcion.trim() || null,
          activo: true,
        },
      ]);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Área agregada correctamente");
      setIsAddAreaDialogOpen(false);
      setNewAreaNombre("");
      setNewAreaDescripcion("");
      queryClient.invalidateQueries({ queryKey: ["areas"] });
    },
    onError: (error) => {
      console.error("Error agregando área:", error);
      toast.error("Error al agregar el área");
    },
  });

  // ===== MUTATIONS EDIT/DELETE CATÁLOGOS =====

  const updateTipoMutation = useMutation({
    mutationFn: async ({
      id,
      nombre,
      descripcion,
      color,
    }: {
      id: string;
      nombre: string;
      descripcion: string | null;
      color: string | null;
    }) => {
      const { error } = await supabase
        .from("clasificaciones")
        .update({ nombre, descripcion, color })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipo de incidencia actualizado correctamente");
      setIsEditTipoDialogOpen(false);
      setSelectedTipo(null);
      queryClient.invalidateQueries({ queryKey: ["clasificaciones"] });
    },
    onError: (error) => {
      console.error("Error actualizando tipo de incidencia:", error);
      toast.error("Error al actualizar el tipo de incidencia");
    },
  });

  const deleteTipoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("clasificaciones")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tipo de incidencia eliminado correctamente");
      setIsDeleteTipoDialogOpen(false);
      setSelectedTipo(null);
      queryClient.invalidateQueries({ queryKey: ["clasificaciones"] });
    },
    onError: (error) => {
      console.error("Error eliminando tipo de incidencia:", error);
      toast.error(
        "No se pudo eliminar. Puede estar siendo utilizado en incidencias."
      );
    },
  });

  const updateSucursalMutation = useMutation({
    mutationFn: async ({
      id,
      nombre,
      descripcion,
    }: {
      id: string;
      nombre: string;
      descripcion: string | null;
    }) => {
      const { error } = await supabase
        .from("salas")
        .update({ nombre, descripcion })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sucursal actualizada correctamente");
      setIsEditSucursalDialogOpen(false);
      setSelectedSala(null);
      queryClient.invalidateQueries({ queryKey: ["salas"] });
    },
    onError: (error) => {
      console.error("Error actualizando sucursal:", error);
      toast.error("Error al actualizar la sucursal");
    },
  });

  const deleteSucursalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salas").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sucursal eliminada correctamente");
      setIsDeleteSucursalDialogOpen(false);
      setSelectedSala(null);
      queryClient.invalidateQueries({ queryKey: ["salas"] });
    },
    onError: (error) => {
      console.error("Error eliminando sucursal:", error);
      toast.error(
        "No se pudo eliminar. Puede tener incidencias u otros datos asociados."
      );
    },
  });

  const updateAreaMutation = useMutation({
    mutationFn: async ({
      id,
      nombre,
      descripcion,
    }: {
      id: string;
      nombre: string;
      descripcion: string | null;
    }) => {
      const { error } = await supabase
        .from("areas")
        .update({ nombre, descripcion })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Área actualizada correctamente");
      setIsEditAreaDialogOpen(false);
      setEditingArea(null);
      queryClient.invalidateQueries({ queryKey: ["areas"] });
    },
    onError: (error) => {
      console.error("Error actualizando área:", error);
      toast.error("Error al actualizar el área");
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("areas").delete().eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Área eliminada correctamente");
      setIsDeleteAreaDialogOpen(false);
      setEditingArea(null);
      queryClient.invalidateQueries({ queryKey: ["areas"] });
    },
    onError: (error) => {
      console.error("Error eliminando área:", error);
      toast.error(
        "No se pudo eliminar. Puede estar asociada a incidencias u otros registros."
      );
    },
  });

  // ===== HANDLERS =====

  const handleEditUser = (user: Profile) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);

    if (
      ["finanzas", "rrhh", "supervisor_salas", "gestor_solicitudes"].includes(
        user.role
      )
    ) {
      queryClient.invalidateQueries({
        queryKey: ["user-area-access", user.id],
      });
    }
  };

  const handleDeleteUser = (user: Profile) => {
    setSelectedUser(user);
    setIsDeleteDialogOpen(true);
  };

  const handleResetPassword = (user: Profile) => {
    setSelectedUser(user);
    setIsResetPasswordDialogOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const role = formData.get("role") as AppRole;

    const updates: Partial<Profile> = {
      full_name: (formData.get("fullName") as string) || null,
      role,
    };

    const requiresAreaAccess = [
      "finanzas",
      "rrhh",
      "supervisor_salas",
      "gestor_solicitudes",
    ].includes(role);

    updateUserMutation.mutate({
      userId: selectedUser.id,
      updates,
      areaIds: requiresAreaAccess ? selectedAreas : undefined,
    });
  };

  const handleUpdateTipo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTipo) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const nombre = (formData.get("nombre") as string).trim();
    const descripcion =
      ((formData.get("descripcion") as string) || "").trim() || null;
    const color = (formData.get("color") as string) || null;

    if (!nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }

    updateTipoMutation.mutate({
      id: selectedTipo.id,
      nombre,
      descripcion,
      color,
    });
  };

  const handleUpdateSucursal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSala) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const nombre = (formData.get("nombre") as string).trim();
    const descripcion =
      ((formData.get("descripcion") as string) || "").trim() || null;

    if (!nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }

    updateSucursalMutation.mutate({
      id: selectedSala.id,
      nombre,
      descripcion,
    });
  };

  const handleUpdateArea = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingArea) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const nombre = (formData.get("nombre") as string).trim();
    const descripcion =
      ((formData.get("descripcion") as string) || "").trim() || null;

    if (!nombre) {
      toast.error("El nombre es obligatorio");
      return;
    }

    updateAreaMutation.mutate({
      id: editingArea.id,
      nombre,
      descripcion,
    });
  };

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case "admin":
        return (
          <Badge variant="destructive" className="gap-1">
            <Shield className="h-3 w-3" />
            Administrador
          </Badge>
        );
      case "monitor":
        return (
          <Badge variant="secondary" className="gap-1">
            <Users className="h-3 w-3" />
            Monitor
          </Badge>
        );
      case "supervisor_monitoreo":
        return (
          <Badge variant="outline" className="gap-1">
            <Users className="h-3 w-3" />
            Supervisor Monitoreo
          </Badge>
        );
      case "rrhh":
        return (
          <Badge className="gap-1">
            <Building className="h-3 w-3" />
            RRHH
          </Badge>
        );
      case "supervisor_salas":
        return (
          <Badge className="gap-1 bg-purple-600">
            <Building className="h-3 w-3" />
            Supervisor Salas
          </Badge>
        );
      case "finanzas":
        return (
          <Badge className="gap-1 bg-green-600">
            <Building className="h-3 w-3" />
            Finanzas
          </Badge>
        );
      case "mantenimiento":
        return (
          <Badge className="gap-1 bg-orange-600">
            <Building className="h-3 w-3" />
            Mantenimiento
          </Badge>
        );
      case "tecnico":
        return (
          <Badge className="gap-1 bg-blue-600">
            <Building className="h-3 w-3" />
            Técnico
          </Badge>
        );
      case "lector":
        return (
          <Badge className="gap-1 bg-gray-600">
            <Users className="h-3 w-3" />
            Lector
          </Badge>
        );
      case "gestor_solicitudes":
        return (
          <Badge className="gap-1 bg-indigo-600">
            <Building className="h-3 w-3" />
            Gestor Solicitudes
          </Badge>
        );
      default:
        return <Badge variant="outline">Sin rol</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  // ===== RENDER =====

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Panel de Administración
          </h1>
          <p className="text-gray-600">
            Gestiona usuarios, sucursales, áreas y tipos de incidencias.
          </p>
        </div>
        <Badge variant="outline" className="px-3 py-1">
          Total: {users?.length || 0} usuarios
        </Badge>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Gestiones Generales
          </TabsTrigger>
          <TabsTrigger value="backups" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Backups del Sistema
          </TabsTrigger>
        </TabsList>

        {/* ===== TAB USERS ===== */}
        <TabsContent value="users" className="space-y-6 mt-6">
          {/* Acciones rápidas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
              <CardDescription>Catálogos y configuración</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3 justify-end">
                <Button
                  className="gap-2"
                  variant="outline"
                  onClick={() => setIsAddTipoDialogOpen(true)}
                >
                  <Tag className="h-4 w-4" />
                  Agregar Tipo de Incidencia
                </Button>
                <Button
                  className="gap-2"
                  variant="outline"
                  onClick={() => setIsAddSucursalDialogOpen(true)}
                >
                  <Building className="h-4 w-4" />
                  Agregar Sucursal
                </Button>
                <Button
                  className="gap-2"
                  variant="outline"
                  onClick={() => setIsAddAreaDialogOpen(true)}
                >
                  <MapPin className="h-4 w-4" />
                  Agregar Área
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Búsqueda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Búsqueda de Usuarios</CardTitle>
              <CardDescription>Filtra por correo o nombre</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-w-md">
                <Label htmlFor="search">Buscar usuario</Label>
                <Input
                  id="search"
                  placeholder="Buscar por email o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tabla usuarios */}
          <Card>
            <CardHeader>
              <CardTitle>Lista de Usuarios</CardTitle>
              <CardDescription>
                Gestiona los usuarios registrados en el sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Rol</TableHead>
                      <TableHead>Fecha de Registro</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <Users className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium">
                                {user.full_name || "Sin nombre"}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {user.id.slice(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            {user.email}
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          {format(
                            new Date(user.created_at),
                            "dd/MM/yyyy HH:mm",
                            { locale: es }
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditUser(user)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleResetPassword(user)}
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!filteredUsers || filteredUsers.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-8 w-8 text-gray-400" />
                            <p className="text-gray-500">
                              No se encontraron usuarios
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* ===== CARDS DE CATÁLOGOS ===== */}
          {/* Tipos de incidencia */}
          <Card>
            <CardHeader>
              <CardTitle>Tipos de Incidencia</CardTitle>
              <CardDescription>
                Clasificaciones configuradas para las incidencias
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {clasificaciones?.map((tipo) => (
                      <TableRow key={tipo.id}>
                        <TableCell className="font-medium">
                          {tipo.nombre}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-4 w-4 rounded-full border"
                              style={{
                                backgroundColor: tipo.color || "#6B7280",
                              }}
                            />
                            <span className="text-xs text-gray-500">
                              {tipo.color}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm text-gray-600 line-clamp-2">
                            {tipo.descripcion || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTipo(tipo);
                                setIsEditTipoDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!clasificaciones || clasificaciones.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6">
                          <p className="text-gray-500 text-sm">
                            No hay tipos de incidencia registrados.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Sucursales */}
          <Card>
            <CardHeader>
              <CardTitle>Sucursales / Salas</CardTitle>
              <CardDescription>
                Salas disponibles para asignar incidencias y solicitudes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salas?.map((sala) => (
                      <TableRow key={sala.id}>
                        <TableCell className="font-medium">
                          {sala.nombre}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm text-gray-600 line-clamp-2">
                            {sala.descripcion || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSala(sala);
                                setIsEditSucursalDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!salas || salas.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6">
                          <p className="text-gray-500 text-sm">
                            No hay sucursales registradas.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Áreas */}
          <Card>
            <CardHeader>
              <CardTitle>Áreas</CardTitle>
              <CardDescription>
                Áreas responsables utilizadas en incidencias y permisos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {areas?.map((area) => (
                      <TableRow key={area.id}>
                        <TableCell className="font-medium">
                          {area.nombre}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <span className="text-sm text-gray-600 line-clamp-2">
                            {area.descripcion || "-"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingArea(area);
                                setIsEditAreaDialogOpen(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!areas || areas.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-6">
                          <p className="text-gray-500 text-sm">
                            No hay áreas registradas.
                          </p>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Dialog: Editar Usuario */}
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Editar Usuario</DialogTitle>
                <DialogDescription>
                  Modifica la información y permisos del usuario
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleUpdateUser}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      value={selectedUser?.email || ""}
                      disabled
                      className="bg-gray-50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nombre Completo</Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      defaultValue={selectedUser?.full_name || ""}
                      placeholder="Nombre completo del usuario"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Rol</Label>
                    <Select
                      name="role"
                      defaultValue={selectedUser?.role}
                      onValueChange={(value: AppRole) => {
                        const requiresAreaAccess = [
                          "finanzas",
                          "rrhh",
                          "supervisor_salas",
                          "gestor_solicitudes",
                        ].includes(value);
                        if (!requiresAreaAccess) {
                          setSelectedAreas([]);
                        } else {
                          const currentAreas =
                            userAreaAccess?.map((a) => a.area_id) || [];
                          setSelectedAreas(currentAreas);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar rol" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="monitor">Monitor</SelectItem>
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="supervisor_monitoreo">
                          Supervisor de Monitoreo
                        </SelectItem>
                        <SelectItem value="rrhh">RRHH</SelectItem>
                        <SelectItem value="supervisor_salas">
                          Supervisor de Salas
                        </SelectItem>
                        <SelectItem value="finanzas">Finanzas</SelectItem>
                        <SelectItem value="mantenimiento">
                          Mantenimiento
                        </SelectItem>
                        <SelectItem value="tecnico">Técnico</SelectItem>
                        <SelectItem value="lector">Lector</SelectItem>
                        <SelectItem value="gestor_solicitudes">
                          Gestor de Solicitudes
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Áreas para roles específicos */}
                  {selectedUser &&
                    [
                      "finanzas",
                      "rrhh",
                      "supervisor_salas",
                      "gestor_solicitudes",
                    ].includes(selectedUser.role) && (
                      <div className="space-y-2">
                        <Label>Áreas de Acceso</Label>
                        <div className="border rounded-lg p-4 max-h-48 overflow-y-auto">
                          {areas?.map((area) => (
                            <div
                              key={area.id}
                              className="flex items-center space-x-2 py-1"
                            >
                              <Checkbox
                                id={`area-${area.id}`}
                                checked={selectedAreas.includes(area.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedAreas((prev) => [
                                      ...prev,
                                      area.id,
                                    ]);
                                  } else {
                                    setSelectedAreas((prev) =>
                                      prev.filter((id) => id !== area.id)
                                    );
                                  }
                                }}
                              />
                              <Label
                                htmlFor={`area-${area.id}`}
                                className="text-sm"
                              >
                                {area.nombre}
                              </Label>
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-gray-500">
                          El usuario verá incidencias solo de las áreas
                          seleccionadas.
                        </p>
                      </div>
                    )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={updateUserMutation.isPending}>
                    {updateUserMutation.isPending
                      ? "Actualizando..."
                      : "Actualizar Usuario"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Dialog: Reset Password */}
          <Dialog
            open={isResetPasswordDialogOpen}
            onOpenChange={setIsResetPasswordDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cambiar Contraseña</DialogTitle>
                <DialogDescription>
                  Establece una nueva contraseña para el usuario{" "}
                  {selectedUser?.email}
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nueva Contraseña</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa la nueva contraseña"
                    minLength={6}
                  />
                  <p className="text-xs text-gray-500">
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsResetPasswordDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() =>
                    resetPasswordMutation.mutate({
                      email: selectedUser!.email,
                      password: newPassword,
                    })
                  }
                  disabled={resetPasswordMutation.isPending || !newPassword}
                >
                  {resetPasswordMutation.isPending
                    ? "Actualizando..."
                    : "Actualizar Contraseña"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Agregar Rol */}
          <Dialog
            open={isAddRoleDialogOpen}
            onOpenChange={setIsAddRoleDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Rol</DialogTitle>
                <DialogDescription>
                  Crea un nuevo rol general del sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nombre del Rol</Label>
                  <Input
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Ej: Supervisor Operaciones"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={newRoleDescription}
                    onChange={(e) => setNewRoleDescription(e.target.value)}
                    placeholder="Descripción opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Nivel de Jerarquía</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newRoleLevel}
                    onChange={(e) => setNewRoleLevel(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddRoleDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => addRoleMutation.mutate()}
                  disabled={addRoleMutation.isPending}
                >
                  {addRoleMutation.isPending ? "Guardando..." : "Guardar Rol"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Agregar Tipo de Incidencia */}
          <Dialog
            open={isAddTipoDialogOpen}
            onOpenChange={setIsAddTipoDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Tipo de Incidencia</DialogTitle>
                <DialogDescription>
                  Crea una nueva clasificación para incidencias y asígnale un
                  área y prioridad sugerida.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={newTipoNombre}
                    onChange={(e) => setNewTipoNombre(e.target.value)}
                    placeholder="Ej: Falla Eléctrica"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={newTipoDescripcion}
                    onChange={(e) => setNewTipoDescripcion(e.target.value)}
                    placeholder="Descripción opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Color</Label>
                  <Input
                    type="color"
                    name="color"
                    value={newTipoColor}
                    onChange={(e) => setNewTipoColor(e.target.value)}
                    className="w-16 h-10 p-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Área asociada</Label>
                  <Select
                    value={newTipoAreaId}
                    onValueChange={setNewTipoAreaId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un área" />
                    </SelectTrigger>
                    <SelectContent>
                      {areas?.map((area) => (
                        <SelectItem key={area.id} value={area.id}>
                          {area.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prioridad sugerida</Label>
                  <Select
                    value={newTipoPrioridad}
                    onValueChange={setNewTipoPrioridad}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="baja">Baja</SelectItem>
                      <SelectItem value="media">Media</SelectItem>
                      <SelectItem value="alta">Alta</SelectItem>
                      <SelectItem value="critica">Crítica</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddTipoDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => addTipoMutation.mutate()}
                  disabled={addTipoMutation.isPending}
                >
                  {addTipoMutation.isPending ? "Guardando..." : "Guardar Tipo"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Agregar Sucursal */}
          <Dialog
            open={isAddSucursalDialogOpen}
            onOpenChange={setIsAddSucursalDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Sucursal</DialogTitle>
                <DialogDescription>
                  Registra una nueva sala / sucursal
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={newSucursalNombre}
                    onChange={(e) => setNewSucursalNombre(e.target.value)}
                    placeholder="Nombre de la sucursal"
                    name="nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={newSucursalDescripcion}
                    onChange={(e) => setNewSucursalDescripcion(e.target.value)}
                    placeholder="Descripción opcional"
                    name="descripcion"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddSucursalDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => addSucursalMutation.mutate()}
                  disabled={addSucursalMutation.isPending}
                >
                  {addSucursalMutation.isPending
                    ? "Guardando..."
                    : "Guardar Sucursal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Agregar Área */}
          <Dialog
            open={isAddAreaDialogOpen}
            onOpenChange={setIsAddAreaDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Agregar Área</DialogTitle>
                <DialogDescription>
                  Registra un área del sistema
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Nombre</Label>
                  <Input
                    value={newAreaNombre}
                    onChange={(e) => setNewAreaNombre(e.target.value)}
                    placeholder="Ej: Soporte Técnico"
                    name="nombre"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input
                    value={newAreaDescripcion}
                    onChange={(e) => setNewAreaDescripcion(e.target.value)}
                    placeholder="Descripción opcional"
                    name="descripcion"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddAreaDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => addAreaMutation.mutate()}
                  disabled={addAreaMutation.isPending}
                >
                  {addAreaMutation.isPending ? "Guardando..." : "Guardar Área"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Dialog: Editar Tipo de Incidencia */}
          <Dialog
            open={isEditTipoDialogOpen}
            onOpenChange={setIsEditTipoDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Tipo de Incidencia</DialogTitle>
                <DialogDescription>
                  Modifica los datos básicos del tipo de incidencia
                </DialogDescription>
              </DialogHeader>
              {selectedTipo && (
                <form onSubmit={handleUpdateTipo}>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input name="nombre" defaultValue={selectedTipo.nombre} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        name="descripcion"
                        defaultValue={selectedTipo.descripcion || ""}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Color</Label>
                      <Input
                        type="color"
                        name="color"
                        defaultValue={selectedTipo.color || "#6B7280"}
                        className="w-16 h-10 p-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditTipoDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateTipoMutation.isPending}
                    >
                      {updateTipoMutation.isPending
                        ? "Guardando..."
                        : "Guardar Cambios"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog: Editar Sucursal */}
          <Dialog
            open={isEditSucursalDialogOpen}
            onOpenChange={setIsEditSucursalDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Sucursal</DialogTitle>
                <DialogDescription>
                  Modifica la información de la sala / sucursal
                </DialogDescription>
              </DialogHeader>
              {selectedSala && (
                <form onSubmit={handleUpdateSucursal}>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input name="nombre" defaultValue={selectedSala.nombre} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        name="descripcion"
                        defaultValue={selectedSala.descripcion || ""}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditSucursalDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateSucursalMutation.isPending}
                    >
                      {updateSucursalMutation.isPending
                        ? "Guardando..."
                        : "Guardar Cambios"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>

          {/* Dialog: Editar Área */}
          <Dialog
            open={isEditAreaDialogOpen}
            onOpenChange={setIsEditAreaDialogOpen}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Editar Área</DialogTitle>
                <DialogDescription>
                  Modifica la información del área
                </DialogDescription>
              </DialogHeader>
              {editingArea && (
                <form onSubmit={handleUpdateArea}>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input name="nombre" defaultValue={editingArea.nombre} />
                    </div>
                    <div className="space-y-2">
                      <Label>Descripción</Label>
                      <Input
                        name="descripcion"
                        defaultValue={editingArea.descripcion || ""}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsEditAreaDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={updateAreaMutation.isPending}
                    >
                      {updateAreaMutation.isPending
                        ? "Guardando..."
                        : "Guardar Cambios"}
                    </Button>
                  </DialogFooter>
                </form>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ===== TAB BACKUPS ===== */}
        <TabsContent value="backups" className="mt-6">
          <BackupManagement />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default UserManagement;
