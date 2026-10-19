export default function NotFound() {
  return (
    <html>
      <body
        style={{
          margin: 0,
          background: "#0f0f1a",
          color: "#fff",
          fontFamily: "'Inter', sans-serif",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <h1 style={{ fontSize: "5rem", margin: 0, color: "#6366f1" }}>404</h1>
        <p style={{ fontSize: "1.25rem", opacity: 0.7 }}>Page not found</p>
        <a
          href="/"
          style={{
            marginTop: "1rem",
            padding: "0.75rem 2rem",
            background: "#6366f1",
            color: "#fff",
            borderRadius: "0.5rem",
            textDecoration: "none",
            fontWeight: 600,
          }}
        >
          Go Home
        </a>
      </body>
    </html>
  );
}
