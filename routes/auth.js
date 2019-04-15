const express = require('express');
const passport = require('passport');
const bcrypt = require('bcrypt');
const osLocale = require('os-locale');
const { User } = require('../models');
const nodemailer = require('nodemailer');
const smtpPool = require('nodemailer-smtp-pool');
const schedule = require('node-schedule');


const config = {
    mailer: {
        service: 'Naver',
        host: 'smtp.naver.com',
        port: '465',
        user: 'boongp',
        password: 'gogo2019**',
    },
};

const router = express.Router();

router.post('/verifyUser', async (req, res) => {
   const { username, email } = req.body;
   const user = await User.findOne({
       where: {
           username,
           email
       }
   });
   if (user) {

   } else {
       res.json({ success: false });
   }
});

router.post('/findUsername', async (req, res) => {
    const { email }  = req.body;
    const user = await User.findOne({
        where: { email }
    });
    if (user) {
        const from = 'boongp@naver.com';
        const to = email;
        const subject = 'SEOJUN ENG 입니다. 귀하의 아이디를 알려드리겠습니다.';
        const html = `<p>귀하의 아이디는 ${user.username} 입니다. 감사합니다.</p>`;
        const mailOptions = {
            from,
            to,
            subject,
            html
        };
        const transporter = nodemailer.createTransport(smtpPool({
            service: config.mailer.service,
            host: config.mailer.host,
            port: config.mailer.port,
            auth: {
                user: config.mailer.user,
                pass: config.mailer.password,
            },
            tls: {
                rejectUnauthorize: false,
            },
            maxConnections: 5,
            maxMessages: 10,
        }));
        transporter.sendMail(mailOptions, (err, ress) => {
            if (err) {
                console.log('failed... => ', err);
                res.json({ success: false });
            } else {
                console.log('succeed... => ', ress);
                res.json({ success: true });
            }
            transporter.close();
        });
    } else {
        res.json({ success: false });
    }
});

router.get('/isLoggedIn', (req, res) => {
   if (req.isAuthenticated()) {
       res.json({ success: true });
   } else {
       res.json({ success: false });
}
});

router.post('/join', async (req, res, next) => {
   const { username, email, password } = req.body;
   try {
       const exUser = await User.findOne({ where: { username } });
       if (exUser) {
           res.json({ success: false, message: 'It already exists.' });
       } else {
           const hash = await bcrypt.hash(password, 12);
           const locale = await osLocale();
           const ip = req.clientIp;
           await User.create({
               email,
               username,
               password: hash,
               ip,
               locale
           });
           res.json({ success: true });
       }
   } catch (e) {
       res.json({ success: false, message: 'Server-side error prevents Sign Up.' });
   }
});

router.post('/login', (req, res, next) => {
    passport.authenticate('local', (authError, user, info) => {
       if (authError) {
           return res.json({success: false, message: 'Name or password do not match.'});
       }
       if (!user) {
           return res.json({success: false, message: 'Name or password do not match.'});
       }
       return req.login(user, (loginError) => {
           if (loginError) {
               return res.json({success: false, message: 'Name or password do not match.'});
           }
           if (req.body.remember) {
               req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
           } else {
               req.session.cookie.expires = false;
           }
           return res.json({success: true});
       });
    })(req, res, next);
});

router.get('/logout', (req, res) => {
   req.logout();
   req.session.destroy();
    return res.json({success: true});
});


module.exports = router;
