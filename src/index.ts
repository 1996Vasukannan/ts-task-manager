import express, { Request, Response } from 'express';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const connectWithRetry = async () => {
  let retries = 5;
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id SERIAL PRIMARY KEY,
          title TEXT NOT NULL,
          done BOOLEAN DEFAULT false
        )
      `);
      console.log('Database connected successfully');
      break;
    } catch (err) {
      retries -= 1;
      console.log(`DB not ready, retrying... (${retries} attempts left)`);
      await new Promise(res => setTimeout(res, 3000)); // wait 3 seconds
    }
  }
};

connectWithRetry();

pool.query(`
  CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    done BOOLEAN DEFAULT false
  )
`);

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok working' });
});

app.get('/tasks', async (_req: Request, res: Response) => {
  const result = await pool.query('SELECT * FROM tasks ORDER BY id');
  res.json(result.rows);
});

app.post('/tasks', async (req: Request, res: Response) => {
  const { title } = req.body;
  const result = await pool.query(
    'INSERT INTO tasks (title) VALUES ($1) RETURNING *',
    [title]
  );
  res.status(201).json(result.rows[0]);
});

app.delete('/tasks/:id', async (req: Request, res: Response) => {
  await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
  res.json({ message: 'Task deleted' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));