-- Agregar política para que supervisores de monitoreo puedan crear incidencias
CREATE POLICY "Supervisores de monitoreo pueden crear incidencias" 
ON public.incidencias 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Agregar política para que supervisores de monitoreo puedan editar incidencias
CREATE POLICY "Supervisores de monitoreo pueden editar incidencias" 
ON public.incidencias 
FOR UPDATE 
USING (has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'supervisor_monitoreo'::app_role) OR has_role(auth.uid(), 'admin'::app_role));