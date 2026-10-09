import 'dotenv/config';
import Fastify, { FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import cookie from '@fastify/cookie';
import multipart from '@fastify/multipart';
import { Pool } from 'pg';
import crypto from 'node:crypto';
import { z } from 'zod';
import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand, CreateBucketCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const app = Fastify({ logger: true });
const port = Number(process.env.API_PORT ?? 4000);
const origin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const accessSecret = process.env.JWT_SECRET ?? 'change-this-access-secret';
const sessionSecret = process.env.SESSION_SECRET ?? 'change-this-session-secret';
const accessTtl = 15 * 60 * 1000;
const refreshTtl = 7 * 24 * 60 * 60 * 1000;
const bucket = process.env.S3_BUCKET ?? 'civictrack';

const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  credentials: { accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin', secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin' }
});

await app.register(cors, { origin, credentials: true });
await app.register(helmet, { contentSecurityPolicy: false });
await app.register(cookie);
await app.register(multipart, { limits: { fileSize: 15 * 1024 * 1024, files: 1 } });

function hash(value: string) { return crypto.createHash('sha256').update(value).digest('hex'); }
function passwordHash(password: string) { return crypto.scryptSync(password, process.env.PASSWORD_SALT ?? 'civictrack-local-salt', 64).toString('hex'); }
function safeUser(row: any) { return { id: row.id, name: row.name, email: row.email, role: row.role, status: row.status, created_at: row.created_at }; }
function signAccess(user: { id: string; role: string }) {
  const payload = Buffer.from(JSON.stringify({ sub: user.id, role: user.role, exp: Date.now() + accessTtl })).toString('base64url');
  const sig = crypto.createHmac('sha256', accessSecret).update(payload).digest('base64url');
  return `${payload}.${sig}`;
}
function verifyAccess(token?: string) {
  if (!token) return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = crypto.createHmac('sha256', accessSecret).update(payload).digest('base64url');
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  if (!data.exp || data.exp < Date.now()) return null;
  return data as { sub: string; role: string; exp: number };
}
function setAuthCookies(reply: FastifyReply, user: any, refreshToken: string) {
  reply.setCookie('ct_access', signAccess(user), { httpOnly: true, sameSite: 'lax', secure: false, path: '/', maxAge: accessTtl / 1000 });
  reply.setCookie('ct_refresh', refreshToken, { httpOnly: true, sameSite: 'lax', secure: false, path: '/auth', maxAge: refreshTtl / 1000 });
}
async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  const token = request.cookies?.ct_access;
  const claims = verifyAccess(token);
  if (!claims) return reply.code(401).send({ error: 'Authentication required' });
  const user = (await pool.query('SELECT id,name,email,role,status FROM users WHERE id=$1', [claims.sub])).rows[0];
  if (!user || user.status !== 'ACTIVE') return reply.code(401).send({ error: 'Account is inactive' });
  (request as any).user = user;
}
function requireRole(...roles: string[]) { return async (request: FastifyRequest, reply: FastifyReply) => { await requireAuth(request, reply); if (reply.sent) return; if (!roles.includes((request as any).user.role)) return reply.code(403).send({ error: 'Insufficient permissions' }); }; }
async function audit(actor: string | null, action: string, type: string, entity: string | null, metadata: any = {}) { await pool.query(`INSERT INTO audit_logs(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)`, [actor, action, type, entity, JSON.stringify(metadata)]); }

app.get('/health', async (_request, reply) => {
  try { await pool.query('SELECT 1'); return { status: 'ok', service: 'civictrack-api', version: '2.2.2', database: 'online' }; }
  catch { return reply.code(503).send({ status: 'degraded', service: 'civictrack-api', version: '2.2.2', database: 'offline' }); }
});

app.get('/auth/me', async (request, reply) => {
  await requireAuth(request, reply); if (reply.sent) return;
  return { user: safeUser((request as any).user) };
});
app.post('/auth/register', async (request, reply) => {
  const input = z.object({ name: z.string().min(2).max(100), email: z.string().email(), password: z.string().min(8).max(200) }).parse(request.body);
  const result = await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,'CITIZEN') RETURNING id,name,email,role,status,created_at`, [input.name.trim(), input.email.toLowerCase().trim(), passwordHash(input.password)]);
  const user = result.rows[0]; const refresh = crypto.randomBytes(48).toString('base64url');
  await pool.query(`INSERT INTO sessions(user_id,refresh_token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')`, [user.id, hash(refresh)]);
  setAuthCookies(reply, user, refresh); await audit(user.id, 'ACCOUNT_REGISTERED', 'USER', user.id);
  return reply.code(201).send({ user: safeUser(user) });
});
app.post('/auth/login', async (request, reply) => {
  const input = z.object({ email: z.string().email(), password: z.string().min(1) }).parse(request.body);
  let result: any;
  try { result = await pool.query(`SELECT id,name,email,password_hash,role,status,created_at FROM users WHERE email=$1`, [input.email.toLowerCase().trim()]); } catch (error) { app.log.error(error); return reply.code(503).send({ error: 'Database unavailable. Start Docker/PostgreSQL and try again.' }); }
  const user = result.rows[0];
  const suppliedHash = passwordHash(input.password);
  const storedHash = String(user?.password_hash ?? '');
  const passwordOk = storedHash.length === suppliedHash.length && crypto.timingSafeEqual(Buffer.from(suppliedHash, 'hex'), Buffer.from(storedHash, 'hex'));
  if (!user || user.status !== 'ACTIVE' || !passwordOk) return reply.code(401).send({ error: 'Invalid email or password' });
  const refresh = crypto.randomBytes(48).toString('base64url'); await pool.query(`INSERT INTO sessions(user_id,refresh_token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')`, [user.id, hash(refresh)]);
  setAuthCookies(reply, user, refresh); await audit(user.id, 'LOGIN', 'USER', user.id); return { user: safeUser(user) };
});
app.post('/auth/refresh', async (request, reply) => {
  const token = request.cookies?.ct_refresh; if (!token) return reply.code(401).send({ error: 'Refresh session missing' });
  const result = await pool.query(`SELECT s.id,u.id as user_id,u.name,u.email,u.role,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.refresh_token_hash=$1 AND s.expires_at>now()`, [hash(token)]);
  const session = result.rows[0]; if (!session || session.status !== 'ACTIVE') return reply.code(401).send({ error: 'Refresh session expired' });
  await pool.query('DELETE FROM sessions WHERE id=$1', [session.id]); const next = crypto.randomBytes(48).toString('base64url'); await pool.query(`INSERT INTO sessions(user_id,refresh_token_hash,expires_at) VALUES($1,$2,now()+interval '7 days')`, [session.user_id, hash(next)]); setAuthCookies(reply, session, next); return { user: safeUser(session) };
});
app.post('/auth/logout', async (request, reply) => { const token=request.cookies?.ct_refresh; if(token) await pool.query('DELETE FROM sessions WHERE refresh_token_hash=$1',[hash(token)]); reply.clearCookie('ct_access',{path:'/'}); reply.clearCookie('ct_refresh',{path:'/auth'}); return { ok:true }; });

app.get('/projects/nearby', async (request) => {
  const q = z.object({ lat:z.coerce.number().optional(), lon:z.coerce.number().optional(), radius:z.coerce.number().min(0.1).max(100).default(10) }).parse(request.query);
  if (q.lat !== undefined && q.lon !== undefined) {
    const result = await pool.query(`SELECT p.*, ST_Distance(p.geom,ST_SetSRID(ST_MakePoint($2,$1),4326)::geography) AS distance_m FROM projects p WHERE p.visibility='PUBLIC' AND p.geom IS NOT NULL AND ST_DWithin(p.geom,ST_SetSRID(ST_MakePoint($2,$1),4326)::geography,$3) ORDER BY distance_m ASC LIMIT 100`, [q.lat,q.lon,q.radius*1000]);
    return { data: result.rows };
  }
  return { data: (await pool.query(`SELECT * FROM projects WHERE visibility='PUBLIC' ORDER BY created_at DESC LIMIT 100`)).rows };
});
app.get('/projects/public',async()=>({data:(await pool.query(`SELECT * FROM projects WHERE visibility='PUBLIC' ORDER BY created_at DESC LIMIT 100`)).rows}));
app.get('/projects/all',{preHandler:requireRole('GOVERNMENT','ADMIN')},async()=>({data:(await pool.query(`SELECT * FROM projects ORDER BY created_at DESC LIMIT 300`)).rows}));

app.get('/projects/mine',{preHandler:requireAuth},async(request)=>{const u=(request as any).user; const rows= u.role==='CONTRACTOR' ? await pool.query(`SELECT * FROM projects WHERE contractor_user_id=$1 ORDER BY created_at DESC`,[u.id]) : await pool.query(`SELECT * FROM projects WHERE created_at >= now()-interval '30 days' ORDER BY created_at DESC LIMIT 100`); return {data:rows.rows};});

app.get('/projects/:id', async (request, reply) => { const id=z.string().uuid().parse((request.params as any).id); const p=(await pool.query(`SELECT * FROM projects WHERE id=$1`,[id])).rows[0]; if(!p)return reply.code(404).send({error:'Project not found'}); if(p.visibility!=='PUBLIC'){const claims=verifyAccess(request.cookies?.ct_access);if(!claims)return reply.code(404).send({error:'Project not found'}); const u=(await pool.query("SELECT role FROM users WHERE id=$1 AND status='ACTIVE'",[claims.sub])).rows[0]; if(!u||!['GOVERNMENT','ADMIN','CONTRACTOR'].includes(u.role))return reply.code(404).send({error:'Project not found'});} const [e,c,comments]=await Promise.all([pool.query(`SELECT * FROM evidence WHERE project_id=$1 ORDER BY created_at DESC`,[id]),pool.query(`SELECT c.*,p.name AS project_name FROM complaints c LEFT JOIN projects p ON p.id=c.project_id WHERE c.project_id=$1 ORDER BY c.created_at DESC`,[id]),pool.query(`SELECT c.id,c.project_id,u.name AS author_name,c.body,c.created_at FROM comments c LEFT JOIN users u ON u.id=c.created_by WHERE c.project_id=$1 AND c.status='PUBLISHED' ORDER BY c.created_at DESC`,[id])]); return {project:p,evidence:e.rows,complaints:c.rows,comments:comments.rows}; });
const projectSchema=z.object({project_code:z.string().min(2).max(40),name:z.string().min(2).max(200),description:z.string().default(''),status:z.enum(['DRAFT','ASSIGNED','ACTIVE','PUBLIC','COMPLETED','ARCHIVED']).default('DRAFT'),visibility:z.enum(['PRIVATE','PUBLIC']).default('PRIVATE'),budget:z.number().nullable().optional(),latitude:z.number().min(-90).max(90).nullable().optional(),longitude:z.number().min(-180).max(180).nullable().optional(),contractor_name:z.string().nullable().optional(),start_date:z.string().nullable().optional(),expected_completion_date:z.string().nullable().optional()});
app.post('/projects',{preHandler:requireRole('GOVERNMENT','ADMIN')},async(request,reply)=>{const input=projectSchema.parse(request.body);const actor=(request as any).user.id;const r=await pool.query(`INSERT INTO projects(project_code,name,description,status,visibility,budget,latitude,longitude,geom,contractor_name,start_date,expected_completion_date) VALUES($1,$2,$3,$4,$5,$6,$7,$8,CASE WHEN $7 IS NOT NULL AND $8 IS NOT NULL THEN ST_SetSRID(ST_MakePoint($8,$7),4326)::geography ELSE NULL END,$9,$10,$11) RETURNING *`,[input.project_code,input.name,input.description,input.status,input.visibility,input.budget??null,input.latitude??null,input.longitude??null,input.contractor_name??null,input.start_date??null,input.expected_completion_date??null]);await audit(actor,'PROJECT_CREATED','PROJECT',r.rows[0].id,{project_code:input.project_code});return reply.code(201).send(r.rows[0]);});
app.get('/users/contractors',{preHandler:requireRole('GOVERNMENT','ADMIN')},async()=>({data:(await pool.query(`SELECT id,name,email,role,status,created_at FROM users WHERE role='CONTRACTOR' AND status='ACTIVE' ORDER BY name`)).rows}));
app.post('/projects/:id/assign',{preHandler:requireRole('GOVERNMENT','ADMIN')},async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const input=z.object({contractor_user_id:z.string().uuid()}).parse(request.body);const contractor=(await pool.query(`SELECT id,name,role FROM users WHERE id=$1 AND status='ACTIVE'`,[input.contractor_user_id])).rows[0];if(!contractor||contractor.role!=='CONTRACTOR')return reply.code(400).send({error:'Selected user is not an active contractor'});const r=await pool.query(`UPDATE projects SET contractor_user_id=$2,contractor_name=$3,status=CASE WHEN status='DRAFT' THEN 'ASSIGNED' ELSE status END,updated_at=now() WHERE id=$1 RETURNING *`,[id,contractor.id,contractor.name]);if(!r.rowCount)return reply.code(404).send({error:'Project not found'});await audit((request as any).user.id,'PROJECT_ASSIGNED','PROJECT',id,{contractor_user_id:contractor.id});await pool.query(`INSERT INTO notifications(user_id,title,body,type) VALUES($1,$2,$3,$4)`,[contractor.id,'Project assigned',`You have been assigned to ${r.rows[0].name}.`,'PROJECT']);return r.rows[0];});
app.patch('/projects/:id',{preHandler:requireRole('GOVERNMENT','ADMIN')},async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const input=z.object({status:z.enum(['DRAFT','ASSIGNED','ACTIVE','PUBLIC','COMPLETED','ARCHIVED']).optional(),visibility:z.enum(['PRIVATE','PUBLIC']).optional(),contractor_name:z.string().nullable().optional()}).parse(request.body);const r=await pool.query(`UPDATE projects SET status=COALESCE($2,status),visibility=COALESCE($3,visibility),contractor_name=COALESCE($4,contractor_name),updated_at=now() WHERE id=$1 RETURNING *`,[id,input.status??null,input.visibility??null,input.contractor_name??null]);if(!r.rowCount)return reply.code(404).send({error:'Project not found'});await audit((request as any).user.id,'PROJECT_UPDATED','PROJECT',id,input);return r.rows[0];});

const complaintSchema=z.object({project_id:z.string().uuid().nullable().optional(),title:z.string().min(3).max(200),description:z.string().min(5).max(5000),severity:z.enum(['LOW','MEDIUM','HIGH','CRITICAL']).default('MEDIUM')});
app.get('/complaints',async()=>({data:(await pool.query(`SELECT c.*,p.name AS project_name FROM complaints c LEFT JOIN projects p ON p.id=c.project_id WHERE c.project_id IS NULL OR p.visibility='PUBLIC' ORDER BY c.created_at DESC LIMIT 200`)).rows}));
app.post('/complaints',{preHandler:requireAuth},async(request,reply)=>{const input=complaintSchema.parse(request.body);const actor=(request as any).user.id;const code=`ISS-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;const r=await pool.query(`INSERT INTO complaints(project_id,issue_code,title,description,severity,created_by) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[input.project_id??null,code,input.title,input.description,input.severity,actor]);await pool.query(`INSERT INTO complaint_supports(complaint_id,user_id) VALUES($1,$2)`,[r.rows[0].id,actor]);const updated=await pool.query(`UPDATE complaints SET support_count=1 WHERE id=$1 RETURNING *`,[r.rows[0].id]);await audit(actor,'COMPLAINT_CREATED','COMPLAINT',r.rows[0].id,{issue_code:code});return reply.code(201).send(updated.rows[0]);});
app.post('/complaints/:id/support',{preHandler:requireAuth},async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const actor=(request as any).user.id;try{await pool.query(`INSERT INTO complaint_supports(complaint_id,user_id) VALUES($1,$2)`,[id,actor]);const r=await pool.query(`UPDATE complaints SET support_count=support_count+1,updated_at=now() WHERE id=$1 RETURNING *`,[id]);if(!r.rowCount)return reply.code(404).send({error:'Complaint not found'});await audit(actor,'COMPLAINT_SUPPORTED','COMPLAINT',id);return r.rows[0];}catch(e:any){if(e.code==='23505')return reply.code(409).send({error:'You already support this issue'});throw e;}});
app.patch('/complaints/:id',{preHandler:requireRole('GOVERNMENT','ADMIN')},async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const input=z.object({status:z.enum(['OPEN','UNDER_REVIEW','RESOLVED','REJECTED']),resolution_note:z.string().max(2000).optional()}).parse(request.body);const r=await pool.query(`UPDATE complaints SET status=$2,updated_at=now() WHERE id=$1 RETURNING *`,[id,input.status]);if(!r.rowCount)return reply.code(404).send({error:'Complaint not found'});await audit((request as any).user.id,'COMPLAINT_STATUS_CHANGED','COMPLAINT',id,input);return r.rows[0];});
const commentSchema=z.object({project_id:z.string().uuid(),body:z.string().min(2).max(2000)});
app.get('/projects/:id/comments',async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const p=(await pool.query(`SELECT id,visibility FROM projects WHERE id=$1`,[id])).rows[0];if(!p||p.visibility!=='PUBLIC')return reply.code(404).send({error:'Project not found'});return {data:(await pool.query(`SELECT c.id,c.project_id,u.name AS author_name,c.body,c.created_at FROM comments c LEFT JOIN users u ON u.id=c.created_by WHERE c.project_id=$1 AND c.status='PUBLISHED' ORDER BY c.created_at DESC`,[id])).rows};});
app.post('/comments',{preHandler:requireAuth},async(request,reply)=>{const input=commentSchema.parse(request.body);const project=(await pool.query(`SELECT id,visibility FROM projects WHERE id=$1`,[input.project_id])).rows[0];if(!project||project.visibility!=='PUBLIC')return reply.code(404).send({error:'Public project not found'});const actor=(request as any).user.id;const r=await pool.query(`INSERT INTO comments(project_id,body,created_by) VALUES($1,$2,$3) RETURNING id,project_id,body,created_by,created_at`,[input.project_id,input.body.trim(),actor]);await audit(actor,'COMMENT_CREATED','PROJECT',input.project_id,{comment_id:r.rows[0].id});return reply.code(201).send(r.rows[0]);});

app.get('/evidence',async()=>({data:(await pool.query(`SELECT e.*,p.name AS project_name FROM evidence e LEFT JOIN projects p ON p.id=e.project_id ORDER BY e.created_at DESC LIMIT 200`)).rows}));
app.get('/evidence/:id/url',async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const e=(await pool.query(`SELECT object_key FROM evidence WHERE id=$1`,[id])).rows[0];if(!e)return reply.code(404).send({error:'Evidence not found'});const url=await getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:e.object_key}),{expiresIn:300});return {url};});
app.post('/evidence',{preHandler:requireAuth},async(request,reply)=>{const file=await request.file();if(!file)return reply.code(400).send({error:'Image file is required'});if(!file.mimetype.startsWith('image/'))return reply.code(400).send({error:'Only image evidence is accepted'});const fields=file.fields as any;const projectId=typeof fields.project_id?.value==='string'&&fields.project_id.value?fields.project_id.value:null;const lat=fields.latitude?.value?Number(fields.latitude.value):null;const lon=fields.longitude?.value?Number(fields.longitude.value):null;const capturedAt=String(fields.captured_at?.value||new Date().toISOString());const source=String(fields.source?.value||'WEB_CAMERA');const notes=String(fields.notes?.value||'');const expected=String(fields.sha256?.value||'');const buffer=await file.toBuffer();const sha=crypto.createHash('sha256').update(buffer).digest('hex');if(expected&&expected!==sha)return reply.code(400).send({error:'SHA-256 mismatch. The uploaded bytes do not match the claimed hash.'});const id=crypto.randomUUID();const objectKey=`evidence/${id}/${file.filename.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await s3.send(new PutObjectCommand({Bucket:bucket,Key:objectKey,Body:buffer,ContentType:file.mimetype}));const r=await pool.query(`INSERT INTO evidence(id,project_id,file_name,mime_type,sha256,latitude,longitude,captured_at,source,notes,created_by,object_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[id,projectId,file.filename,file.mimetype,sha,lat,lon,capturedAt,source,notes,(request as any).user.id,objectKey]);await audit((request as any).user.id,'EVIDENCE_SUBMITTED','EVIDENCE',id,{sha256:sha,source});return reply.code(201).send(r.rows[0]);});
app.patch('/evidence/:id',{preHandler:requireRole('GOVERNMENT','ADMIN')},async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const input=z.object({status:z.enum(['SUBMITTED','VERIFIED','REJECTED']),notes:z.string().max(3000).optional()}).parse(request.body);const r=await pool.query(`UPDATE evidence SET status=$2,notes=COALESCE($3,notes) WHERE id=$1 RETURNING *`,[id,input.status,input.notes??null]);if(!r.rowCount)return reply.code(404).send({error:'Evidence not found'});await audit((request as any).user.id,'EVIDENCE_STATUS_CHANGED','EVIDENCE',id,input);return r.rows[0];});

app.get('/notifications',{preHandler:requireAuth},async(request)=>({data:(await pool.query(`SELECT * FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,[(request as any).user.id])).rows}));
app.patch('/notifications/:id/read',{preHandler:requireAuth},async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const r=await pool.query(`UPDATE notifications SET read_at=now() WHERE id=$1 AND user_id=$2 RETURNING *`,[id,(request as any).user.id]);if(!r.rowCount)return reply.code(404).send({error:'Notification not found'});return r.rows[0];});
app.get('/audit',{preHandler:requireRole('GOVERNMENT','ADMIN')},async()=>({data:(await pool.query(`SELECT a.*,u.name AS actor_name FROM audit_logs a LEFT JOIN users u ON u.id=a.actor_user_id ORDER BY a.created_at DESC LIMIT 200`)).rows}));
app.get('/stats',async()=>{const [p,c,e]=await Promise.all([pool.query(`SELECT status,count(*)::int AS count FROM projects GROUP BY status`),pool.query(`SELECT status,count(*)::int AS count FROM complaints GROUP BY status`),pool.query(`SELECT status,count(*)::int AS count FROM evidence GROUP BY status`)]);return {projects:p.rows,complaints:c.rows,evidence:e.rows};});
app.get('/admin/users',{preHandler:requireRole('ADMIN')},async()=>({data:(await pool.query(`SELECT id,name,email,role,status,created_at FROM users ORDER BY created_at DESC LIMIT 200`)).rows}));
app.post('/admin/users',{preHandler:requireRole('ADMIN')},async(request,reply)=>{const input=z.object({name:z.string().min(2),email:z.string().email(),password:z.string().min(8),role:z.enum(['CITIZEN','CONTRACTOR','GOVERNMENT','ADMIN'])}).parse(request.body);const r=await pool.query(`INSERT INTO users(name,email,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,name,email,role,status,created_at`,[input.name,input.email.toLowerCase(),passwordHash(input.password),input.role]);await audit((request as any).user.id,'USER_CREATED','USER',r.rows[0].id,{role:input.role});return reply.code(201).send(safeUser(r.rows[0]));});
app.patch('/admin/users/:id',{preHandler:requireRole('ADMIN')},async(request,reply)=>{const id=z.string().uuid().parse((request.params as any).id);const input=z.object({role:z.enum(['CITIZEN','CONTRACTOR','GOVERNMENT','ADMIN']).optional(),status:z.enum(['ACTIVE','SUSPENDED']).optional()}).parse(request.body);const r=await pool.query(`UPDATE users SET role=COALESCE($2,role),status=COALESCE($3,status) WHERE id=$1 RETURNING id,name,email,role,status,created_at`,[id,input.role??null,input.status??null]);if(!r.rowCount)return reply.code(404).send({error:'User not found'});await audit((request as any).user.id,'USER_UPDATED','USER',id,input);return safeUser(r.rows[0]);});

async function ensureBucket(){try{await s3.send(new HeadBucketCommand({Bucket:bucket}));}catch(err:any){try{await s3.send(new CreateBucketCommand({Bucket:bucket}));app.log.info(`Object storage bucket ready: ${bucket}`);}catch(createErr){app.log.warn({err:createErr},'Object storage bucket could not be initialized');}}}

app.setErrorHandler((error:any,_request,reply)=>{if(error instanceof z.ZodError)return reply.code(400).send({error:'Invalid request',details:error.flatten()});if(error.code==='23505')return reply.code(409).send({error:'A record with that unique value already exists'});app.log.error(error);return reply.code(500).send({error:'Internal server error'});});
await ensureBucket();
await app.listen({host:'0.0.0.0',port});
