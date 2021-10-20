const jsonServer = require('json-server');
const cors = require('cors');
const path = require('path');

const databasePath = 'data/db.json';
// const databasePath = 'data/db_full.json'; // for bigger dataset (16Mb instead of 4.4Mb)
const distPath = 'dist/population';

const server = jsonServer.create();
const router = jsonServer.router(databasePath);
const middlewares = jsonServer.defaults({
  static: path.join(__dirname, distPath)
});
const port = process.env.PORT || 3000;

server.use(cors());

server.use(middlewares);
server.use(router);
server.use((req, res, next) => {
  res.header("Cache-Control", "public, max-age=86400000");
  next();
});
server.get('/', (req, res) => {
  res.sendFile(path.join(`${__dirname}/${distPath}/index.html`));
});
server.listen(port, () => {
  console.log(`JSON Server is running on http://localhost:${port}`);
});
