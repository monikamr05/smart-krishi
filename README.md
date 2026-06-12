# Smart Krishi Backend + ML

## 1) Install backend dependencies

```bash
cd backend
npm install
```

## 2) Configure environment

Create `.env` in `backend/` from `.env.example`:

```env
PORT=4000
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
```

## 3) Start backend API

```bash
npm run dev
```

Backend runs on `http://localhost:4000`.

open https://smart-krishi--monikagowda795.replit.app in your browser


## API endpoints

- `GET /api/health`
- `POST /api/recommend-crops` with `{ "n": 62, "p": 38, "k": 47 }`
- `POST /api/assistant` with `{ "query": "...", "location": "...", "npk": { "n": 62, "p": 38, "k": 47 } }`
- `GET /api/community/messages`
- `POST /api/community/messages` with `{ "author": "You", "message": "..." }`

## ML model files

Inside `backend/ml`:

- `train_model.py` trains a RandomForest crop classifier.
- `predict.py` predicts crop for input NPK.
- `requirements.txt` lists Python dependencies.

### Train ML model

```bash
cd backend/ml
pip install -r requirements.txt
python train_model.py
```

### Run prediction

```bash
python predict.py --n 62 --p 38 --k 47
```
