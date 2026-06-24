const RiskCard = ({ risk, message }) => {
  const styles = {
    LOW: { color: "#2e7d32", bg: "#e8f5e9", border: "#43a047" },
    MEDIUM: { color: "#f57c00", bg: "#fff3e0", border: "#fb8c00" },
    HIGH: { color: "#c62828", bg: "#fdecea", border: "#e53935" },
  };

  const current = styles[risk] || styles.LOW;

  return (
    <div
      style={{
        border: `2px solid ${current.border}`,
        background: current.bg,
        borderRadius: "14px",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
      }}
    >
      <h3 style={{ color: current.color, marginBottom: "8px" }}>
        {risk} RISK
      </h3>

      <p style={{ color: "#555", fontSize: "14px" }}>
        {message}
      </p>
    </div>
  );
};

export default RiskCard;
