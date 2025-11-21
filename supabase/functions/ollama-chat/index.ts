import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, history = [], model = 'llama2' } = await req.json();
    
    if (!message) {
      throw new Error('No message provided');
    }

    // Get Ollama URL from environment or use default
    const ollamaUrl = Deno.env.get('OLLAMA_URL') || 'http://localhost:11434';
    
    console.log('Sending request to Ollama:', { model, messagesCount: history.length + 1 });

    // Prepare messages for Ollama
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: 'Eres un asistente útil y amigable. Responde de manera concisa y clara en español.'
      },
      ...history,
      {
        role: 'user',
        content: message
      }
    ];

    // Make request to Ollama
    const ollamaRequest: OllamaRequest = {
      model: model,
      messages: messages,
      stream: false
    };

    const response = await fetch(`${ollamaUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ollamaRequest),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ollama API error:', errorText);
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    const assistantMessage = result.message?.content || 'Lo siento, no pude procesar tu mensaje.';

    console.log('Ollama response received successfully');

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    // Save messages to database if user is authenticated
    if (userId) {
      try {
        // Save user message
        await supabase.from('chat_messages').insert({
          user_id: userId,
          role: 'user',
          content: message
        });

        // Save assistant response
        await supabase.from('chat_messages').insert({
          user_id: userId,
          role: 'assistant',
          content: assistantMessage
        });

        console.log('Messages saved to database');
      } catch (dbError) {
        console.error('Error saving messages to database:', dbError);
        // Continue anyway, don't fail the request
      }
    }

    return new Response(
      JSON.stringify({ 
        response: assistantMessage,
        saved: !!userId 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in ollama-chat function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        response: 'Lo siento, hubo un error procesando tu mensaje. Verifica que Ollama esté funcionando correctamente.' 
      }),
      {
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
      }
    );
  }
});