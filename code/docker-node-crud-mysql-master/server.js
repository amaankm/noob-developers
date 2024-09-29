var express = require("express");
var http = require("http");
var mysql = require("mysql");
var app = express();
var bodyParser = require("body-parser");
var dateFormat = require("dateformat");
var fs = require("fs");
var path = require("path");
var winston = require("winston");

// Ensure log directory exists
const logDir = "/var/log/app";
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Configure Winston logger
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logDir, "app.log") }),
  ],
});

// Use logger in case of unhandled errors
logger.exceptions.handle(
  new winston.transports.File({ filename: path.join(logDir, "exceptions.log") })
);

/*
 * Parse all form data
 */
app.use(bodyParser.urlencoded({ extended: true }));

var now = new Date();

/*
 * This is the view engine
 * Template parsing
 * We are using ejs types
 */

app.set("view engine", "ejs");

/*
 * Import all the related JavaScript and Css files to inject in our app.
 */
app.use("/js", express.static(__dirname + "/node_modules/bootstrap/dist/js"));
app.use("/js", express.static(__dirname + "/node_modules/tether/dist/js"));
app.use("/js", express.static(__dirname + "/node_modules/jquery/dist"));
app.use("/css", express.static(__dirname + "/node_modules/bootstrap/dist/css"));
app.use("/css", express.static(__dirname + "/node_modules/font-awesome/css"));
app.use(
  "/fonts",
  express.static(__dirname + "/node_modules/font-awesome/fonts")
);

/*
 * Database connection
 */
const conn = mysql.createConnection({
  host: "mysql-dev",
  user: "root",
  password: "root",
  database: "node_crud",
});

conn.connect(function (err) {
  if (err) {
    // Server will restart until database connection succeds
    console.log("Cannot connect with database");
    // logger.error("Cannot connect with database: " + err.message);
  } else {
    // Docker container will restart if database is not yet ready for connectivity
    // logger.info("Connected to MySQL database.");

    conn.query(
      "CREATE TABLE IF NOT EXISTS events( e_id INT NOT NULL AUTO_INCREMENT, e_name VARCHAR(100) NOT NULL, e_start_date DATE NOT NULL, e_end_date DATE NOT NULL, e_added_date DATE, e_desc TEXT, e_location VARCHAR(200), PRIMARY KEY(e_id))"
    );

    /*
     *** GLOBAL site title and base url
     */
    const siteTitle =
      "Manjil Tamang | Simple node crud app with mysql and docker";

    /*
     * Express router
     * Show list of events
     */
    app.get("/", function (req, res) {
      conn.query(
        "SELECT * FROM events ORDER BY e_start_date DESC",
        function (err, result) {
          if (err) {
            const logEntry = {
              time: new Date().toISOString(),
              status: 500,
              host: req.hostname,
              request: `${req.method} ${req.originalUrl}`,
              message: `Error fetching events: ${err.message}`,
              level: "error",
            };
            logger.error(logEntry);
            res.status(500).send("Error fetching events");
          } else {
            const logEntry = {
              time: new Date().toISOString(),
              status: 200,
              host: req.hostname,
              request: `${req.method} ${req.originalUrl}`,
              message: "Successfully fetched events",
              level: "info",
            };
            logger.info(logEntry);
            res.render("pages/index", {
              siteTitle: siteTitle,
              pageTitle: "Events list",
              items: result,
            });
          }
        }
      );
    });

    /* Show add page */
    app.get("/event/add", function (req, res) {
      const logEntry = {
        time: new Date().toISOString(),
        status: 200,
        host: req.hostname,
        request: `${req.method} ${req.originalUrl}`,
        message: "Add event page rendered",
        level: "info",
      };
      logger.info(logEntry);
      res.render("pages/add-event", {
        siteTitle: siteTitle,
        pageTitle: "Add new event",
        items: "",
      });
    });

    /* Post event to database */
    app.post("/event/add", function (req, res) {
      /*
       ** Get the record
       */
      var query =
        "INSERT INTO events ( e_name, e_start_date, e_end_date,e_added_date, e_desc, e_location) values (";
      query += ' "' + req.body.e_name + '", ';
      query += ' "' + dateFormat(req.body.e_start_date, "yyyy-mm-dd") + '", ';
      query += ' "' + dateFormat(req.body.e_end_date, "yyyy-mm-dd") + '", ';
      query += ' "' + dateFormat(now, "yyyy-mm-dd") + '", ';
      query += ' "' + req.body.e_desc + '", ';
      query += ' "' + req.body.e_location + '"';
      query += " )";
      conn.query(query, function (err, result) {
        if (err) {
          const logEntry = {
            time: new Date().toISOString(),
            status: 500,
            host: req.hostname,
            request: `${req.method} ${req.originalUrl}`,
            message: `Error adding event: ${err.message}`,
            level: "error",
          };
          logger.error(logEntry);
          res.status(500).send("Error adding event");
        } else {
          const logEntry = {
            time: new Date().toISOString(),
            status: 200,
            host: req.hostname,
            request: `${req.method} ${req.originalUrl}`,
            message: `Event added: ${req.body.e_name}`,
            level: "info",
          };
          logger.info(logEntry);
          res.redirect("/");
        }
      });
    });

    /* Event edit page */
    app.get("/event/edit/:id", function (req, res) {
      /* Fetching the event from id */
      conn.query(
        'SELECT * FROM events WHERE e_id = "' + req.params.id + '"',
        function (err, result) {
          if (err) {
            const logEntry = {
              time: new Date().toISOString(),
              status: 500,
              host: req.hostname,
              request: `${req.method} ${req.originalUrl}`,
              message: `Error fetching event for editing (ID: ${eventId}): ${err.message}`,
              level: "error",
            };
            logger.error(logEntry);

            res.status(500).send("Error fetching event for editing");
          } else if (result.length > 0) {
            // format date
            result[0].e_start_date = dateFormat(
              result[0].e_start_date,
              "yyyy-mm-dd"
            );
            result[0].e_end_date = dateFormat(
              result[0].e_end_date,
              "yyyy-mm-dd"
            );

            const logEntry = {
              time: new Date().toISOString(),
              status: 200,
              host: req.hostname,
              request: `${req.method} ${req.originalUrl}`,
              message: `Fetched event for editing (ID: ${eventId}, Name: ${result[0].e_name})`,
              level: "info",
            };
            logger.info(logEntry);

            res.render("pages/edit-event", {
              siteTitle: siteTitle,
              pageTitle: "Edit event: " + result[0].e_name,
              item: result[0],
            });
          } else {
            const logEntry = {
              time: new Date().toISOString(),
              status: 404,
              host: req.hostname,
              request: `${req.method} ${req.originalUrl}`,
              message: `Event not found for editing (ID: ${eventId})`,
              level: "warn",
            };
            logger.warn(logEntry);

            res.status(404).send("Event not found");
          }
        }
      );
    });

    // Edit event
    app.post("/event/edit", function (req, res) {
      /*
       ** Get the record
       */
      var query = "UPDATE events SET";
      query += ' e_name = "' + req.body.e_name + '", ';
      query +=
        ' e_start_date = "' +
        dateFormat(req.body.e_start_date, "yyyy-mm-dd") +
        '", ';
      query +=
        ' e_end_date = "' +
        dateFormat(req.body.e_end_date, "yyyy-mm-dd") +
        '", ';
      query += ' e_desc = "' + req.body.e_desc + '", ';
      query += ' e_location = "' + req.body.e_location + '"';
      query += " WHERE e_id = " + req.body.e_id;

      conn.query(query, function (err, result) {
        if (err) {
          const logEntry = {
            time: new Date().toISOString(),
            status: 500,
            host: req.hostname,
            request: `${req.method} ${req.originalUrl}`,
            message: `Error editing event: ${err.message}`,
            level: "error",
          };
          logger.error(logEntry);
          res.status(500).send("Error editing event");
        } else {
          const logEntry = {
            time: new Date().toISOString(),
            status: 200,
            host: req.hostname,
            request: `${req.method} ${req.originalUrl}`,
            message: `Event updated: ${req.body.e_name}`,
            level: "info",
          };
          logger.info(logEntry);
          res.redirect("/");
        }
      });
    });

    /* Event edit page */
    app.get("/event/delete/:id", function (req, res) {
      /* Fetching the event from id */
      conn.query(
        'DELETE FROM events WHERE e_id = "' + req.params.id + '"',
        function (err, result) {
          if (err) {
            const logEntry = {
              time: new Date().toISOString(),
              status: 500,
              host: req.hostname,
              request: `${req.method} ${req.originalUrl}`,
              message: `Error deleting event: ${err.message}`,
              level: "error",
            };
            logger.error(logEntry);
            res.status(500).send("Error deleting event");
          } else {
            const logEntry = {
              time: new Date().toISOString(),
              status: 200,
              host: req.hostname,
              request: `${req.method} ${req.originalUrl}`,
              message: `Event deleted: ${req.params.id}`,
              level: "info",
            };
            logger.info(logEntry);
            res.redirect("/");
          }
        }
      );
    });

    /*
     * Creating a server
     */

    app.listen(3000, function () {
      // logger.info("Server started on port 3000 | 8080 if running on Docker.");
      console.log("Server started on port 3000 | 8080 if running on docker...");
    });
  }
});
