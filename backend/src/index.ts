import "dotenv/config";
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(cors({origin: 'http://localhost:4200' }));
app.use(express.json());

app.get('/api/health', (_req,res) =>{
    res.json({status: 'ok'});
});

app.listen(PORT, ()=>{
    console.log(`API running on http://localhost:${PORT}`);

})