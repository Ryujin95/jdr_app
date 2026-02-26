import { useState } from "react";

function StarsEditor({ value = 0, onChange, disabled = false }) {
  const [hoverValue, setHoverValue] = useState(null);

  const safeValue = Math.max(0, Math.min(5, Number(value) || 0));
  const displayValue = hoverValue !== null ? hoverValue : safeValue;

  return (
    <div
      className="relationship-stars editor compact"
      onMouseLeave={() => setHoverValue(null)}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className={`star ${i <= displayValue ? "full" : "empty"}`}
          onMouseEnter={() => !disabled && setHoverValue(i)}
          onClick={() => !disabled && onChange?.(i)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (!disabled && (e.key === "Enter" || e.key === " ")) {
              e.preventDefault();
              onChange?.(i);
            }
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

export default StarsEditor;