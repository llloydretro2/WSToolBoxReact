import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useLocale } from "../contexts/LocaleContext";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  InputAdornment,
  IconButton,
  Divider,
  Chip,
} from "@mui/material";
import { Snackbar, Alert } from "@mui/material";
import {
  Person as PersonIcon,
  Lock as LockIcon,
  Visibility,
  VisibilityOff,
  LoginRounded,
  PersonAddRounded,
} from "@mui/icons-material";
import { PrimaryButton, SecondaryButton } from "../components/ButtonVariants";
import "./Login.css";

const BACKEND_URL = "https://api.cardtoolbox.org";
// const BACKEND_URL = "http://38.244.14.142:4000";
// const LOCAL_BACKEND_URL = "http://localhost:4000";

function LoginPage() {
  const { t } = useLocale();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!username || !password) {
      setErrorMessage(t("pages.login.error.emptyFields"));
      // removed
      return;
    }

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";

      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            (isRegister
              ? t("pages.login.error.registerFailed")
              : t("pages.login.error.loginFailed")),
        );
      }

      const data = await response.json();
      // localStorage.setItem("token", data.token);
      // localStorage.setItem("username", data.user.username);

      if (!isRegister) {
        setSuccessMessage(t("pages.login.success.login"));
        setTimeout(() => {
          navigate("/");
        }, 1000);
        login({
          token: data.token,
          username: data.user.username,
          userData: data.user,
        });
      } else {
        setErrorMessage(t("pages.login.success.register"));
        setIsRegister(false);
      }
    } catch (error) {
      setErrorMessage(error.message);
      // removed
    }
  };

  return (
    <>
      <Snackbar
        open={Boolean(errorMessage)}
        autoHideDuration={4000}
        onClose={() => setErrorMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: 9999, mt: 8 }}
      >
        <Alert
          onClose={() => setErrorMessage("")}
          severity="warning"
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: 2,
            boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
          }}
        >
          {errorMessage}
        </Alert>
      </Snackbar>
      <Snackbar
        open={Boolean(successMessage)}
        autoHideDuration={3000}
        onClose={() => setSuccessMessage("")}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        sx={{ zIndex: 9999, mt: 8 }}
      >
        <Alert
          onClose={() => setSuccessMessage("")}
          severity="success"
          variant="filled"
          sx={{
            width: "100%",
            borderRadius: 2,
            boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
          }}
        >
          {successMessage}
        </Alert>
      </Snackbar>
      {/* 主容器 - 正常布局，可滚动 */}
      <Box
        sx={{
          minHeight: "100%", // 使用100%而不是视口高度
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper
            className="login-card"
            elevation={0}
            sx={{
              borderRadius: 4,
              overflow: "hidden",
              backgroundColor: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <Box className="login-form-container" sx={{ p: 4 }}>
              {/* 标题部分 */}
              <Box sx={{ textAlign: "center", mb: 4 }}>
                <Box
                  className="login-avatar"
                  sx={{
                    width: 80,
                    height: 80,
                    borderRadius: "50%",
                    background: "var(--primary)",
                    margin: "0 auto 16px auto",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.2)",
                  }}
                >
                  {isRegister ? (
                    <PersonAddRounded sx={{ fontSize: 40, color: "white" }} />
                  ) : (
                    <LoginRounded sx={{ fontSize: 40, color: "white" }} />
                  )}
                </Box>
                <Typography
                  className="login-title"
                  variant="h4"
                  fontWeight={700}
                  sx={{
                    color: "var(--primary)",
                    mb: 1,
                  }}
                >
                  {isRegister
                    ? t("pages.login.registerTitle")
                    : t("pages.login.title")}
                </Typography>
              </Box>

              {/* 表单部分 */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  className="login-input"
                  label={t("pages.login.username")}
                  variant="outlined"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  fullWidth
                  sx={{ mb: 2.5 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ color: "var(--primary)" }} />
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        "&:hover fieldset": {
                          borderColor: "var(--primary)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "var(--primary)",
                        },
                      },
                    },
                  }}
                  InputLabelProps={{
                    sx: {
                      "&.Mui-focused": {
                        color: "var(--primary)",
                      },
                    },
                  }}
                />
                <TextField
                  className="login-input"
                  label={t("pages.login.password")}
                  type={showPassword ? "text" : "password"}
                  variant="outlined"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockIcon sx={{ color: "var(--primary)" }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: "var(--primary)" }}
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                    sx: {
                      borderRadius: 2,
                      "& .MuiOutlinedInput-root": {
                        "&:hover fieldset": {
                          borderColor: "var(--primary)",
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: "var(--primary)",
                        },
                      },
                    },
                  }}
                  InputLabelProps={{
                    sx: {
                      "&.Mui-focused": {
                        color: "var(--primary)",
                      },
                    },
                  }}
                />
              </Box>

              {/* 主按钮 */}
              <PrimaryButton
                className="login-button"
                variant="contained"
                onClick={handleSubmit}
                fullWidth
                size="large"
                sx={{
                  borderRadius: 2.5,
                  py: 1.5,
                  fontSize: "1.1rem",
                  fontWeight: 600,
                  boxShadow: "0 8px 25px rgba(0, 0, 0, 0.2)",
                  "&:hover": {
                    transform: "translateY(-2px)",
                  },
                  mb: 3,
                }}
              >
                {isRegister
                  ? t("pages.login.registerButton")
                  : t("pages.login.loginButton")}
              </PrimaryButton>

              {/* 分割线 */}
              <Divider sx={{ my: 3 }}>
                <Chip
                  label={t("pages.login.or")}
                  size="small"
                  sx={{
                    backgroundColor: "var(--card-background)",
                    color: "var(--primary)",
                    fontWeight: 500,
                  }}
                />
              </Divider>

              {/* 切换按钮 */}
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {isRegister
                    ? t("pages.login.hasAccount")
                    : t("pages.login.noAccount")}
                </Typography>
                <SecondaryButton
                  variant="text"
                  onClick={() => setIsRegister(!isRegister)}
                  sx={{
                    textTransform: "none",
                    fontSize: "1rem",
                    "&:hover": {
                      transform: "scale(1.02)",
                    },
                    transition: "all 0.2s ease",
                  }}
                >
                  {isRegister
                    ? t("pages.login.switchToLogin")
                    : t("pages.login.switchToRegister")}
                </SecondaryButton>
              </Box>
            </Box>
          </Paper>
        </Container>
      </Box>
    </>
  );
}

export default LoginPage;
