-- Create RPC functions for FCM token management
CREATE OR REPLACE FUNCTION public.delete_user_fcm_tokens(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.fcm_tokens WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.insert_fcm_token(
  p_user_id UUID,
  p_token TEXT,
  p_device_type TEXT DEFAULT 'desktop'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.fcm_tokens (user_id, token, device_type)
  VALUES (p_user_id, p_token, p_device_type)
  ON CONFLICT (user_id, token) 
  DO UPDATE SET 
    device_type = EXCLUDED.device_type,
    updated_at = now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;