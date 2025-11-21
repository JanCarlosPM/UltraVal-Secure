-- Create trigger to send push notifications for high/critical priority incidents
CREATE OR REPLACE FUNCTION public.handle_new_incident_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  -- Solo enviar notificación para incidencias de prioridad alta o crítica
  IF NEW.prioridad IN ('alta', 'critica') THEN
    -- Llamar a la función de FCM push notifications
    PERFORM net.http_post(
      url := 'https://wbuddpspfxufhftkcaww.supabase.co/functions/v1/send-push-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('request.header.apikey', true)
      ),
      body := jsonb_build_object(
        'incidencia_id', NEW.id::text,
        'titulo', NEW.titulo,
        'descripcion', NEW.descripcion,
        'prioridad', NEW.prioridad,
        'area_id', NEW.area_id::text,
        'area_nombre', (SELECT nombre FROM public.areas WHERE id = NEW.area_id),
        'clasificacion_nombre', (SELECT nombre FROM public.clasificaciones WHERE id = NEW.clasificacion_id),
        'reportado_por', NEW.reportado_por
      )
    );
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for new incidents
DROP TRIGGER IF EXISTS trigger_new_incident_notification ON public.incidencias;
CREATE TRIGGER trigger_new_incident_notification
  AFTER INSERT ON public.incidencias
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_incident_notification();