import express from 'express';
import mongoose from 'mongoose';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import morgan from 'morgan';
import cors from 'cors';

const PORT = process.env.PORT || 4000;
const mongoURI = process.env.MONGO || 'mongodb://localhost:27017/cookie-prep';

const app = express();

mongoose
  .connect(mongoURI)
  .then(() => console.log('Mit MongoDB verbunden', mongoURI))
  .catch(console.log);

mongoose.connection.on('error', console.log);

app.use(morgan('dev'));
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT || 'http://localhost:5173',
    credentials: true,
  })
);

const store = MongoStore.create({ client: mongoose.connection.getClient() });
const cookieOptions = {
  httpOnly: true,
  secure: app.get('env') === 'production',
  sameSite: app.get('env') === 'production' ? 'None' : 'Lax',
  maxAge: 5 * 60 * 1000
};
app.set('trust proxy', 1);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'my session secret',
    resave: false,
    saveUninitialized: false,
    store,
    cookie: cookieOptions,
  })
);

const auth = (req, res, next) => {
  const userId = req.session.userId;
  if (!userId) {
    const error = new Error('Ungültige Session; du bist nicht eingeloggt');
    error.status = 401;
    return next(error);
  }
  req.userId = userId;
  next();
};

app.post('/login', (req, res) => {
  req.session.userId = 123;
  res.send({ message: 'Du bist eingeloggt' });
});

app.get('/secret', auth, (req, res) => {
  res.send({ message: 'Geheim!!!' });
});

app.post('/logout', (req, res, next) => {
  req.session.destroy((err) => {
    if (err) {
      return next(err);
    }
    res.send({ message: 'Du bist ausgeloggt.' });
  });
});

app.use((err, req, res, next) => {
  console.log(err);
  res.status(err.status ?? 500).send({ error: err.message });
});

app.listen(PORT, () => console.log(`Server listens on port ${PORT}`));
