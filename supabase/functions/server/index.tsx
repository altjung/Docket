import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "npm:@supabase/supabase-js@2";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const kvClient = () => createClient(
  Deno.env.get("SUPABASE_URL") ?? '',
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? '',
);

const kvGet = async (key: string): Promise<any> => {
  const client = kvClient();
  const { data, error } = await client.from("kv_store_7cfb0012").select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
};

const kvSet = async (key: string, value: any): Promise<void> => {
  const client = kvClient();
  const { error } = await client.from("kv_store_7cfb0012").upsert({ key, value });
  if (error) throw new Error(error.message);
};

const kvGetByPrefix = async (prefix: string): Promise<any[]> => {
  const client = kvClient();
  const { data, error } = await client.from("kv_store_7cfb0012").select("key, value").like("key", prefix + "%");
  if (error) throw new Error(error.message);
  return data ?? [];
};

const getSupabaseClient = () => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
);

function getUserFromToken(accessToken: string) {
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );
  return userClient.auth.getUser(accessToken);
}

const BUCKET_NAME = 'make-7cfb0012-photos';
let bucketInitialized = false;

async function ensureBucket() {
  if (bucketInitialized) return;
  const supabase = getSupabaseClient();
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets?.some(bucket => bucket.name === BUCKET_NAME);
  if (!bucketExists) {
    await supabase.storage.createBucket(BUCKET_NAME, { public: false });
    console.log(`Created storage bucket: ${BUCKET_NAME}`);
  }
  bucketInitialized = true;
}

app.get("/make-server-7cfb0012/health", (c) => {
  return c.json({ status: "ok", deployed: true });
});

app.get("/make-server-7cfb0012/test-auth", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    const accessToken = authHeader?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'No token provided' }, 401);
    }
    const { data: { user }, error: authError } = await getUserFromToken(accessToken);
    return c.json({
      success: !authError && !!user,
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      error: authError?.message,
      tokenLength: accessToken.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post("/make-server-7cfb0012/auth/signup", async (c) => {
  try {
    const { email, password, name } = await c.req.json();
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });
    if (error) {
      console.error('Error signing up user:', error);
      return c.json({ success: false, error: error.message }, 400);
    }
    return c.json({ success: true, user: data.user });
  } catch (error) {
    console.error('Error in signup endpoint:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get("/make-server-7cfb0012/data", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('Auth header received:', authHeader ? 'Present' : 'Missing');
    const accessToken = authHeader?.split(' ')[1];
    if (!accessToken) {
      console.error('No access token provided in Authorization header');
      return c.json({ success: false, error: 'Unauthorized - No token' }, 401);
    }
    console.log('Validating access token...');
    const { data: { user }, error: authError } = await getUserFromToken(accessToken);
    if (!user || authError) {
      console.error('Authorization error while fetching data:', authError);
      return c.json({ success: false, error: `Unauthorized - ${authError?.message || 'Invalid token'}` }, 401);
    }
    console.log('User authenticated:', user.id);
    const userId = user.id;
    const allData = await kvGetByPrefix(`taskapp:${userId}:`);
    const dataMap: Record<string, any> = {};
    if (allData && Array.isArray(allData)) {
      for (const item of allData) {
        if (item && item.key && item.value) {
          const dateKey = item.key.replace(`taskapp:${userId}:`, "");
          dataMap[dateKey] = item.value;
        }
      }
    }
    console.log('Data fetched successfully, keys:', Object.keys(dataMap).length);
    return c.json({ success: true, data: dataMap });
  } catch (error) {
    console.error('Error fetching data from KV store:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.get("/make-server-7cfb0012/data/:date", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const { data: { user }, error: authError } = await getUserFromToken(accessToken);
    if (!user || authError) {
      console.error('Authorization error while fetching date data:', authError);
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const userId = user.id;
    const date = c.req.param('date');
    const data = await kvGet(`taskapp:${userId}:${date}`);
    return c.json({ success: true, data: data || { tasks: [], photos: [] } });
  } catch (error) {
    console.error(`Error fetching data for date ${c.req.param('date')} from KV store:`, error);
    return c.json({ success: true, data: { tasks: [], photos: [] } });
  }
});

app.post("/make-server-7cfb0012/data/:date", async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    console.log('=== POST /data/:date - Auth Debug ===');
    console.log('Auth header:', authHeader ? `Bearer ${authHeader.substring(7, 27)}...` : 'Missing');
    const accessToken = authHeader?.split(' ')[1];
    if (!accessToken) {
      console.error('No access token in request');
      return c.json({ success: false, error: 'Unauthorized - No token' }, 401);
    }
    console.log('Token length:', accessToken.length);
    console.log('Attempting to verify JWT...');
    const { data: { user }, error: authError } = await getUserFromToken(accessToken);
    console.log('Verification result:', {
      hasUser: !!user,
      userId: user?.id,
      userEmail: user?.email,
      errorCode: authError?.code,
      errorMessage: authError?.message,
      errorStatus: authError?.status
    });
    if (!user || authError) {
      console.error('Authorization failed:', authError);
      return c.json({ 
        success: false, 
        error: `Unauthorized - ${authError?.message || 'Invalid token'}`,
        code: 401,
        message: 'Invalid JWT'
      }, 401);
    }
    const userId = user.id;
    const date = c.req.param('date');
    const body = await c.req.json();
    console.log(`Saving data for user ${userId}, date ${date}`);
    await kvSet(`taskapp:${userId}:${date}`, body);
    console.log('Data saved successfully');
    return c.json({ success: true });
  } catch (error) {
    console.error(`Error saving data for date ${c.req.param('date')} to KV store:`, error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.post("/make-server-7cfb0012/photos/upload", async (c) => {
  try {
    await ensureBucket();
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const { data: { user }, error: authError } = await getUserFromToken(accessToken);
    if (!user || authError) {
      console.error('Authorization error while uploading photo:', authError);
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const userId = user.id;
    const body = await c.req.json();
    const { base64Data, fileName } = body;
    const base64WithoutPrefix = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64WithoutPrefix), c => c.charCodeAt(0));
    const supabase = getSupabaseClient();
    const filePath = `${userId}/${Date.now()}-${fileName}`;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, binaryData, {
        contentType: 'image/jpeg',
        upsert: false
      });
    if (error) {
      console.error('Error uploading photo to storage:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 31536000);
    return c.json({ 
      success: true, 
      url: urlData?.signedUrl,
      path: filePath 
    });
  } catch (error) {
    console.error('Error in photo upload endpoint:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

app.delete("/make-server-7cfb0012/photos/:path", async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    if (!accessToken) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const { data: { user }, error: authError } = await getUserFromToken(accessToken);
    if (!user || authError) {
      console.error('Authorization error while deleting photo:', authError);
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }
    const userId = user.id;
    const path = decodeURIComponent(c.req.param('path'));
    if (!path.startsWith(`${userId}/`)) {
      return c.json({ success: false, error: 'Unauthorized - Cannot delete other users photos' }, 403);
    }
    const supabase = getSupabaseClient();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);
    if (error) {
      console.error('Error deleting photo from storage:', error);
      return c.json({ success: false, error: error.message }, 500);
    }
    return c.json({ success: true });
  } catch (error) {
    console.error('Error in photo delete endpoint:', error);
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve(app.fetch);
