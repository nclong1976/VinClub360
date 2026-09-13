import express from 'express';
import { createClient } from '@supabase/supabase-js';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    supabase: { status: 'ok' | 'error'; latency?: number };
    node: { status: 'ok'; uptime: number; memory: NodeJS.MemoryUsage };
  };
  errors?: string[];
}

let startTime = Date.now();

export async function checkSupabaseHealth(supabaseAdmin: any): Promise<{ status: string; latency: number }> {
  if (!supabaseAdmin) return { status: 'error', latency: 0 };
  const start = Date.now();
  try {
    // Simple query to check connection
    const { error } = await supabaseAdmin.from('users').select('id').limit(1);
    const latency = Date.now() - start;
    if (error) return { status: 'error', latency };
    return { status: 'ok', latency };
  } catch (e) {
    return { status: 'error', latency: Date.now() - start };
  }
}

export function getNodeHealth() {
  return {
    status: 'ok' as const,
    uptime: Date.now() - startTime,
    memory: process.memoryUsage(),
  };
}

export async function getHealthStatus(supabaseAdmin: any): Promise<HealthStatus> {
  const errors: string[] = [];
  
  const supabaseHealth = await checkSupabaseHealth(supabaseAdmin);
  const nodeHealth = getNodeHealth();
  
  if (supabaseHealth.status === 'error') {
    errors.push('Supabase connection failed');
  }
  
  const status: HealthStatus['status'] = errors.length === 0 ? 'healthy' : 'degraded';
  
  return {
    status,
    timestamp: new Date().toISOString(),
    services: {
      supabase: {
        status: supabaseHealth.status as any,
        latency: supabaseHealth.latency,
      },
      node: nodeHealth,
    },
    ...(errors.length > 0 && { errors }),
  };
}

export function setupHealthRoute(app: express.Application, supabaseAdmin: any) {
  app.get('/health', async (req, res) => {
    try {
      const health = await getHealthStatus(supabaseAdmin);
      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (err: any) {
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        errors: [err?.message || 'Unknown error'],
      });
    }
  });
  
  app.get('/health/live', (req, res) => {
    res.status(200).json({ status: 'alive' });
  });
}
