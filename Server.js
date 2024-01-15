const fs = require('fs');
const path = require('path');
const express = require('express');
const config = require('./config');
const slugify = require('slugify');
const errorHandler = require('./middleware/errorHandler');

class Server {
  constructor() {
    this.app = express();
    this.middleware();
    this.loadRoutes();
    this.startServer();
    this.handleErrors();
  }

  middleware() {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(errorHandler);
    this.app.use((req, res, next) => {
      req.config = config;
      next();
    });
  }

  loadRoutes() {
    // Route to get config data
    this.app.get('/config-data', (req, res) => {
      res.json(req.config.motivationConfig);
    });

    // Serve static assets
    this.app.use(express.static(path.resolve(__dirname, './public')));

    // Using basic html, js, and css files for now, just load routes automatically from the public folder
    fs.readdirSync(path.resolve(__dirname, './public')).forEach((file) => {
      if (file.endsWith('.html')) {
        const filePath = path.resolve(__dirname, `./public/${file}`);
        console.log(`Loading route from: ${filePath}`);
        let routeName = file.split('.')[0]; // Use the file name as the route name
        routeName = slugify(routeName, { lower: true }); // Make url friendly

        // Create a route for the file name without the .html extension
        this.app.get('/' + routeName, (req, res) => {
          res.sendFile(filePath);
        });

        // Create a route for the file name with the .html extension
        this.app.get('/' + routeName + '.html', (req, res) => {
          res.sendFile(filePath);
        });
      }
    });
  }

  startServer() {
    this.app.listen(config.port, () => {
      console.log('Express app listening on port ' + config.port);
    });
  }

  handleErrors() {
    this.app.use((err, req, res, next) => {
      console.log(err);
      res.status(500).send('Something went wrong');
    });
  }
}

module.exports = Server;