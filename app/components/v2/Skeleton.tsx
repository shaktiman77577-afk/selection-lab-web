// Page load hote waqt khaali screen ki jagah halke chamakte dabbe
export function GridSkeleton({ n = 8 }: { n?: number }) {
  return (
    <div className="v2-grid" aria-hidden="true">
      {Array.from({ length: n }).map((_, k) => (
        <div key={k} className="v2-card">
          <div className="v2-skel" style={{ aspectRatio: "16 / 9", borderRadius: 0 }} />
          <div className="v2-body">
            <div className="v2-skel" style={{ height: 14, width: "92%" }} />
            <div className="v2-skel" style={{ height: 14, width: "60%" }} />
            <div className="v2-skel" style={{ height: 18, width: 70, marginTop: 10 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function HeadSkeleton() {
  return (
    <div aria-hidden="true" style={{ padding: "26px 0 20px" }}>
      <div className="v2-skel" style={{ height: 30, width: 200 }} />
      <div className="v2-skel" style={{ height: 14, width: "55%", marginTop: 12 }} />
      <div className="v2-skel" style={{ height: 46, width: "100%", marginTop: 22, borderRadius: 12 }} />
    </div>
  );
}
