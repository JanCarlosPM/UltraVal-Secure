import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePageAudit } from '@/hooks/usePageAudit';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Shield, Search, Calendar, User, Activity, Filter, Download, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface UserAction {
  id: string;
  user_id: string;
  user_email: string;
  action_type: string;
  resource_type: string | null;
  resource_id: string | null;
  details: any;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

const AuditLog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [userFilter, setUserFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;

  // Auditoría automática del log de auditoría
  const { logPageView } = usePageAudit();
  
  // Log page view when component mounts or filters change
  useEffect(() => {
    logPageView('audit_log', {
      viewType: 'security_review',
      filters: { searchTerm, actionFilter, userFilter },
      currentPage
    });
  }, [logPageView, searchTerm, actionFilter, userFilter, currentPage]);

  // Obtener logs de auditoría
  const { data: auditLogs, isLoading } = useQuery({
    queryKey: ['audit-logs', currentPage, searchTerm, actionFilter, userFilter],
    queryFn: async () => {
      let query = supabase
        .from('user_actions')
        .select('*')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage - 1);

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`user_email.ilike.%${searchTerm}%,action_type.ilike.%${searchTerm}%,resource_type.ilike.%${searchTerm}%`);
      }

      if (actionFilter !== 'all') {
        query = query.eq('action_type', actionFilter);
      }

      if (userFilter !== 'all') {
        query = query.eq('user_email', userFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as UserAction[];
    },
  });

  // Obtener tipos de acciones únicos
  const { data: actionTypes } = useQuery({
    queryKey: ['action-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_actions')
        .select('action_type')
        .order('action_type');
      
      if (error) throw error;
      const uniqueTypes = [...new Set(data.map(item => item.action_type))];
      return uniqueTypes;
    },
  });

  // Obtener usuarios únicos
  const { data: users } = useQuery({
    queryKey: ['audit-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_actions')
        .select('user_email')
        .order('user_email');
      
      if (error) throw error;
      const uniqueUsers = [...new Set(data.map(item => item.user_email))];
      return uniqueUsers;
    },
  });

  // Query para estadísticas de auditoría y problemas de IP
  const { data: auditStats } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_actions')
        .select('ip_address, user_agent, created_at')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      
      const total = data.length;
      const withoutIP = data.filter(log => !log.ip_address).length;
      const mobileAccess = data.filter(log => {
        try {
          const userAgent = JSON.parse(log.user_agent || '{}');
          return userAgent.deviceType === 'mobile';
        } catch {
          return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(log.user_agent || '');
        }
      }).length;
      
      const ipCaptureProblem = withoutIP / total > 0.3; // Más del 30% sin IP es problemático
      
      return {
        total,
        withoutIP,
        mobileAccess,
        ipCaptureProblem,
        ipCaptureRate: ((total - withoutIP) / total * 100).toFixed(1)
      };
    },
  });

  const getActionBadge = (actionType: string) => {
    const actionConfig: { [key: string]: { variant: any; color: string } } = {
      'login': { variant: 'outline', color: 'text-green-600' },
      'logout': { variant: 'outline', color: 'text-gray-600' },
      'create_incident': { variant: 'default', color: 'text-blue-600' },
      'update_incident': { variant: 'secondary', color: 'text-orange-600' },
      'delete_incident': { variant: 'destructive', color: 'text-red-600' },
      'view_dashboard': { variant: 'outline', color: 'text-purple-600' },
      'view_reports': { variant: 'outline', color: 'text-indigo-600' },
      'incidencia_aprobado': { variant: 'default', color: 'text-green-700' },
      'incidencia_rechazado': { variant: 'destructive', color: 'text-red-700' },
    };

    const config = actionConfig[actionType] || { variant: 'outline', color: 'text-gray-600' };
    
    return (
      <Badge variant={config.variant} className={config.color}>
        {actionType.replace(/_/g, ' ').toUpperCase()}
      </Badge>
    );
  };

  const formatDetails = (details: any) => {
    if (!details) return 'Sin detalles';
    if (typeof details === 'string') {
      try {
        details = JSON.parse(details);
      } catch {
        return details;
      }
    }
    return Object.entries(details).map(([key, value]) => `${key}: ${value}`).join(', ');
  };

  const exportToCSV = () => {
    if (!auditLogs) return;

    const headers = ['Fecha', 'Usuario', 'Acción', 'Recurso', 'IP', 'Detalles'];
    const csvData = auditLogs.map(log => [
      format(new Date(log.created_at), 'dd/MM/yyyy HH:mm:ss'),
      log.user_email,
      log.action_type,
      log.resource_type || '',
      log.ip_address || '',
      formatDetails(log.details)
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit_log_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Panel de diagnóstico de auditoría */}
      {auditStats && (
        <Card className={`border-2 ${auditStats.ipCaptureProblem ? 'border-orange-500 bg-orange-50' : 'border-green-500 bg-green-50'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {auditStats.ipCaptureProblem ? (
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              ) : (
                <Shield className="h-6 w-6 text-green-600" />
              )}
              Estado del Sistema de Auditoría
            </CardTitle>
            <CardDescription>
              Análisis de la calidad de los datos de auditoría y problemas detectados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{auditStats.total}</div>
                <div className="text-sm text-gray-600">Acciones Recientes</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${auditStats.ipCaptureProblem ? 'text-orange-600' : 'text-green-600'}`}>
                  {auditStats.ipCaptureRate}%
                </div>
                <div className="text-sm text-gray-600">Captura de IP</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{auditStats.mobileAccess}</div>
                <div className="text-sm text-gray-600">Accesos Móviles</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${auditStats.withoutIP > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {auditStats.withoutIP}
                </div>
                <div className="text-sm text-gray-600">Sin IP Registrada</div>
              </div>
            </div>
            
            {auditStats.ipCaptureProblem && (
              <div className="mt-4 p-4 bg-orange-100 border border-orange-300 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-orange-800">Problema Detectado: Captura de IP Deficiente</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Se ha detectado que más del 30% de las acciones no tienen IP registrada. 
                      Esto puede deberse a problemas de conectividad en dispositivos móviles o filtros de red.
                    </p>
                    <div className="mt-2">
                      <span className="text-xs text-orange-600 font-medium">
                        Recomendación: Revisar configuración de red y servicios de IP externa.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-blue-600" />
            Registro de Auditoría
          </h1>
          <p className="text-gray-600">Seguimiento de todas las acciones realizadas en el sistema</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportToCSV} className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Badge variant="outline" className="px-3 py-1">
            Total: {auditLogs?.length || 0} acciones
          </Badge>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Usuario, acción o recurso..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="action-filter">Tipo de Acción</Label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  {actionTypes?.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, ' ').toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-filter">Usuario</Label>
              <Select value={userFilter} onValueChange={setUserFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los usuarios" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los usuarios</SelectItem>
                  {users?.map((user) => (
                    <SelectItem key={user} value={user}>
                      {user}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Registro de Actividad
          </CardTitle>
          <CardDescription>
            Historial detallado de todas las acciones realizadas por los usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha y Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Detalles</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs?.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div className="text-sm">
                          <div className="font-medium">
                            {format(new Date(log.created_at), 'dd/MM/yyyy', { locale: es })}
                          </div>
                          <div className="text-gray-500">
                            {format(new Date(log.created_at), 'HH:mm:ss', { locale: es })}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div className="text-sm">
                          <div className="font-medium">{log.user_email}</div>
                          <div className="text-xs text-gray-500">
                            {log.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getActionBadge(log.action_type)}
                    </TableCell>
                    <TableCell>
                      {log.resource_type ? (
                        <div className="text-sm">
                          <div className="font-medium">{log.resource_type}</div>
                          {log.resource_id && (
                            <div className="text-xs text-gray-500">
                              {log.resource_id.slice(0, 8)}...
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs font-mono">
                        {log.ip_address || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate text-sm" title={formatDetails(log.details)}>
                        {formatDetails(log.details)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!auditLogs || auditLogs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Activity className="h-8 w-8 text-gray-400" />
                        <p className="text-gray-500">No se encontraron registros de auditoría</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Paginación simple */}
          {auditLogs && auditLogs.length === itemsPerPage && (
            <div className="flex justify-center gap-2 mt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Página {currentPage}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => prev + 1)}
                disabled={auditLogs.length < itemsPerPage}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditLog;