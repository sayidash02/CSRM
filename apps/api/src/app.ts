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

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

import uploadRouter from './routes/upload';
import exportRouter from './routes/export';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/daily-activities', dailyActivitiesRouter);
app.use('/api/references', referencesRouter);
app.use('/api/stakeholders', stakeholdersRouter);
app.use('/api/top-issues', topIssuesRouter);
app.use('/api/proposals', proposalsRouter);
app.use('/api/csr-projects', csrProjectsRouter);
app.use('/api/grievance', grievanceRouter);
app.use('/api/lrp', lrpRouter);
app.use('/api/upload', uploadRouter);
import syncRouter from './routes/sync';
app.use('/api/sync', syncRouter);
app.use('/api/export', exportRouter);
app.use('/api/pics', picsRouter);

export default app;
