import express, { Express, Request, Response } from 'express'
import dotenv from 'dotenv'
import authRoutes from './routes/auth.routes.js'
import imageRoutes from './routes/image.routes.js'

dotenv.config()
const app: Express = express()

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req: Request, res: Response) => {
    res.send('api working')
})

app.use('/api/auth', authRoutes);
app.use('/api/images', imageRoutes);

export default app;