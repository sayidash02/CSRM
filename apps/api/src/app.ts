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
import uploadRouter from './routes/upload';
import syncRouter from './routes/sync';
import exportRouter from './routes/export';
import dashboardRouter from './routes/dashboard';
import importRoutes from './routes/import';
import archiveRoutes from './routes/archive';
import yearsRouter from './routes/years';
import devRoutes from './routes/dev';
import stakeholderMasterRouter from './routes/stakeholder.routes';
import { errorHandler } from './lib/errorHandler';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use('/api/daily-activities', dailyActivitiesRouter);
app.use('/api/references', referencesRouter);
app.use('/api/stakeholders', stakeholdersRouter);
app.use('/api/master-stakeholders', stakeholderMasterRouter);
app.use('/api/top-issues', topIssuesRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/csr-projects', csrProjectsRouter);
app.use('/api/grievance', grievanceRouter);
app.use('/api/lrp', lrpRouter);
app.use('/api/upload', uploadRouter);
app.use('/api/sync', syncRouter);
app.use('/api/export', exportRouter);
app.use('/api/pics', picsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/import', importRoutes);
app.use('/api/archive', archiveRoutes);
app.use('/api/years', yearsRouter);
app.use('/api/dev', devRoutes);

app.use(errorHandler);

export default app;
