import express from 'express';

/**
 * Security headers middleware
 */
export function securityHeaders(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // CSP (basic)
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://api.telegram.org https://supabase.co wss:;"
  );
  
  next();
}

/**
 * Request logging middleware
 */
export function requestLogger(req: express.Request, res: express.Response, next: express.NextFunction) {
  const start = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';
    console.log(
      `[${level.toUpperCase()}] ${requestId} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });
  
  next();
}

/**
 * Request timeout middleware
 */
export function requestTimeout(timeoutMs = 30000) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          error: 'REQUEST_TIMEOUT',
          message: 'Request processing took too long',
          timestamp: new Date().toISOString(),
        });
      }
    }, timeoutMs);
    
    res.on('finish', () => clearTimeout(timeout));
    res.on('close', () => clearTimeout(timeout));
    
    next();
  };
}
