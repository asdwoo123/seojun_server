import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';

const adapter = new JSONFileSync('db.json')
const db = new LowSync(adapter, {
    stations: [],
    users: [],
    logs: []
});

db.read();

export { db };
