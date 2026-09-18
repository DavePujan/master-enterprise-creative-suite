const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const k = trimmed.slice(0, eqIdx).trim();
      let v = trimmed.slice(eqIdx + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (process.env[k] === undefined) {
        process.env[k] = v;
      }
    }
  }
}

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;

if (!url || !key) {
  console.error("Missing SUPABASE_URL or SUPABASE_SECRET_KEY in environment");
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
  db: { schema: 'public' }
});

async function main() {
  if (process.argv.length > 2) {
    console.error("❌ Fatal Error: Passing passwords or credentials via command-line arguments is strictly prohibited.");
    console.error("Please configure ADMIN_PASSWORD as an environment variable or in your .env file.");
    process.exit(1);
  }

  const email = process.env.ADMIN_EMAIL || "writopedia.platform@gmail.com";
  const password = process.env.ADMIN_PASSWORD;
  const fullName = process.env.ADMIN_NAME || "Writopedia Platform Admin";

  if (!password) {
    console.error("❌ Fatal Error: Missing ADMIN_PASSWORD environment variable.");
    console.error("Please configure ADMIN_PASSWORD in your environment or .env file.");
    process.exit(1);
  }

  console.log(`Checking if user ${email} exists in Supabase Auth...`);
  
  // 1. Check existing users via auth.admin.listUsers
  const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) {
    console.error("Error listing users:", listError);
    process.exit(1);
  }

  let user = userList.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!user) {
    console.log(`User ${email} does not exist. Creating via supabase.auth.admin.createUser...`);
    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (createError) {
      console.error("Failed to create user:", createError);
      process.exit(1);
    }
    user = created.user;
    console.log(`User created successfully with ID: ${user.id}`);
  } else {
    console.log(`User ${email} already exists (ID: ${user.id}). Updating password and confirming email...`);
    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });
    if (updateError) {
      console.error("Failed to update user password:", updateError);
    } else {
      console.log("Password and confirmation updated successfully.");
      user = updated.user;
    }
  }

  const userId = user.id;

  // 2. Ensure profile exists in public.profiles
  console.log("Verifying public.profiles...");
  const { data: existingProfile, error: profileCheckErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (!existingProfile) {
    console.log("Inserting profile record...");
    const { error: profInsertErr } = await supabase.from('profiles').insert({
      id: userId,
      email,
      full_name: fullName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    if (profInsertErr) console.error("Error creating profile:", profInsertErr);
    else console.log("Profile record created.");
  } else {
    console.log("Profile record verified:", existingProfile.id);
  }

  // 3. Ensure role in public.user_roles is 'admin'
  console.log("Ensuring public.user_roles is 'admin'...");
  const { data: roleRow, error: roleErr } = await supabase
    .from('user_roles')
    .upsert({
      user_id: userId,
      role: 'admin',
      assigned_at: new Date().toISOString()
    })
    .select()
    .single();

  if (roleErr) {
    console.error("Error updating user_roles:", roleErr);
  } else {
    console.log("user_roles record verified:", roleRow);
  }

  // 4. Ensure workspace exists in public.workspaces
  console.log("Verifying public.workspaces...");
  const { data: memberWorkspaces, error: memberCheckErr } = await supabase
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId);

  let workspaceId;
  if (memberWorkspaces && memberWorkspaces.length > 0) {
    workspaceId = memberWorkspaces[0].workspace_id;
    console.log("Existing workspace membership found:", workspaceId);
  } else {
    console.log("Creating dedicated admin workspace...");
    const { data: newWs, error: wsErr } = await supabase
      .from('workspaces')
      .insert({
        name: 'Writopedia Admin Workspace',
        owner_id: userId,
        is_personal: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (wsErr) {
      console.error("Error creating workspace:", wsErr);
    } else {
      workspaceId = newWs.id;
      console.log("Workspace created:", workspaceId);
      const { error: addMemberErr } = await supabase.from('workspace_members').insert({
        workspace_id: workspaceId,
        user_id: userId,
        role: 'owner',
        joined_at: new Date().toISOString()
      });
      if (addMemberErr) console.error("Error adding workspace member:", addMemberErr);
      else console.log("Workspace member owner added.");
    }
  }

  // 5. Ensure credit balance exists
  if (workspaceId) {
    console.log("Verifying credit balance...");
    const { data: creditBal, error: credErr } = await supabase
      .from('credit_balances')
      .select('*')
      .eq('workspace_id', workspaceId)
      .maybeSingle();

    if (!creditBal) {
      console.log("Granting 10,000 admin credits...");
      await supabase.from('credit_balances').insert({
        workspace_id: workspaceId,
        balance: 10000,
        held_balance: 0,
        lifetime_granted: 10000,
        lifetime_spent: 0
      });
      await supabase.from('credit_ledger').insert({
        workspace_id: workspaceId,
        actor_user_id: userId,
        amount: 10000,
        resulting_balance: 10000,
        type: 'signup_grant',
        reference_id: 'admin_initial_grant',
        idempotency_key: `admin_init_${userId}_${Date.now()}`,
        description: 'Initial platform administrator credit grant'
      });
      console.log("Credit balance initialized.");
    } else {
      console.log("Credit balance exists:", creditBal.balance);
    }
  }

  console.log("\n==========================================");
  console.log("✅ Admin account setup completed perfectly!");
  console.log(`Email    : ${email}`);
  console.log(`Password : [SECURELY CONFIGURED VIA ENVIRONMENT]`);
  console.log(`Role     : admin`);
  console.log(`User ID  : ${userId}`);
  console.log("==========================================");
}

main().catch(err => {
  console.error("Fatal error during setup:", err);
  process.exit(1);
});
