import { useState, useRef, useEffect } from "react";
import { registerUser } from "../services/api";
import { useNavigate } from "react-router-dom";
import "../css/Register.css";

function Register() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [animate, setAnimate] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [snapshotTaken, setSnapshotTaken] = useState(false);
  const [snapshotData, setSnapshotData] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    setAnimate(true);
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setCameraReady(true);
          };
        }
      })
      .catch(err => {
        setError("Camera access denied. Please enable camera to register.");
        console.error(err);
      });

    return () => {
      // Cleanup: stop video stream
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureSnapshot = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!video || video.videoWidth === 0) {
      setError("Camera is still initializing. Please wait.");
      return;
    }

    // If retaking photo, resume video
    if (snapshotTaken) {
      setSnapshotTaken(false);
      setSnapshotData("");
      video.play();
      setError("");
      return;
    }

    const context = canvas.getContext("2d");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataURL = canvas.toDataURL("image/jpeg", 0.9);

    if (dataURL && dataURL.length > 100) {
      setSnapshotData(dataURL);
      setSnapshotTaken(true);
      video.pause();
      setError("");
    } else {
      setError("Failed to capture photo. Please try again.");
    }
  };

  const validateForm = () => {
    if (!username.trim()) {
      setError("Username is required");
      return false;
    }
    if (username.length < 3) {
      setError("Username must be at least 3 characters long");
      return false;
    }
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    if (!password) {
      setError("Password is required");
      return false;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }
    if (!cameraReady) {
      setError("Please wait for camera to initialize");
      return false;
    }
    if (!snapshotTaken || !snapshotData) {
      setError("Please capture your baseline photo before registering");
      return false;
    }
    return true;
  };

  const handleRegister = async () => {
    setError("");
    
    if (!validateForm()) {
      return;
    }

    setIsRegistering(true);

    try {
      const result = await registerUser({
        username,
        email,
        password,
        register_snapshot_base64: snapshotData
      });

      if (result.error) {
        setError(result.error);
        setIsRegistering(false);
      } else {
        // Success
        alert("Registration successful! Please login.");
        navigate("/login");
      }
    } catch (err) {
      setError("Failed to connect to server. Please try again.");
      setIsRegistering(false);
      console.error(err);
    }
  };

  return (
    <div className={`register-page ${animate ? "register-enter" : ""}`}>
      <div className="register-container">
        {/* Left side - Form */}
        <div className="register-form-section">
          <div className="form-header">
            <div className="brand-logo">
              <div className="logo-icon">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                  <path d="M2 17l10 5 10-5"/>
                  <path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <span className="brand-text">EduShield</span>
            </div>

            <h1 className="form-title">Create Account</h1>
            <p className="form-subtitle">Register to get started with secure online examinations</p>
          </div>

          <div className="form-content">
            {/* Username Input */}
            <div className="input-group">
              <label htmlFor="username">Username</label>
              <div className="input-wrapper">
                {/* <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg> */}
                <input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isRegistering}
                />
              </div>
            </div>

            {/* Email Input */}
            <div className="input-group">
              <label htmlFor="email">Email Address</label>
              <div className="input-wrapper">
                {/* <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg> */}
                <input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isRegistering}
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrapper">
                {/* <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg> */}
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isRegistering}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isRegistering}
                >
                  {showPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="input-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-wrapper">
                {/* <svg className="input-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg> */}
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isRegistering}
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isRegistering}
                >
                  {showConfirmPassword ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                      <line x1="1" y1="1" x2="23" y2="23"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                {error}
              </div>
            )}

            {/* Snapshot Status */}
            {snapshotTaken && (
              <div className="success-message">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
                Baseline photo captured successfully!
              </div>
            )}

            {/* Register Button */}
            <button 
              className="register-btn" 
              onClick={handleRegister}
              disabled={isRegistering}
            >
              {isRegistering ? (
                <>
                  <div className="button-spinner"></div>
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <span>Create Account</span>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                    <polyline points="12 5 19 12 12 19"/>
                  </svg>
                </>
              )}
            </button>

            {/* Login Link */}
            <div className="form-footer">
              <p>Already have an account?</p>
              <button 
                className="link-btn" 
                onClick={() => navigate("/login")}
                disabled={isRegistering}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>

        {/* Right side - Camera */}
        <div className="register-camera-section">
          <div className="camera-info">
            <div className="info-badge">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              <span>Face Registration</span>
            </div>
            <h2>Capture Your Photo</h2>
            <p>Your photo will be used for identity verification during exams</p>
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
                <span className="status-dot"></span>
                <span>Camera Ready</span>
              </div>
            )}

            {snapshotTaken && (
              <div className="camera-status captured">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
                <span>Photo Captured</span>
              </div>
            )}

            {!cameraReady && (
              <div className="camera-loading">
                <div className="loading-spinner"></div>
                <p>Initializing camera...</p>
              </div>
            )}

            {!snapshotTaken && (
              <div className="camera-frame">
                <div className="frame-corner top-left"></div>
                <div className="frame-corner top-right"></div>
                <div className="frame-corner bottom-left"></div>
                <div className="frame-corner bottom-right"></div>
                <div className="scanner-line"></div>
              </div>
            )}
          </div>

          {/* Snap Button */}
          <button 
            className={`snap-button ${snapshotTaken ? 'retake' : ''}`}
            onClick={captureSnapshot}
            disabled={!cameraReady || isRegistering}
          >
            {snapshotTaken ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
                </svg>
                <span>Retake Photo</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span>Snap Baseline Photo</span>
              </>
            )}
          </button>

          <div className="camera-instructions">
            <div className="instruction-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Ensure good lighting</span>
            </div>
            <div className="instruction-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Look directly at camera</span>
            </div>
            <div className="instruction-item">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              <span>Remove glasses if possible</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;