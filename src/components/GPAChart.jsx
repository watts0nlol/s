const GPAChart = ({ gpa }) => {
  return (
    <div style={{ textAlign: "center" }}>
      <h2 style={{ fontSize: "40px", color: "#1890ff" }}>{gpa}</h2>
      <p style={{ color: "#777" }}>Cumulative GPA / 4.0</p>
    </div>
  );
};

export default GPAChart;
