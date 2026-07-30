import express from 'express';
import cors from 'cors';
import dailyActivitiesRouter from './routes/dailyActivities';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/daily-activities', dailyActivitiesRouter);

export default app;
