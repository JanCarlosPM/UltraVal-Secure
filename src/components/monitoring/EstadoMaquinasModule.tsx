import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CalendarIcon, RefreshCw, Computer, BarChart3, TrendingUp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

type Sala = {
  id: string;
  nombre: string;
}

interface ConteoQuincenalMaquinas {
  sala_id: string;
  sala_nombre: string;
  año: number;
  mes: number;
  quincena: number;
  total_maquinas_apagadas: number;
  total_incidencias_maquinas: number;
}

interface DatosSala {
  sala: string;
  sala_id: string;
  total_maquinas_apagadas: number;
  total_incidencias_maquinas: number;
  quincena_actual: string;
}

interface DatosTimeline {
  periodo: string;
  año: number;
  mes: number;
  quincena: number;
  total_maquinas_apagadas: number;
  total_incidencias_maquinas: number;
}

interface DatosResumen {
  name: string;
  value: number;
  incidencias: number;
}

// Funciones fetch
async function fetchSalas() {
  const { data, error } = await supabase
    .from('salas')
    .select('id, nombre')
    .eq('activo', true)
    .order('nombre');
  
  if (error) throw error;
  return data || [];
}

async function fetchConteosMaquinas(año: number, mes: number, salaFiltro: string) {
  console.log('Fetching conteos de máquinas:', { año, mes, salaFiltro });
  
  const { data, error } = await supabase
    .rpc('obtener_estadisticas_quincenales_maquinas', {
      p_año: año,
      p_mes: mes
    });
  
  if (error) {
    console.error('Error fetching conteos de máquinas:', error);
    throw error;
  }

  let result = data || [];
  
  // Filtrar por sala si es necesario
  if (salaFiltro !== 'todas') {
    result = result.filter((item: any) => item.sala_id === salaFiltro);
  }

  console.log('Conteos de máquinas data:', result);
  return result;
}

async function fetchConteosHistoricosMaquinas(añoInicio: number, añoFin: number) {
  console.log('Fetching conteos históricos de máquinas:', { añoInicio, añoFin });
  
  const promises = [];
  for (let año = añoInicio; año <= añoFin; año++) {
    const { data } = await supabase
      .rpc('obtener_estadisticas_quincenales_maquinas', {
        p_año: año
      });
    if (data) promises.push(...data);
  }
  
  return promises;
}

const EstadoMaquinasModule = () => {
  const currentDate = new Date();
  const [añoSeleccionado, setAñoSeleccionado] = useState<number>(currentDate.getFullYear());
  const [mesSeleccionado, setMesSeleccionado] = useState<number>(currentDate.getMonth() + 1);
  const [salaFiltro, setSalaFiltro] = useState<string>('todas');
  const [tipoVista, setTipoVista] = useState<'tabla' | 'barras' | 'lineas' | 'torta' | 'timeline'>('tabla');
  const [mostrarSelector, setMostrarSelector] = useState(false);

  // Obtener salas disponibles
  const salasQuery = useQuery({
    queryKey: ['salas-activas-maquinas'],
    queryFn: fetchSalas
  });

  // Obtener conteos quincenales de máquinas
  const conteosQuery = useQuery({
    queryKey: ['conteos-quincenales-maquinas', añoSeleccionado, mesSeleccionado, salaFiltro],
    queryFn: () => fetchConteosMaquinas(añoSeleccionado, mesSeleccionado, salaFiltro),
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Obtener datos históricos para timeline
  const historicoQuery = useQuery({
    queryKey: ['conteos-historicos-maquinas', añoSeleccionado - 1, añoSeleccionado],
    queryFn: () => fetchConteosHistoricosMaquinas(añoSeleccionado - 1, añoSeleccionado),
    enabled: tipoVista === 'timeline'
  });

  // Función para determinar la quincena actual
  const getQuincenaActual = () => {
    const dia = currentDate.getDate();
    return dia <= 15 ? 1 : 2;
  };

  const formatQuincena = (año: number, mes: number, quincena: number) => {
    const nombreMes = format(new Date(año, mes - 1, 1), 'MMMM', { locale: es });
    return `${nombreMes} ${año} - ${quincena}Q`;
  };

  // Procesar datos para gráficos
  const datosProc = useMemo(() => {
    const porSala: DatosSala[] = [];
    const timeline: DatosTimeline[] = [];
    const resumen: DatosResumen[] = [];

    if (!conteosQuery.data || !Array.isArray(conteosQuery.data)) {
      return { porSala, timeline, resumen };
    }

    // Procesar datos por sala
    const salaMap = new Map<string, DatosSala>();
    
    conteosQuery.data.forEach((conteo: ConteoQuincenalMaquinas) => {
      const salaId = conteo.sala_id;
      const salaNombre = conteo.sala_nombre;
      
      if (!salaMap.has(salaId)) {
        salaMap.set(salaId, {
          sala: salaNombre,
          sala_id: salaId,
          total_maquinas_apagadas: 0,
          total_incidencias_maquinas: 0,
          quincena_actual: formatQuincena(conteo.año, conteo.mes, conteo.quincena)
        });
      }
      
      const salaData = salaMap.get(salaId)!;
      salaData.total_maquinas_apagadas += conteo.total_maquinas_apagadas;
      salaData.total_incidencias_maquinas += conteo.total_incidencias_maquinas;
    });

    const porSalaResult = Array.from(salaMap.values()).sort((a, b) => b.total_maquinas_apagadas - a.total_maquinas_apagadas);

    // Datos para gráfico de torta
    const resumenResult = porSalaResult.map((item) => ({
      name: item.sala,
      value: item.total_maquinas_apagadas,
      incidencias: item.total_incidencias_maquinas
    }));

    // Timeline de quincenas
    let timelineResult: DatosTimeline[] = [];
    if (historicoQuery.data) {
      const timelineMap = new Map<string, DatosTimeline>();
      
      historicoQuery.data.forEach((conteo: ConteoQuincenalMaquinas) => {
        const clave = `${conteo.año}-${conteo.mes.toString().padStart(2, '0')}-Q${conteo.quincena}`;
        
        if (!timelineMap.has(clave)) {
          timelineMap.set(clave, {
            periodo: formatQuincena(conteo.año, conteo.mes, conteo.quincena),
            año: conteo.año,
            mes: conteo.mes,
            quincena: conteo.quincena,
            total_maquinas_apagadas: 0,
            total_incidencias_maquinas: 0
          });
        }
        
        const timelineData = timelineMap.get(clave)!;
        timelineData.total_maquinas_apagadas += conteo.total_maquinas_apagadas;
        timelineData.total_incidencias_maquinas += conteo.total_incidencias_maquinas;
      });
      
      timelineResult = Array.from(timelineMap.values()).sort((a, b) => {
        if (a.año !== b.año) return a.año - b.año;
        if (a.mes !== b.mes) return a.mes - b.mes;
        return a.quincena - b.quincena;
      });
    }

    return { 
      porSala: porSalaResult, 
      timeline: timelineResult, 
      resumen: resumenResult 
    };
  }, [conteosQuery.data, historicoQuery.data]);

  const colores = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088fe', '#00c49f', '#ffbb28', '#ff8042'];

  if (conteosQuery.isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Computer className="h-5 w-5" />
            Estado de Máquinas (Quincenal)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2">Cargando datos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtros y Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Estado de Máquinas (Quincenal)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            {/* Selector de Período */}
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Período:</span>
              <Popover open={mostrarSelector} onOpenChange={setMostrarSelector}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[180px] justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(new Date(añoSeleccionado, mesSeleccionado - 1, 1), "MMMM yyyy", { locale: es })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">Año:</label>
                      <Select value={añoSeleccionado.toString()} onValueChange={(value) => setAñoSeleccionado(parseInt(value))}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 5}, (_, i) => currentDate.getFullYear() - 2 + i).map(año => (
                            <SelectItem key={año} value={año.toString()}>{año}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Mes:</label>
                      <Select value={mesSeleccionado.toString()} onValueChange={(value) => setMesSeleccionado(parseInt(value))}>
                        <SelectTrigger className="w-full mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({length: 12}, (_, i) => i + 1).map(mes => (
                            <SelectItem key={mes} value={mes.toString()}>
                              {format(new Date(2024, mes - 1, 1), "MMMM", { locale: es })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => setMostrarSelector(false)} className="w-full">
                      Aplicar
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Filtro de Sala */}
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Sala:</span>
              <Select value={salaFiltro} onValueChange={setSalaFiltro}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Todas las salas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las salas</SelectItem>
                  {(salasQuery.data as Sala[] || []).map((sala: Sala) => (
                    <SelectItem key={sala.id} value={sala.id}>
                      {sala.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Vista */}
            <div className="flex gap-2 items-center">
              <span className="text-sm font-medium">Vista:</span>
              <Select value={tipoVista} onValueChange={(value: 'tabla' | 'barras' | 'lineas' | 'torta' | 'timeline') => setTipoVista(value)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tabla">Tabla</SelectItem>
                  <SelectItem value="barras">Barras</SelectItem>
                  <SelectItem value="lineas">Líneas</SelectItem>
                  <SelectItem value="torta">Pastel</SelectItem>
                  <SelectItem value="timeline">Timeline</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={() => conteosQuery.refetch()} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerta sobre quincenas */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-blue-800">
            <TrendingUp className="h-5 w-5" />
            <div>
              <p className="font-medium">Sistema de Conteo Quincenal Activo</p>
              <p className="text-sm">Los conteos se reinician automáticamente cada 15 días (1Q: día 1-15, 2Q: día 16-fin de mes). 
              Quincena actual: <strong>{getQuincenaActual()}Q {format(currentDate, "MMMM yyyy", { locale: es })}</strong></p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen de datos */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{datosProc.porSala.reduce((acc, curr) => acc + curr.total_maquinas_apagadas, 0)}</p>
              <p className="text-sm text-gray-600">Total Máquinas Apagadas</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{datosProc.porSala.reduce((acc, curr) => acc + curr.total_incidencias_maquinas, 0)}</p>
              <p className="text-sm text-gray-600">Total Incidencias</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{datosProc.porSala.length}</p>
              <p className="text-sm text-gray-600">Salas Afectadas</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contenido Principal */}
      {tipoVista === 'tabla' && (
        <Card>
          <CardHeader>
            <CardTitle>Estado de Máquinas por Sala (Quincenal)</CardTitle>
          </CardHeader>
          <CardContent>
            {datosProc.porSala.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No se encontraron datos para el período seleccionado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Sala</th>
                      <th className="text-center p-2">Período</th>
                      <th className="text-center p-2">Máquinas Apagadas</th>
                      <th className="text-center p-2">Total Incidencias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosProc.porSala.map((item, index) => (
                      <tr key={index} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{item.sala}</td>
                        <td className="text-center p-2">
                          <Badge variant="outline" className="text-gray-600">
                            {item.quincena_actual}
                          </Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="outline" className="text-red-700 font-bold">
                            {item.total_maquinas_apagadas}
                          </Badge>
                        </td>
                        <td className="text-center p-2">
                          <Badge variant="outline" className="text-blue-700">
                            {item.total_incidencias_maquinas}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Barras */}
      {tipoVista === 'barras' && (
        <Card>
          <CardHeader>
            <CardTitle>Máquinas Apagadas por Sala</CardTitle>
          </CardHeader>
          <CardContent>
            {datosProc.porSala.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay datos para mostrar</p>
            ) : (
              <ChartContainer className="h-[400px]" config={{}}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosProc.porSala}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="sala" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_maquinas_apagadas" fill="#ef4444" name="Máquinas Apagadas" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Líneas (Timeline) */}
      {tipoVista === 'timeline' && (
        <Card>
          <CardHeader>
            <CardTitle>Evolución Histórica de Máquinas Apagadas</CardTitle>
          </CardHeader>
          <CardContent>
            {datosProc.timeline.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay datos históricos para mostrar</p>
            ) : (
              <ChartContainer className="h-[400px]" config={{}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosProc.timeline}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="total_maquinas_apagadas" stroke="#ef4444" strokeWidth={2} name="Máquinas Apagadas" />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Torta */}
      {tipoVista === 'torta' && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Máquinas Apagadas por Sala</CardTitle>
          </CardHeader>
          <CardContent>
            {datosProc.resumen.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No hay datos para mostrar</p>
            ) : (
              <ChartContainer className="h-[400px]" config={{}}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={datosProc.resumen}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {datosProc.resumen.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={colores[index % colores.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EstadoMaquinasModule;