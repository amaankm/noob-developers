const express = require("express");
const bodyParser = require("body-parser");
const basicAuth = require("basic-auth");
const cors = require("cors");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");

const influxdbUrl = "http://localhost:8086"; // Change to your InfluxDB URL
const token =
  "O_JA7sh47iRzaG3SVNR32VOJcJC1z0bc9PA_AvlCG2iLn9iGs-dEx5DZbXN7P6LYQkJmHEjm-lP5Kk072angaw==";
const org = "org"; // Change to your InfluxDB organization
const bucket = "logs"; // Change to your InfluxDB bucket

const influxDBClient = new InfluxDB({ url: influxdbUrl, token: token });
const writeApi = influxDBClient.getWriteApi(org, bucket);
const queryApi = influxDBClient.getQueryApi(org);

const app = express();

app.use(bodyParser.json());

app.use(cors());

const auth = (req, res, next) => {
  console.log(req);
  const user = basicAuth(req);
  if (user && user.name === "fluentbit" && user.pass === "password") {
    return next();
  } else {
    res.status(401).send("Authentication required.");
  }
};

app.get("/logs", async (req, res) => {
  const query = `from(bucket: "${bucket}")
      |> range(start: -1h) // You can adjust the time range
      |> filter(fn: (r) => r._measurement == "log_data")
      |> sort(columns: ["_time"], desc: true)`; // Sorting logs by time

  try {
    const logs = [];
    const fluxObserver = {
      next(row, tableMeta) {
        const log = tableMeta.toObject(row);
        console.log(log);
        logs.push({
          time: log._time,
          status: log.status,
          host: log.host,
          request: log.request,
          message: log._value,
          level: log.level, // Adjust based on how "level" is stored
        });
      },
      error(error) {
        console.error(error);
        res.status(500).json({ error: "Error fetching logs from InfluxDB" });
      },
      complete() {
        res.json(logs); // Send logs to the frontend
      },
    };

    queryApi.queryRows(query, fluxObserver);
  } catch (error) {
    console.error("Error querying InfluxDB:", error);
    res.status(500).send("Error fetching logs");
  }
});

app.post("/logs", async (req, res) => {
  const logs = req.body;

  try {
    logs.forEach((log_string) => {
      //   const log = JSON.parse(log_string.log).log;
      //   if (!log[0].match(/^[0-9]$/)) {
      //     return;
      //   }
      //   //   console.log(log);
      //   const arr = log.split(" ");

      //   const timestamp = arr[0] + " " + arr[1];
      //   const level = arr[2];
      //   const source = arr[3].slice(1, -1);
      //   const message = arr.slice(4).join(" ").slice(0);

      //   //   console.log({
      //   //     timestamp, // e.g., '2024-09-28 22:27:45'
      //   //     level, // e.g., 'WARNING'
      //   //     source, // e.g., 'django.server'
      //   //     message, // e.g., 'Server started handling POST request to /api/v1/notifications'
      //   //   });

      //   const point = new Point("log_data")
      //     .tag("level", level)
      //     .tag("source", source)
      //     .timestamp(new Date(timestamp));
      const log = JSON.parse(log_string.log);
      if (!log.status) return;
      console.log(log);
      const point = new Point("log_data") // Change 'log_data' to your measurement name
        .tag("level", log.level)
        .timestamp(new Date(log.timestamp))
        .tag("status", log.status)
        .tag("host", log.host)
        .tag("request", log.request)
        .stringField("message", log.message);
      writeApi.writePoint(point);
    });

    await writeApi.flush(); // Flush the write buffer
    // res.status(200).send("Logs processed and sent to InfluxDB");
  } catch (error) {
    console.error("Error writing to InfluxDB:", error);
    // res.status(500).send("Error processing logs");
  }
});

app.listen(8000, () => {
  console.log("Backend service running on port 8000");
});
