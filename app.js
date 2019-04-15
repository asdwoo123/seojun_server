const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const session = require('express-session');
const cors = require('cors');
const passport = require('passport');
const requestIp = require('request-ip');
const morgan = require('morgan');
const helmet = require('helmet');
const hpp = require('hpp');
const createError = require('http-errors');
require('dotenv').config();

const authRouter = require('./routes/auth');
const projectRouter = require('./routes/project');
const { sequelize } = require('./models');
const passportConfig = require('./passport');

const app = express();
sequelize.sync();
passportConfig(passport);

app.set('port', process.env.PORT || 80);

if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined'));
  app.use(helmet());
  app.use(hpp());
} else {
 app.use(morgan('dev'));
    app.all('/*', function(req, res, next) {
        res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
        res.header('Access-Control-Allow-Methods', 'POST, PUT, GET, DELETE');
        res.header('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type');
        res.header('Access-Control-Allow-Credentials', true);
        next();
    });
}

app.use(express.static(path.join(__dirname, 'build')));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(requestIp.mw());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session({
    resave: false,
    saveUninitialized: false,
    secret: process.env.COOKIE_SECRET,
    cookie: {
        secure: false,
        httpOnly: true
    },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRouter);
app.use('/api/project', projectRouter);
app.get('/',(req, res) => {
    res.sendFile('index.html');
});
app.post('/api/test', (req, res) => {
    res.send(req.clientIp);
});

app.use((err ,req, res, next) => {
    console.log(err);
   if (!err) {
       next(createError(404));
   }
});

app.listen(app.get('port'), () => {
 console.log('Waiting on port ', app.get('port'));
});
