import express from 'express';
import cors from 'cors';
import dailyActivitiesRouter from './routes/dailyActivities';

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/daily-activities', dailyActivitiesRouter);

export default app;
