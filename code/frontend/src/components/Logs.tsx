import { useEffect, useState } from "react";

interface LogEntry {
  level: string;
  time: string;
  status: number;
  host: string;
  request: string;
  message: string;
}

const Logs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const [level, setLevel] = useState<string>("all");

  // Fetch logs from the backend
  useEffect(() => {
    fetch("http://localhost:8000/logs") // Ensure this is your API endpoint
      .then((res) => res.json())
      .then((data) => {
        console.log(data);
        setLogs(data);
      })
      .catch((err) => console.error("Error fetching logs:", err));
  }, []);

  return (
    <div className="bg-black text-white p-4">
      <div className="w-full flex justify-between">
        <div className="mb-4 text-gray-400">
          {logs.length} total logs found.
        </div>
        <div className="flex gap-4 px-4">
          <select
            onChange={(e) => setLevel(e.target.value)}
            className="bg-black"
          >
            <option>all</option>
            <option>info</option>
            <option>warn</option>
            <option>error</option>
          </select>
        </div>
      </div>

      <table className="min-w-full table-auto text-sm rounded-md border border-gray-700 divide-y">
        <thead className="text-left text-gray-400">
          <tr>
            <th className="px-4 py-2">Level</th>
            <th className="px-4 py-2">Time</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Host</th>
            <th className="px-4 py-2">Request</th>
            <th className="px-4 py-2">Message</th>
          </tr>
        </thead>
        <tbody>
          {logs
            .sort((a, b) => (a.time > b.time ? -1 : 1))
            .filter((a) => (level == "all" ? true : a.level == level))
            .map((log, index) => (
              <tr key={index} className="border-b border-gray-700">
                <td className="px-4 py-2 text-gray-300">{log.level}</td>
                <td className="px-4 py-2 text-gray-300">
                  {new Date(log.time).toLocaleString()}
                </td>
                <td
                  className={`px-4 py-2 ${
                    log.status == 200 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {log.status}
                </td>
                <td className="px-4 py-2 text-gray-300">{log.host}</td>
                <td className="px-4 py-2 text-gray-300">
                  <span className="text-blue-400 underline">{log.request}</span>
                </td>
                <td className="px-4 py-2 text-gray-300">{log.message}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default Logs;
