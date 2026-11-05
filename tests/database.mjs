import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import assert from "node:assert/strict";
const db = new PGlite();
try {
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
 create schema auth;create schema storage;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;
 alter default privileges in schema public grant all on tables to anon,authenticated;
 create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 alter table storage.objects enable row level security;
 create function storage.foldername(text) returns text[] language sql immutable as $$select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1]$$;
 `);
  for (const file of (await readdir("supabase/migrations"))
    .filter((f) => f.endsWith(".sql"))
    .sort()) {
    await db.exec(await readFile("supabase/migrations/" + file, "utf8"));
    console.log("Migration PASS:", file);
  }
  for (const [id, name] of [
    ["d38d4d1f-ca7c-4d87-a1cf-8abecdae8891", "zenadmin"],
    ["c5a5d418-c050-41c8-9079-87f2435cea2d", "zenuser"],
  ])
    await db.query(`insert into auth.users values($1,$2,$3)`, [
      id,
      name + "@example.com",
      JSON.stringify({
        first_name: "Test",
        last_name: "User",
        nickname: "Test",
        phone: "0812345678",
        age: 25,
        username: name,
      }),
    ]);
  await db.exec(
    `insert into public.store_admin(user_id) values('d38d4d1f-ca7c-4d87-a1cf-8abecdae8891');`,
  );
  for (const file of [
    "security.sql",
    "customization.sql",
    "member-experience.sql",
  ]) {
    await db.exec(await readFile("tests/" + file, "utf8"));
    console.log("Rollback security PASS:", file);
  }
  const { rows } = await db.query(
    "select count(*)::integer as products from public.products",
  );
  assert.equal(rows[0].products, 0);
  console.log(
    "PASS: clean migrations 001–005 and three rollback suites on embedded PostgreSQL. Auth/Storage schemas are test stubs, not real Supabase services.",
  );
} catch (error) {
  console.error(
    "Database test FAILED:",
    error.message,
    error.code,
    error.where || "",
  );
  process.exitCode = 1;
} finally {
  await db.close();
}
