import { Router, Request, Response } from 'express';
import { getMetrics } from '../utils/metrics';

const router = Router();

// Prometheus metrics endpoint
router.get('/', async (req: Request, res: Response) => {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Error generating metrics:', error);
    res.status(500).json({ error: 'Failed to generate metrics' });
  }
});

export default router;