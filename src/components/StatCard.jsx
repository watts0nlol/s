const StatCard = ({ title, value, sub, color, icon, trend }) => {
  return (
    <div
      className="stat-card"
      style={{
        "--stat-color": color,
      }}
    >
      <div className="stat-card-top">
        <p>{title}</p>

        {icon && (
          <span className="stat-card-icon">
            {icon}
          </span>
        )}
      </div>

      <h2>{value}</h2>

      {sub && (
        <span className="stat-card-sub">
          {sub}
        </span>
      )}

      {trend && (
        <span className="stat-card-trend">
          {trend}
        </span>
      )}
    </div>
  );
};

export default StatCard;
