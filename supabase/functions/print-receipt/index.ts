import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const url = new URL(req.url);
    const receiptId = url.searchParams.get('id') || '123';
    
    console.log(`Print receipt requested for ID: ${receiptId}`);

    // Return JSON data in the exact format required by Bluetooth Print app
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

    // Wrap the data in an object with "data" key for Bluetooth Print app
    const response = {
      data: receiptData
    };

    return new Response(JSON.stringify(response), {
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
