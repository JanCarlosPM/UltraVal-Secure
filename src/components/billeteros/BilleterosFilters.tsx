import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FiltrosBilleteros } from "@/hooks/useBilleteros";

interface BilleterosFiltersProps {
  onFilter: (filtros: FiltrosBilleteros) => void;
}

export const BilleterosFilters = ({ onFilter }: BilleterosFiltersProps) => {
  const [codigo, setCodigo] = useState('');
  const [serial, setSerial] = useState('');
  const [tipo, setTipo] = useState<string | undefined>(undefined);
  const [estado, setEstado] = useState<string | undefined>(undefined);
  const [salaId, setSalaId] = useState<string | undefined>(undefined);

  const { data: salas = [] } = useQuery({
    queryKey: ['salas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('salas')
        .select('id, nombre')
        .eq('activo', true)
        .order('nombre');
      
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const filtros: FiltrosBilleteros = {};
    if (codigo) filtros.codigo = codigo;
    if (serial) filtros.serial = serial;
    if (tipo) filtros.tipo = tipo as 'MJ' | 'PK';
    if (estado) filtros.estado = estado as any;
    if (salaId) filtros.sala_id = salaId;


    onFilter(filtros);
  }, [codigo, serial, tipo, estado, salaId, onFilter]);

  const limpiarFiltros = () => {
    setCodigo('');
    setTipo(undefined);
    setEstado(undefined);
    setSalaId(undefined);
  };

  const hayFiltrosActivos = codigo || serial || tipo || estado || salaId;

  return (
    <div className="grid gap-4 md:grid-cols-5">
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por código TR..."
          value={codigo}
          onChange={(e) => setCodigo(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={tipo} onValueChange={(value) => setTipo(value === "all" ? undefined : value)}>
        <SelectTrigger>
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los tipos</SelectItem>
          <SelectItem value="MJ">Multijuegos (MJ)</SelectItem>
          <SelectItem value="PK">Poker (PK)</SelectItem>
        </SelectContent>
      </Select>

      <Select value={estado} onValueChange={(value) => setEstado(value === "all" ? undefined : value)}>
        <SelectTrigger>
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos los estados</SelectItem>
          <SelectItem value="en_stock">En Stock</SelectItem>
          <SelectItem value="reparacion">En Reparación</SelectItem>
          <SelectItem value="en_programacion">En Programación</SelectItem>
          <SelectItem value="descarte">Descarte</SelectItem>
        </SelectContent>
      </Select>

      <Select value={salaId} onValueChange={(value) => setSalaId(value === "all" ? undefined : value)}>
        <SelectTrigger>
          <SelectValue placeholder="Sala" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas las salas</SelectItem>
          {salas.map((sala) => (
            <SelectItem key={sala.id} value={sala.id}>
              {sala.nombre}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hayFiltrosActivos && (
        <Button 
          variant="outline" 
          onClick={limpiarFiltros}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Limpiar
        </Button>
      )}
    </div>
  );
};
