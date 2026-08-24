import express from 'express';
import cors from 'cors';
import dailyActivitiesRouter from './routes/dailyActivities';
import referencesRouter from './routes/references';
import stakeholdersRouter from './routes/stakeholders';
import topIssuesRouter from './routes/topIssues';
import proposalsRouter from './routes/proposals';
import csrProjectsRouter from './routes/csrProjects';
import grievanceRouter from './routes/grievance';
import lrpRouter from './routes/lrp';
import picsRouter from './routes/pics';
import exportRouter from './routes/export';
import dashboardRouter from './routes/dashboard';
import importRoutes from './routes/import';
import archiveRoutes from './routes/archive';
import yearsRouter from './routes/years';
import devRoutes from './routes/dev';
import auditLogRoutes from './routes/auditLog.routes';
import authRouter from './routes/auth';
import adminUsersRouter from './routes/adminUsers';
import healthRouter from './routes/health';
import searchRouter from './routes/search';
import { AppError, errorHandler } from './lib/errorHandler';
import { authenticationMiddleware, isAllowedOrigin, originGuard } from './lib/auth';
import { requestIdMiddleware, requestLoggingMiddleware } from './lib/requestId';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
app.use(requestIdMiddleware);
app.use(requestLoggingMiddleware);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));
// JSON/form bodies stay small; large XLSX uploads use the route-specific Multer limit.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(originGuard);
app.use('/health', healthRouter);

// Authentication endpoints are intentionally public; all operational routes below are protected.
app.use('/api/auth', authRouter);
app.use('/api', authenticationMiddleware);
app.use('/api', (req, res, next) => {
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method);
  const isAccountRoute = req.path.startsWith('/admin/users');
  const isDevReset = req.path.startsWith('/dev');
  if (isMutation && req.crmsUser?.role === 'ADMIN' && !isAccountRoute && !isDevReset) {
    res.status(403).json({ error: { code: 'ADMIN_READ_ONLY', message: 'Akun admin hanya mengelola akun dan membaca data operasional' } });
    return;
  }
  next();
});

app.use('/api/daily-activities', dailyActivitiesRouter);
app.use('/api/references', referencesRouter);
app.use('/api/stakeholders', stakeholdersRouter);
app.use('/api/top-issues', topIssuesRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/csr-projects', csrProjectsRouter);
app.use('/api/grievance', grievanceRouter);
app.use('/api/lrp', lrpRouter);
app.use('/api/export', exportRouter);
app.use('/api/pics', picsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/import', importRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/years', yearsRouter);
app.use('/api/dev', devRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/admin/users', adminUsersRouter);
app.use('/api/search', searchRouter);

app.use((_req, _res, next) => next(new AppError('NOT_FOUND', 404, 'Not found')));
app.use(errorHandler);

export default app;
