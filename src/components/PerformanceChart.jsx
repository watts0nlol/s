import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const PerformanceChart = ({ data }) => {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Line
            type="monotone"
            dataKey="grade"
            stroke="#4CAF50"
            strokeWidth={3}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default PerformanceChart;
