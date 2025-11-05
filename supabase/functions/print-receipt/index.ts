import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json; charset=utf-8',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id') || '123';

    console.log(`Receipt request received for ID: ${id}`);

    // Return the exact JSON format expected by Bluetooth Print app
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

    return new Response(
      JSON.stringify(receiptData),
      { 
        headers: corsHeaders,
        status: 200 
      }
    );
  } catch (error) {
    console.error('Error generating receipt:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate receipt' }),
      { 
        headers: corsHeaders,
        status: 500 
      }
    );
  }
});
