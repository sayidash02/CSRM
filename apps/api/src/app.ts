import express from 'express';
import cors from 'cors';
import dailyActivitiesRouter from './routes/dailyActivities';
import referencesRouter from './routes/references';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/daily-activities', dailyActivitiesRouter);
app.use('/api/references', referencesRouter);

export default app;
