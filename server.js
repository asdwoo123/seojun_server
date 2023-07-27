import Koa from 'koa';
import Debug from 'debug';
import http from 'http';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import querystring from 'querystring';
import url from 'url';
import crypto from 'crypto';

import ClientManager from './lib/ClientManager.js';
import { db } from './db.js';

const debug = Debug('localtunnel:server');

const STATUS_OK = 200;
const STATUS_NOT_FOUND = 404;

const { stations, users, logs } = db.data;

function createHashedPassword(password) {
    const salt = crypto.randomBytes(32).toString('hex');
    const hashedPassword = crypto.pbkdf2Sync(password, salt, 1, 32, 'sha512').toString('hex');
    return { salt, hashedPassword };
};

function verifyPassword(password, salt, hashedPassword) {
    const hashedPassword2 = crypto.pbkdf2Sync(password, salt, 1, 32, 'sha512').toString('hex');
    return hashedPassword === hashedPassword2;
}

export default function(opt) {
    opt = opt || {};

    const manager = new ClientManager(opt);

    const schema = opt.secure ? 'https' : 'http';

    const app = new Koa();
    const router = new Router();

    app.use(bodyParser());

    router.get('/check', (ctx) => {
        ctx.body = 'ok';
    });

    router.get('/userAuthority/:headOffice/:username', (ctx) => {
        const { headOffice, username } = ctx.params;
        
        const findUser = users.find((u) => u.headOffice === headOffice && u.username === username);
        if (findUser) {
            ctx.status = 200;
            ctx.body = {
                authority: findUser.authority
            };
        } else {
            ctx.status = 404;
        }
        return;
    });

    router.get('/logs', (ctx) => {
        const { page, uuid, start_period, end_period } = ctx.query;

        const pageCount = 30;

        const result = logs.filter((log) => {
            return log.id === uuid && (start_period !== 'null' && end_period !== 'null') ? (new Date(start_period) <= new Date(log.time) && new Date(log.time) <= new Date(end_period)) : true;
        }).map((log) => {
            return {
                time: log.time,
                message: log.message
            }
        });

        ctx.status = 200;
        ctx.body = {
            count: result.length,
            data: result.slice(page, (page + 1) * pageCount)
        }
        return;
    });

    router.put('/users', (ctx) => {
        const { changeUsers } = ctx.request.body;

        console.log(changeUsers);

        changeUsers.forEach((changeUser) => {
            const findUser = users.find((user) => user.username === changeUser.username);
            if (!findUser) return;
            findUser.authority = changeUser.authority;
        });

        db.write();
        ctx.status = 200;
        return;
    })

    router.put('/user', (ctx) => {
        const { headOffice, username, authority } = ctx.request.body;

        const findUserIndex = users.findIndex((u) => u.headOffice === headOffice &&
        u.username === username);
        if (findUserIndex === -1 || ![0, 1].some((a) => a == authority)) {
            ctx.status = 404;
            return;
        }

        users[findUserIndex] = {
            ...users[findUserIndex],
            authority: parseInt(authority)
        }

        db.write();
        ctx.status = 200;
        return;
    });

    router.get('/user/:headOffice', (ctx) => {
        const { headOffice } = ctx.params;
        console.log(headOffice);
        const findUsers = (headOffice === 'all') ? users.filter((user) => user['authority'] !== 3) : users.filter((user) => {
            return user['headOffice'] === headOffice && user['authority'] !== 3;
        });
        
        ctx.body = {
            users: findUsers
        }
        return;
    });    

    router.post('/signIn', (ctx) => {
        const { headOffice, username, password } = ctx.request.body;
        console.log(headOffice, username, password);
        const findUser = users.find((user) => {
            return user['headOffice'] === headOffice && user['username'] === username;
        });

        if (findUser && verifyPassword(password, findUser.salt, findUser.hashedPassword)) {
            ctx.status = 200;
            ctx.body = {
                user: {
                    username: findUser.username,
                    authority: findUser.authority
                }
            }
        } else {
            ctx.status = 404;
        }

        return;
    });

    router.post('/signUp', (ctx) => {
        const { headOffice, username, password } = ctx.request.body;

        if (headOffice && users.findIndex((u) => u.headOffice === headOffice && u.username === username) !== -1) {
            ctx.status = 404;
            return
        }

        const { salt, hashedPassword } = createHashedPassword(password);

        const user = {
            headOffice,
            username,
            salt,
            hashedPassword,
            authority: 0
        };

        users.push(user);
        db.write();

        ctx.status = 200;
        ctx.body = {
            user
        }
        
        return;
    });

    router.get('/findStations/:headOffice', (ctx, next) => {
        const { headOffice } = ctx.params;
        const findStations = (headOffice === 'all') ? stations : stations.filter((station) => {
            return station['headOffice'] === headOffice;
        });
        
        ctx.body = {
            stations: findStations
        }
        return;
    });

    router.get('/api/status', async (ctx, next) => {
        const stats = manager.stats;
        ctx.body = {
            tunnels: stats.tunnels,
            mem: process.memoryUsage(),
        };
    });

    router.get('/api/tunnels/:id/status', async (ctx, next) => {
        const clientId = ctx.params.id;
        const client = manager.getClient(clientId);
        if (!client) {
            ctx.throw(404);
            return;
        }

        const stats = client.stats();
        ctx.body = {
            connected_sockets: stats.connectedSockets,
        };
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    const companyNames = ['SEOJUNENG', 'MANN', 'ITW', 'NVH'];

    // anything after the / path is a request for a specific client name
    // This is a backwards compat feature
    app.use(async (ctx, next) => {
        const parts = ctx.request.path.split('/');

        const reqId = parts[1];

        const pathInfo = reqId.split('.');

        if (pathInfo.length !== 5) return;

        const [headOffice, branchOffice, projectName, stationName, uuid] = pathInfo;

        if (!companyNames.some((n) => headOffice === n)) return;

        const stationIndex = stations.findIndex((s) => s.uuid === uuid);

        const station = {
            headOffice,
            branchOffice,
            projectName,
            stationName,
            uuid
        };

        if (stationIndex === -1) {
            stations.push(station);
            db.write();
        } else {
            if (JSON.stringify(stations[stationIndex]) !== JSON.stringify(station)) {
                stations[stationIndex] = station;
                db.write();
            }
        }      

        debug('making new client with id %s', uuid);
        const info = await manager.newClient(uuid);

        const url = schema + '://' + ctx.request.host + '/' + info.id;
        
        info.url = url;
        ctx.body = info;
        
        return;
    });

    const server = http.createServer();

    const appCallback = app.callback();
    server.on('request', (req, res) => {
        const hostname = req.headers.host;
        
        if (!hostname) {
            res.statusCode = 400;
            res.end('Host header is required');
            return;
        }

        const parsedUrl = url.parse(req.url);
        const query = querystring.parse(parsedUrl.query);

        const clientId = query['id']; 

        if (!clientId) {
            appCallback(req, res);
            return;
        }
        
        const client = manager.getClient(clientId);

        if (!client) {
            res.statusCode = 404;
            res.end('404');
            return
        } else {
            client.handleRequest(req, res);
        }        
    });

    server.on('upgrade', (req, socket, head) => {
        const hostname = req.headers.host;
        const parsedUrl = url.parse(req.url);
        const query = querystring.parse(parsedUrl.query);

        if (!hostname) {
            socket.destroy();
            return;
        }

        const clientId = query['id'];
        
        if (!clientId) {
            socket.destroy();
            return;
        }

        const client = manager.getClient(clientId);

        if (!client) {
            socket.destroy();
            return;
        }

        client.handleUpgrade(req, socket);
    });

    return server;
};
