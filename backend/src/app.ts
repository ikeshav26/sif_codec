import express, { Express, Request, Response } from 'express'
import dotenv from 'dotenv'

dotenv.config()
const app: Express = express()

app.get('/', (req: Request, res: Response) => {
    res.send('api working')
})

export default app;