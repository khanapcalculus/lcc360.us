import React from 'react';
import './Logo.css';

const Logo = () => {
  return (
    <div className="logo-container">
      <img 
        src="/logo.png" 
        alt="Company Logo" 
        className="logo-image"
        onError={(e) => {
          // Fallback if logo.png is not found
          e.target.style.display = 'none';
          e.target.nextSibling.style.display = 'block';
        }}
      />
      <div className="logo-fallback" style={{ display: 'none' }}>
        Your Logo
      </div>
    </div>
  );
};

export default Logo; 