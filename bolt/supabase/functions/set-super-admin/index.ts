import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Set up Supabase client with service role
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

Deno.serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Specific user to set as super admin
    const userEmail = "lewis@3guy.com";
    const userId = "c8dd144b-1731-4574-bf5e-67b2bd6d874b";

    // Verify the user exists in auth.users
    const { data: userData, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('id, email')
      .eq('id', userId)
      .single();

    if (userError) {
      return new Response(
        JSON.stringify({ error: 'Failed to find user' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the set_super_admin RPC function
    const { error } = await supabaseAdmin.rpc(
      'set_super_admin',
      { 
        user_email: userEmail,
        is_admin: true
      }
    );

    if (error) {
      throw error;
    }

    // Insert an audit log entry directly
    const { error: auditError } = await supabaseAdmin
      .from('super_admin_actions')
      .insert({
        admin_id: userId,
        action_type: 'grant_super_admin',
        affected_user_id: userId,
        details: { method: 'edge_function', email: userEmail }
      });

    if (auditError) {
      console.error('Failed to log admin action:', auditError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `User ${userEmail} has been granted super admin privileges`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});