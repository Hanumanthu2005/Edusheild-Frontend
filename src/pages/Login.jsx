import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../services/api";
import "../css/Login.css";

function Login() {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const navigate  = useNavigate();

  const [username,      setUsername]      = useState("");
  const [password,      setPassword]      = useState("");
  const [error,         setError]         = useState("");
  const [animate,       setAnimate]       = useState(false);
  const [cameraReady,   setCameraReady]   = useState(false);
  const [showPassword,  setShowPassword]  = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [snapshotData,  setSnapshotData]  = useState("");
  const [isLoggingIn,   setIsLoggingIn]   = useState(false);

  // ── Camera init ─────────────────────────────────────────────────────────────
  useEffect(() => {
    setAnimate(true);

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width:      { ideal: 1280 },
          height:     { ideal: 720  },
          facingMode: "user",
        },
      })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => setCameraReady(true);
        }
      })
      .catch((err) => {
        setError("Camera access denied. Please enable camera to login.");
        console.error(err);
      });

    return () => {
      if (videoRef.current?.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // ── Snapshot ─────────────────────────────────────────────────────────────────
  const captureSnapshot = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || video.videoWidth === 0) {
      setError("Camera is still initializing. Please wait.");
      return;
    }

    if (snapshotTaken) {
      setSnapshotTaken(false);
      setSnapshotData("");
      video.play();
      setError("");
      return;
    }

    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataURL = canvas.toDataURL("image/jpeg", 0.92);
    if (dataURL && dataURL.length > 100) {
      setSnapshotData(dataURL);
      setSnapshotTaken(true);
      video.pause();
      setError("");
    } else {
      setError("Failed to capture photo. Please try again.");
    }
  };

  // ── Validation ───────────────────────────────────────────────────────────────
  const validateForm = () => {
    if (!username.trim()) {
      setError("Username is required");
      return false;
    }
    if (!password) {
      setError("Password is required");
      return false;
    }
    if (!cameraReady) {
      setError("Please wait for camera to initialize");
      return false;
    }
    if (!snapshotTaken || !snapshotData) {
      setError("Please capture your live photo for face verification");
      return false;
    }
    return true;
  };

  // ── Login ────────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError("");
    if (!validateForm()) return;

    setIsLoggingIn(true);

    const result = await loginUser({
      username,
      password,
      live_snapshot_base64: snapshotData,
    });

    if (result.error) {
      setError(result.error);
      setIsLoggingIn(false);
      setSnapshotTaken(false);
      setSnapshotData("");
      videoRef.current?.play();
      return;
    }

    localStorage.setItem("token",      result.token);
    localStorage.setItem("role",       result.role);
    console.log(result.role)
    localStorage.setItem("session_id", result.session_id ?? "");

    if (result.role === "admin") {
      navigate("/admin");
    } else {
      navigate("/home");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className={`login-page ${animate ? "login-enter" : ""}`}>
      <div className="login-container">

        {/* Left: Form */}
        <div className="login-form-section">
          <div className="form-header">
            <div className="brand-logo">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
              </div>
              <span className="brand-text">EduShield</span>
            </div>
            <h1 className="form-title">Welcome Back</h1>
            <p className="form-subtitle">
              Sign in to access your secure examination dashboard
            </p>
          </div>

          <div className="form-content">

            {/* Username */}
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20"
                     viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoggingIn}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Password */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                <svg className="input-icon" width="20" height="20"
                     viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={isLoggingIn}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword((p) => !p)}
                  disabled={isLoggingIn}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                         stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="error-message" role="alert">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                {error}
              </div>
            )}

            {/* Snapshot success */}
            {snapshotTaken && !error && (
              <div className="success-message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Face verification photo captured successfully!
              </div>
            )}

            {/* Login button */}
            <button
              className="login-btn"
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? (
                <>
                  <div className="button-spinner" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>

            <div className="form-footer">
              <p>Don't have an account?</p>
              <button
                className="link-btn"
                onClick={() => navigate("/register")}
                disabled={isLoggingIn}
              >
                Create Account
              </button>
            </div>

          </div>
        </div>

        {/* Right: Camera */}
        <div className="login-camera-section">
          <div className="camera-info">
            <div className="info-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span>Face Verification</span>
            </div>
            <h2>Verify Your Identity</h2>
            <p>Capture a live photo for secure biometric authentication</p>
          </div>

          <div className="camera-container">
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className="camera-video"
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            {cameraReady && !snapshotTaken && (
              <div className="camera-status">
                <span className="status-dot" />
                <span>Camera Ready</span>
              </div>
            )}

            {snapshotTaken && (
              <div className="camera-status verified">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Photo Captured</span>
              </div>
            )}

            {!cameraReady && (
              <div className="camera-loading">
                <div className="loading-spinner" />
                <p>Initializing camera...</p>
              </div>
            )}

            {!snapshotTaken && (
              <div className="camera-frame">
                <div className="frame-corner top-left"     />
                <div className="frame-corner top-right"    />
                <div className="frame-corner bottom-left"  />
                <div className="frame-corner bottom-right" />
                <div className="scanner-line"              />
              </div>
            )}
          </div>

          {/* Snap / Retake button */}
          <button
            className={`snap-button ${snapshotTaken ? "retake" : ""}`}
            onClick={captureSnapshot}
            disabled={!cameraReady || isLoggingIn}
          >
            {snapshotTaken ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10" />
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
                <span>Retake Photo</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span>Capture Live Photo</span>
              </>
            )}
          </button>

          <div className="camera-instructions">
            {[
              "Ensure good lighting",
              "Look directly at camera",
              "Match your registration photo",
            ].map((tip) => (
              <div className="instruction-item" key={tip}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>{tip}</span>
              </div>
            ))}
          </div>

          <div className="security-notice">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>Your biometric data is encrypted and secure</span>
          </div>
        </div>

      </div>
    </div>
  );
}

export default Login;