import React from "react";

export function ResetSettings() {
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm font-medium">RESET HighResify</p>
      <button
        className="btn btn-primary"
        onClick={async () => {
          localStorage.clear();
          alert("HighResify has been reset. Please restart the app.");
        }}
      >
        RESET HighResify
      </button>
    </div>
  );
}
