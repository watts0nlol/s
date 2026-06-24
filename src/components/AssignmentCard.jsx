const AssignmentCard = ({ assignment }) => {
  const colors = {
    CRITICAL: "#e53935",
    HIGH: "#fb8c00",
    MEDIUM: "#1976d2",
  };

  const color = colors[assignment.priority] || "#999";

  return (
    <div
      style={{
        border: `2px solid ${color}`,
        borderRadius: "14px",
        padding: "14px",
        marginBottom: "10px",
        background: "#fff",
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h4>{assignment.title}</h4>
        <span style={{ color, fontWeight: "600" }}>
          {assignment.priority}
        </span>
      </div>

      <p style={{ fontSize: "13px", color: "#666" }}>
        {assignment.course}
      </p>

      <ProgressBar value={assignment.progress} color={color} />
    </div>
  );
};

export default AssignmentCard;
