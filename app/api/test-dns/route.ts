import { NextResponse } from 'next/server'
import { lookup } from 'dns/promises'

export const dynamic = 'force-dynamic';

export async function GET() {
  const hosts = [
    'db.cjxejpgtuuqnbczpbdfe.supabase.co',
    'aws-0-us-east-1.pooler.supabase.com',
    'google.com', // Controle
  ];

  const results: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    platform: process.platform,
    nodeVersion: process.version,
    tests: [],
  };

  for (const host of hosts) {
    try {
      console.log(`Resolvendo DNS para: ${host}`);
      
      // Tentar resolver IPv4
      let ipv4: string[] = [];
      try {
        const result4 = await lookup(host, { family: 4, all: true });
        ipv4 = result4.map((r: any) => r.address);
      } catch (e: any) {
        console.log(`IPv4 falhou para ${host}:`, e.message);
      }

      // Tentar resolver IPv6
      let ipv6: string[] = [];
      try {
        const result6 = await lookup(host, { family: 6, all: true });
        ipv6 = result6.map((r: any) => r.address);
      } catch (e: any) {
        console.log(`IPv6 falhou para ${host}:`, e.message);
      }

      // Tentar sem especificar family
      let all: string[] = [];
      try {
        const resultAll = await lookup(host, { all: true });
        all = resultAll.map((r: any) => `${r.address} (${r.family === 4 ? 'IPv4' : 'IPv6'})`);
      } catch (e: any) {
        console.log(`Lookup geral falhou para ${host}:`, e.message);
      }

      results.tests.push({
        host,
        success: ipv4.length > 0 || ipv6.length > 0 || all.length > 0,
        ipv4: ipv4.length > 0 ? ipv4 : 'not found',
        ipv6: ipv6.length > 0 ? ipv6 : 'not found',
        all: all.length > 0 ? all : 'not found',
      });
    } catch (error: any) {
      results.tests.push({
        host,
        success: false,
        error: error.message,
        code: error.code,
      });
    }
  }

  return NextResponse.json(results, { status: 200 });
}

