import "@picocss/pico/css/pico.min.css";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function FirstPage() {
  const [idea, setIdea] = useState<string>("");
  const [isLaunching, setIsLaunching] = useState<boolean>(false);
  const [, setLocation] = useLocation();

  // Clear outputs directory when FirstPage mounts
  useEffect(() => {
    const clearOutputs = async () => {
      try {
        // Get IDE backend URL (port 5002)
        const getIDEBackendUrl = () => {
          const hostname = window.location.hostname;
          const ideBackendPort = 5002;
          if (hostname === "localhost" || hostname === "127.0.0.1") {
            return `http://localhost:${ideBackendPort}`;
          }
          return `http://${hostname}:${ideBackendPort}`;
        };

        const ideBackendUrl = getIDEBackendUrl();
        const response = await fetch(`${ideBackendUrl}/api/files/clear-workspace`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Outputs directory cleared:', data.message);
        } else {
          console.warn('⚠️ Failed to clear outputs directory (non-critical)');
        }
      } catch (error) {
        // Non-critical error - just log it
        console.warn('⚠️ Could not clear outputs directory (non-critical):', error);
      }
    };

    clearOutputs();
  }, []); // Run once when component mounts

  const handleLaunch = () => {
    if (!idea.trim() || isLaunching) return;
    
    console.log("Launch button clicked, navigating to /home");
    setIsLaunching(true);
    
    // Navigate immediately to home page (don't wait for API)
    setLocation("/home");
    
    // Start the API call in the background (fire and forget)
    // Don't await - let it run in the background
    const getBackendUrl = () => {
      const hostname = window.location.hostname;
      const backendPort = 5001;
      if (hostname === "localhost" || hostname === "127.0.0.1") {
        return `http://localhost:${backendPort}`;
      }
      return `http://${hostname}:${backendPort}`;
    };
    
    const backendUrl = getBackendUrl();
    fetch(`${backendUrl}/launch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user_input: idea }),
    })
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log("Launch response:", data);
      })
      .catch((error) => {
        console.error("Error launching (API call failed, but navigation succeeded):", error);
        // Error is logged but navigation already happened
      })
      .finally(() => {
        setIsLaunching(false);
      });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && idea.trim() && !isLaunching) {
      handleLaunch();
    }
  };

    return (
        <>
        <style>{`
            :root {
              --primary-gradient: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%);
              --primary-color: #0ea5e9;
              --primary-hover: #0284c7;
              --background-light: #ffffff;
              --surface-color: #f8fafc;
              --border-color: rgba(148, 163, 184, 0.2);
              --text-primary: #1e293b;
              --text-muted: #64748b;
              --glow-color: rgba(14, 165, 233, 0.3);
            }
    
             body {
               background: var(--background-light) !important;
               color: var(--text-primary) !important;
               height: 100vh !important;
               position: relative !important;
               overflow: hidden !important;
               margin: 0 !important;
               padding: 0 !important;
               display: block !important;
               min-width: unset !important;
             }
    
             html {
               height: 100% !important;
               overflow: hidden !important;
               margin: 0 !important;
               padding: 0 !important;
             }
    
             #root {
               height: 100vh !important;
               width: 100vw !important;
               overflow: hidden !important;
               display: flex !important;
               flex-direction: column !important;
               max-width: 100% !important;
               margin: 0 !important;
               padding: 0 !important;
             }
    
            /* Subtle Background Pattern */
            body::before {
              content: '';
              position: fixed;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: 
                radial-gradient(circle at 20% 30%, rgba(14, 165, 233, 0.05) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(6, 182, 212, 0.05) 0%, transparent 50%);
              z-index: -1;
              animation: pulse 8s ease-in-out infinite;
            }
    
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.8; }
            }
    
            /* Header Styles */
            header {
              text-align: center !important;
              padding: 1.5rem 1rem 0.75rem !important;
              position: relative !important;
              flex-shrink: 0 !important;
              margin-bottom: 0 !important;
              z-index: 1 !important;
            }
    
            .logo-badge {
              display: inline-flex !important;
              align-items: center !important;
              gap: 0.5rem !important;
              padding: 0.4rem 0.9rem !important;
              background: rgba(14, 165, 233, 0.1) !important;
              border: 1px solid rgba(14, 165, 233, 0.3) !important;
              border-radius: 50px !important;
              font-size: 0.8rem !important;
              font-weight: 600 !important;
              color: #0284c7 !important;
              margin-bottom: 1rem !important;
            }
    
            .logo-badge::before {
              content: '✨' !important;
              font-size: 1rem !important;
            }
    
            h1.main-heading {
              font-size: clamp(2rem, 6vw, 3.5rem) !important;
              font-weight: 900 !important;
              line-height: 1.1 !important;
              margin: 0 0 0.5rem !important;
              letter-spacing: -0.02em !important;
              color: var(--text-primary) !important;
            }
    
            .gradient-text {
              display: block !important;
              margin-top: 0.5rem !important;
              background: var(--primary-gradient) !important;
              -webkit-background-clip: text !important;
              -webkit-text-fill-color: transparent !important;
              background-clip: text !important;
            }
    
            .hero-description {
              font-size: 1rem !important;
              line-height: 1.5 !important;
              color: var(--text-muted) !important;
              max-width: 700px !important;
              margin: 0 auto 1.5rem auto !important;
              text-align: center !important;
              width: 100% !important;
              display: block !important;
            }
    
            .hero-description strong {
              color: #0284c7 !important;
              font-weight: 600 !important;
            }
    
            /* Main Content */
            main {
              max-width: 900px !important;
              margin: 0 auto !important;
              padding: 0.5rem 1.5rem 1rem !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              flex: 1 !important;
              justify-content: center !important;
              overflow: hidden !important;
              gap: 0 !important;
            }
    
    
            /* Input Container */
            .input-container {
              margin: 0 auto;
              max-width: 700px;
              width: 100%;
              display: flex;
              flex-direction: column;
              align-items: center;
            }
    
            .input-wrapper {
              position: relative;
              display: flex;
              gap: 0.75rem;
              padding: 0.5rem;
              background: #ffffff;
              border: 2px solid #e2e8f0;
              border-radius: 1rem;
              transition: all 0.3s ease;
              width: 100%;
              align-items: stretch;
              box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
            }
    
            .input-wrapper:focus-within {
              border-color: var(--primary-color);
              box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1), 0 4px 6px rgba(0, 0, 0, 0.1);
              transform: translateY(-2px);
            }
    
            .idea-input {
              flex: 1 !important;
              background: transparent !important;
              border: none !important;
              padding: 1rem 1.25rem !important;
              font-size: 1.05rem !important;
              color: var(--text-primary) !important;
              outline: none !important;
              font-family: inherit !important;
            }
    
            .idea-input::placeholder {
              color: var(--text-muted) !important;
            }
    
            button.launch-button {
              display: inline-flex !important;
              align-items: center !important;
              gap: 0.5rem !important;
              padding: 1rem 2rem !important;
              background: var(--primary-gradient) !important;
              color: white !important;
              border: none !important;
              border-radius: 0.75rem !important;
              font-weight: 600 !important;
              font-size: 1rem !important;
              cursor: pointer !important;
              transition: all 0.3s ease !important;
              white-space: nowrap !important;
              box-shadow: 0 4px 15px rgba(14, 165, 233, 0.3) !important;
            }
    
            .launch-button:hover:not(:disabled) {
              transform: translateY(-2px);
              box-shadow: 0 8px 25px rgba(14, 165, 233, 0.4);
            }
    
            .launch-button:active:not(:disabled) {
              transform: translateY(0);
            }
    
            .launch-button:disabled {
              opacity: 0.5;
              cursor: not-allowed;
            }
    
            .launch-button svg {
              transition: transform 0.3s ease;
            }
    
            .launch-button:hover:not(:disabled) svg {
              transform: translateX(3px);
            }
    
            .launch-button.launching {
              position: relative;
              pointer-events: none;
            }
    
            .launch-button.launching::after {
              content: '';
              position: absolute;
              top: 50%;
              left: 50%;
              width: 20px;
              height: 20px;
              margin: -10px 0 0 -10px;
              border: 2px solid rgba(255, 255, 255, 0.3);
              border-top-color: white;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
            }
    
            .launch-button.launching span,
            .launch-button.launching svg {
              opacity: 0;
            }
    
            @keyframes spin {
              to { transform: rotate(360deg); }
            }
    
            .input-hint {
              margin-top: 0.75rem;
              font-size: 0.85rem;
              color: var(--text-muted);
              text-align: center;
              width: 100%;
              line-height: 1.5;
            }
    
            .example-link {
              color: #0ea5e9;
              cursor: pointer;
              transition: color 0.2s ease;
            }
    
            .example-link:hover {
              color: #0284c7;
              text-decoration: underline;
            }
    
            /* Features Grid */
            .features-grid {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
              gap: 1.5rem;
              margin: 4rem 0;
            }
    
            .feature-card {
              padding: 2rem;
              background: var(--surface-color);
              border: 1px solid var(--border-color);
              border-radius: 1rem;
              transition: all 0.3s ease;
            }
    
            .feature-card:hover {
              border-color: var(--primary-color);
              transform: translateY(-4px);
              box-shadow: 0 12px 40px rgba(14, 165, 233, 0.15);
            }
    
            .feature-icon {
              width: 48px;
              height: 48px;
              background: var(--primary-gradient);
              border-radius: 12px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 1.5rem;
              margin-bottom: 1rem;
            }
    
            .feature-title {
              font-size: 1.25rem;
              font-weight: 700;
              margin-bottom: 0.5rem;
              color: var(--text-primary);
            }
    
            .feature-description {
              color: var(--text-muted);
              line-height: 1.6;
            }
    
            /* Stats */
            .stats-container {
              display: flex;
              justify-content: center;
              gap: 4rem;
              flex-wrap: wrap;
              margin: 4rem 0;
              padding: 2rem;
            }
    
            .stat-item {
              text-align: center;
            }
    
            .stat-value {
              font-size: 3rem;
              font-weight: 900;
              background: var(--primary-gradient);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
              background-clip: text;
              line-height: 1;
              margin-bottom: 0.5rem;
            }
    
            .stat-label {
              color: var(--text-muted);
              font-size: 0.9rem;
              font-weight: 600;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
    
            /* Responsive */
            @media (max-width: 768px) {
              .input-wrapper {
                flex-direction: column;
              }
    
              .launch-button {
                width: 100%;
                justify-content: center;
              }
    
              .stats-container {
                gap: 2rem;
              }
    
              .features-grid {
                grid-template-columns: 1fr;
              }
            }
          `}</style>
    
          <header>
            <div className="logo-badge">Powered by Multi-Agent AI</div>
            <h1 className="main-heading">
              Turn Your Ideas Into
              <span className="gradient-text">Reality in Minutes</span>
            </h1>
          </header>
    
          <main>
            <p className="hero-description">
              Describe what you want to build. Watch as multiple AI agents collaborate in real-time to bring your vision to life.
            </p>
            
            <div className="input-container">
              <div className="input-wrapper">
                <input
                  type="text"
                  className="idea-input"
                  placeholder="Enter your idea to bring to life..."
                  value={idea}
                  onChange={(e) => setIdea(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLaunching}
                />
                <button
                  className={`launch-button ${isLaunching ? 'launching' : ''}`}
                  onClick={handleLaunch}
                  disabled={!idea.trim() || isLaunching}
                >
                  <span>Launch</span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M7.5 15L12.5 10L7.5 5"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <p className="input-hint">
                Try: <span className="example-link" onClick={() => setIdea("Build a todo app with user authentication")}>
                  "Build a todo app with user authentication"
                </span> or <span className="example-link" onClick={() => setIdea("Create a data visualization dashboard")}>
                  "Create a data visualization dashboard"
                </span>
              </p>
            </div>
          </main>
        </>
)}