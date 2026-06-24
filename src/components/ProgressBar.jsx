const ProgressBar = ({ value, color = "#4CAF50" }) => {
  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          background: "#eee",
          borderRadius: "12px",
          height: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${value}%`,
            background: color,
            height: "100%",
            borderRadius: "12px",
            transition: "0.4s ease",
          }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        <span style={{ fontSize: "12px", color: "#777" }}>Progress</span>
        <span style={{ fontSize: "12px", fontWeight: "600" }}>{value}%</span>
      </div>
    </div>
  );
};

export default ProgressBar;
