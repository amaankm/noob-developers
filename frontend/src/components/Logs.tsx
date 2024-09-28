import { useEffect, useState } from "react";

interface LogEntry {
  time: string;
  status: number;
  host: string;
  request: string;
  message: string;
}

const Logs = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);

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
      <div className="mb-4 text-gray-400">{logs.length} total logs found.</div>

      <table className="min-w-full table-auto text-sm">
        <thead className="text-left text-gray-400">
          <tr>
            <th className="px-4 py-2">Time</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Host</th>
            <th className="px-4 py-2">Request</th>
            <th className="px-4 py-2">Message</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr key={index} className="border-b border-gray-700">
              <td className="px-4 py-2 text-gray-300">
                {new Date(log.time).toLocaleString()}
              </td>
              <td
                className={`px-4 py-2 ${
                  log.status === 200 ? "text-green-500" : "text-red-500"
                }`}
              >
                {log.status}
              </td>
              <td className="px-4 py-2 text-gray-300">{log.host}</td>
              <td className="px-4 py-2 text-gray-300">
                <a href={log.request} className="text-blue-400 underline">
                  {log.request}
                </a>
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
