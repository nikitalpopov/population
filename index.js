const jsonServer = require('json-server');
const cors = require('cors');
const path = require('path');

const server = jsonServer.create();
const router = jsonServer.router('data/db.json');
const middlewares = jsonServer.defaults({
  static: path.join(__dirname, 'dist/population')
});
const port = process.env.PORT || 3000;

server.use(cors());

server.use(middlewares);
server.use(router);
server.listen(port, () => {
  console.log(`JSON Server is running on http://localhost:${port}`);
});
