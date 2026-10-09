import 'dotenv/config';
import { Pool } from 'pg';
import fs from 'node:fs/promises';
import path from 'node:path';

const pool=new Pool({connectionString:process.env.DATABASE_URL});
const dir=path.resolve(process.cwd(),'../../migrations');
const files=(await fs.readdir(dir)).filter(x=>x.endsWith('.sql')).sort();
for(const file of files){console.log(`Applying ${file}...`);await pool.query(await fs.readFile(path.join(dir,file),'utf8'));}
await pool.end();
console.log(`CivicTrack database migrated (${files.length} migration files).`);
