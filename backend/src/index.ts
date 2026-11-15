import "dotenv/config";
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { skillsRouter } from './routes/skills';
import { matchesRouter } from './routes/matches';
import { availabilityRouter } from './routes/availability';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({origin: 'http://localhost:4200' }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/users', availabilityRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/matches', matchesRouter);

app.get('/api/health', (_req,res) =>{
    res.json({status: 'ok'});
});

app.listen(PORT, ()=>{
    console.log(`API running on http://localhost:${PORT}`);

})