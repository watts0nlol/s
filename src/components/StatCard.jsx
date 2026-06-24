const StatCard = ({ title, value, sub, color, icon }) => {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "14px",
        padding: "16px",
        boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        borderTop: `4px solid ${color}`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        minWidth: "140px",
        transition: "0.2s ease",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0px)")}
    >
      {/* Top Row (Title + Icon) */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <p
          style={{
            fontSize: "12px",
            color: "#888",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            margin: 0,
          }}
        >
          {title}
        </p>

        {icon && (
          <span style={{ fontSize: "18px" }}>
            {icon}
          </span>
        )}
      </div>

      {/* Main Value */}
      <h2
        style={{
          fontSize: "28px",
          margin: "8px 0",
          color: color,
          fontWeight: "700",
        }}
      >
        {value}
      </h2>

      {/* Sub text */}
      {sub && (
        <span
          style={{
            fontSize: "12px",
            color: "#666",
          }}
        >
          {sub}
        </span>
      )}
    </div>
  );
};

export default StatCard;
