const express = require("express");
const bodyParser = require("body-parser");
const basicAuth = require("basic-auth");
const cors = require("cors");
const { InfluxDB, Point } = require("@influxdata/influxdb-client");

const influxdbUrl = "http://localhost:8086"; // Change to your InfluxDB URL
const token =
  "yznmHAWIDcj7o73rBTZJmNSd6e3h9bIhS-lP5GLdyUNXSW8sLbWn8zAZEzLs3CCH8S17eHmqPObPHOKofvD8AA=="; // Change to your InfluxDB token
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
          status: log._value,
          host: log.host,
          request: log.request,
          message: log.message,
          level: log._field, // Adjust based on how "level" is stored
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
      const log = JSON.parse(log_string.log);
      console.log(log);
      const point = new Point("log_data") // Change 'log_data' to your measurement name
        .tag("level", log.level)
        .timestamp(new Date(log.timestamp))
        .intField("status", log.status)
        .tag("host", log.host)
        .stringField("request", log.request)
        .stringField("message", log.message);
      writeApi.writePoint(point);
    });

    await writeApi.flush(); // Flush the write buffer
    res.status(200).send("Logs processed and sent to InfluxDB");
  } catch (error) {
    console.error("Error writing to InfluxDB:", error);
    res.status(500).send("Error processing logs");
  }
  // Process and store logs in time series database here
});

app.listen(8000, () => {
  console.log("Backend service running on port 8000");
});
