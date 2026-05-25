import React from 'react';

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <div className={`stat-card stat-card--${color}`}>
    <div className="stat-card__icon">{icon}</div>
    <div className="stat-card__content">
      <h3 className="stat-card__value">{value}</h3>
      <p className="stat-card__title">{title}</p>
      {subtitle && <p className="stat-card__subtitle">{subtitle}</p>}
    </div>
  </div>
);

export default StatCard;
