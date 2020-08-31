var jsonServer = require("json-server");
var server = jsonServer.create();
var router = jsonServer.router("./db.json");
var middlewares = jsonServer.defaults();
var port = process.env.PORT || 5000;

server.use(middlewares);
server.use(router);
server.listen(port, () => {
    console.log("JSON Server is running on http://localhost:" + port);
});
