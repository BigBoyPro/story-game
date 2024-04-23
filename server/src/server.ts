import express from 'express';
import cors from 'cors';

const app = express();

app.use(express.json());
app.use(cors());

app.get('/api/baby', (req, res) => {
    res.json({baby: '👶'});
});

app.listen(4000, () => {
    console.log('Server is running on http://localhost:4000');
});