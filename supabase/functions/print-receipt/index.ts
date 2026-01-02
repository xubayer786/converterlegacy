import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authentication check - require valid JWT token
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.log('No authorization header provided');
      return new Response(JSON.stringify({ error: 'Unauthorized - No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create Supabase client with the user's auth context
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Authentication failed:', authError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized - Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Authenticated user: ${user.id}`);

    const url = new URL(req.url);
    const receiptId = url.searchParams.get('id');
    
    // Input validation - ensure receiptId is provided and valid format
    if (!receiptId || !/^[a-zA-Z0-9-_]+$/.test(receiptId)) {
      console.log(`Invalid receipt ID format: ${receiptId}`);
      return new Response(JSON.stringify({ error: 'Invalid receipt ID format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log(`Print receipt requested for ID: ${receiptId} by user: ${user.id}`);

    // Return JSON data in the exact format required by Bluetooth Print app
    // In production, this would fetch real receipt data based on receiptId and verify user authorization
    const receiptData = [
      {
        "type": 0,
        "content": "Legacy Dhaka Receipt",
        "bold": 1,
        "align": 1,
        "format": 2
      },
      {
        "type": 0,
        "content": "Customer: Mohammad Zubair Walid",
        "bold": 0,
        "align": 0,
        "format": 0
      },
      {
        "type": 0,
        "content": "Item: Premium Cufflinks - ৳1499",
        "bold": 0,
        "align": 0,
        "format": 0
      },
      {
        "type": 0,
        "content": "Delivery: Free",
        "bold": 0,
        "align": 0,
        "format": 0
      },
      {
        "type": 0,
        "content": "Thank you for shopping with us!",
        "bold": 1,
        "align": 1,
        "format": 0
      },
      {
        "type": 3,
        "value": "https://legacydhaka.com/qr/12345",
        "size": 40,
        "align": 1
      }
    ];

    // Return the array directly as expected by Bluetooth Print app
    return new Response(JSON.stringify(receiptData), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error in print-receipt function:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  }
});
