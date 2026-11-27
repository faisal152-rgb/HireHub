import React from "react";

export function TableSkeletonRows({ rows = 5, cols = 5, hasAvatar = true }) {
  return Array.from({ length: rows }).map((_, rowIdx) => (
    <tr key={`sk-row-${rowIdx}`} aria-hidden="true">
      {Array.from({ length: cols }).map((__, colIdx) => {
        if (colIdx === 0 && hasAvatar) {
          return (
            <td key={`sk-col-${colIdx}`}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="comp-skeleton comp-skeleton-circle" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="comp-skeleton comp-skeleton-line" style={{ width: "70%", minWidth: 90 }} />
                  <div className="comp-skeleton comp-skeleton-line" style={{ width: "45%", minWidth: 60, height: 10 }} />
                </div>
              </div>
            </td>
          );
        }

        if (colIdx === cols - 1) {
          return (
            <td key={`sk-col-${colIdx}`} style={{ textAlign: "right" }}>
              <div className="comp-skeleton comp-skeleton-pill" style={{ marginLeft: "auto", width: 68, height: 30 }} />
            </td>
          );
        }

        if (colIdx === cols - 2) {
          return (
            <td key={`sk-col-${colIdx}`}>
              <div className="comp-skeleton comp-skeleton-pill" />
            </td>
          );
        }

        return (
          <td key={`sk-col-${colIdx}`}>
            <div
              className="comp-skeleton comp-skeleton-line"
              style={{ width: colIdx % 2 === 0 ? "75%" : "60%", minWidth: 70 }}
            />
          </td>
        );
      })}
    </tr>
  ));
}

export function ListSkeletonCards({ count = 4 }) {
  return (
    <div className="comp-skeleton-list" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: count }).map((_, idx) => (
        <div className="comp-skeleton-list-item" key={`sk-list-${idx}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
            <div className="comp-skeleton comp-skeleton-circle" />
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8, minWidth: 0 }}>
              <div className="comp-skeleton comp-skeleton-line" style={{ width: "55%", height: 14 }} />
              <div className="comp-skeleton comp-skeleton-line" style={{ width: "80%", height: 11 }} />
            </div>
          </div>
          <div className="comp-skeleton comp-skeleton-pill" style={{ width: 76, height: 28, flexShrink: 0 }} />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="comp-page-container" aria-busy="true" aria-label="Loading dashboard">
      <div className="comp-page-header">
        <div className="comp-page-title-group" style={{ width: "100%", maxWidth: 420 }}>
          <div className="comp-skeleton" style={{ width: "65%", height: 28, marginBottom: 10 }} />
          <div className="comp-skeleton" style={{ width: "90%", height: 14 }} />
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <div className="comp-skeleton" style={{ width: 140, height: 42, borderRadius: 10 }} />
          <div className="comp-skeleton" style={{ width: 140, height: 42, borderRadius: 10 }} />
        </div>
      </div>

      <div className="comp-stats-grid" style={{ marginBottom: 24 }}>
        {Array.from({ length: 4 }).map((_, idx) => (
          <div className="comp-stat-card" key={`sk-stat-${idx}`}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div className="comp-skeleton" style={{ width: 100, height: 14 }} />
              <div className="comp-skeleton" style={{ width: 38, height: 38, borderRadius: 10 }} />
            </div>
            <div className="comp-skeleton" style={{ width: 64, height: 30, marginBottom: 8 }} />
            <div className="comp-skeleton" style={{ width: 130, height: 12 }} />
          </div>
        ))}
      </div>

      <div className="comp-mid-grid">
        <div className="comp-card" style={{ padding: 24 }}>
          <div className="comp-skeleton" style={{ width: 180, height: 20, marginBottom: 20 }} />
          <div className="comp-skeleton" style={{ width: "100%", height: 220, borderRadius: 12 }} />
        </div>
        <div className="comp-card" style={{ padding: 24 }}>
          <div className="comp-skeleton" style={{ width: 160, height: 20, marginBottom: 20 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="comp-skeleton comp-skeleton-circle" />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="comp-skeleton comp-skeleton-line" style={{ width: "70%" }} />
                  <div className="comp-skeleton comp-skeleton-line" style={{ width: "45%", height: 10 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
