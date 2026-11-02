import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://shantety-placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

const supabase = createClient(supabaseUrl, supabaseKey);

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    role?: string;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1];

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
    }

    req.user = {
      uid: user.id,
      email: user.email || '',
      name: user.user_metadata?.full_name || '',
      role: user.user_metadata?.role || 'customer',
    };

    next();
  } catch (err: any) {
    console.error('Supabase JWT verification error:', err);
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
}
