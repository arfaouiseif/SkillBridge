import "dotenv/config";
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { skillsRouter } from './routes/skills';
import { matchesRouter } from './routes/matches';
import { availabilityRouter } from './routes/availability';
import { sessionsRouter } from './routes/sessions';
import { conversationsRouter } from './routes/conversations';
import { createServer } from 'http';
import { initSocket } from './socket';


const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({origin: 'http://localhost:4200' }));
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/users', availabilityRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/conversations', conversationsRouter);

app.get('/api/health', (_req,res) =>{
    res.json({status: 'ok'});
});

const server = createServer(app);
initSocket(server);

server.listen(PORT, ()=>{
    console.log(`API running on http://localhost:${PORT}`);

})