// Supabase Edge Function for Super Admin API

import { serve } from 'http/server';
import { createClient } from 'npm:@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  // Get the request URL to determine the endpoint
  const url = new URL(req.url);
  const path = url.pathname.replace('/admin-api', '');

  // Set up Supabase client with service role key
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') || '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Get authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Verify the user is authenticated and is a super admin
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error(authError?.message || 'Unauthorized');
    }
    
    // Check if user is a super admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from('auth.users')
      .select('is_super_admin')
      .eq('id', user.id)
      .single();
      
    if (userError || !userData || !userData.is_super_admin) {
      throw new Error('Not authorized as Super Admin');
    }

    // Handle different API endpoints
    if (path === '/users' && req.method === 'GET') {
      // Get all users
      const { data, error } = await supabaseAdmin.auth.admin.listUsers();
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ users: data.users }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } 
    else if (path.match(/\/users\/[^\/]+\/super-admin/) && req.method === 'POST') {
      // Set/unset super admin status
      const userId = path.split('/')[2];
      const { set_admin } = await req.json();
      
      const { data: userData, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (getUserError || !userData.user) {
        throw new Error(getUserError?.message || 'User not found');
      }
      
      const { error } = await supabaseAdmin.rpc('set_super_admin', { 
        user_email: userData.user.email,
        is_admin: set_admin
      });
      
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (path === '/schools' && req.method === 'GET') {
      // Get all schools
      const { data, error } = await supabaseAdmin
        .from('schools')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      return new Response(
        JSON.stringify({ schools: data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    else if (path === '/stats' && req.method === 'GET') {
      // Get system stats
      const [schools, users, profiles, drafts] = await Promise.all([
        supabaseAdmin.from('schools').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('auth.users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('tone_profiles').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('content_drafts').select('*', { count: 'exact', head: true })
      ]);
      
      return new Response(
        JSON.stringify({
          stats: {
            schools: schools.count || 0,
            users: users.count || 0,
            profiles: profiles.count || 0,
            drafts: drafts.count || 0
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // If the endpoint wasn't matched
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});