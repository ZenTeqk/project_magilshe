import React, { useContext, useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import PropTypes from "prop-types";
import {
  Button,
  Container,
  TextField,
  Typography,
  Box,
  Grid,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import chefImage2 from "../../assets/chef-2.png";
import "./auth.scss";
import { DataContext } from "../../context/DataContext";
import { loginApi } from "../../utils/AuthAPI";
import { useNavigate } from "react-router";
import Cookies from "universal-cookie";
import { showToast } from "../../component/common/ToastAlert";
import "./LoginModal.scss";
import { useDispatch, useSelector } from "react-redux";
import { setUserName } from "../../redux/reducers/ChildReducer/userNameReducer";
import OTPInput from "react-otp-input";
import { OtpApi } from "../../utils/cakeryAPI";

function LoginContainer({ setIsSignupPage, setShow }) {
  const cookies = new Cookies();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { setAccessToken, setIsPreloaderShow } = useContext(DataContext);
  const userNameData = useSelector(
    (state) => state.userNameReducer.user_name_data
  );

  const { REACT_APP_IS_SKIP_OTP } = process.env;
  const isSkipOtp = REACT_APP_IS_SKIP_OTP === 'true';

  const [loginCredentials, setLoginCredentials] = useState({
    username: "",
    password: null,
  });

  const [isOTPSented, setIsOTPSented] = useState(false);

  const handleChange = (value, name) => {
    setLoginCredentials((oldData) => ({
      ...oldData,
      [name]: value,
    }));
  };

  const [otpData, setOtpData] = useState({
    username: userNameData,
    otp: "",
  });

  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let interval;
    if (isOTPSented && timer > 0) {
      interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    }
    if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isOTPSented, timer]);

  useEffect(() => {
    setOtpData((prev) => ({
      ...prev,
      username: userNameData,
    }));
  }, [userNameData]);

  const handleOTPChange = (otp) => {
    setOtpData((prev) => ({ ...prev, otp }));
  };

  const handleLogin = async () => {
    try {
      const numberPattern = /^[0-9]{10}$/;

      if (!numberPattern.test(loginCredentials?.username)) {
        showToast("Enter Valid Phone Number", "error");
      } else {
        setIsPreloaderShow(true);

        let payload = {
          username: loginCredentials?.username,
          skip_otp: isSkipOtp ? true : false,
        };
        
        if (isSkipOtp) {
          payload.password = loginCredentials?.password || null;
        }
        
        const loginApiResponse = await loginApi(payload);

        if (loginCredentials?.username) {
          dispatch(setUserName(loginCredentials.username));
        } else {
          console.warn("Username is missing in login credentials");
        }

        if (loginApiResponse?.data?.login_redirect) {
          localStorage.setItem(
            "web_magilshe_token",
            JSON.stringify(loginApiResponse?.data?.tokens)
          );
          cookies.set(
            "web_access_token",
            loginApiResponse?.data?.tokens?.access
          );
          setAccessToken(loginApiResponse?.data?.tokens?.access);
          navigate("/home");
          showToast("Sign In Succesfully!", "success");
        } else {
          // navigate("/otp-verification");
          setIsOTPSented(true);
          showToast("OTP Send Succesfully!", "success");
        }
      }
    } catch (error) {
      console.error("log", error?.message);
      showToast(error?.message || "Something Went Wrong!", "error");
    } finally {
      // setIsOTPSented(true);
      setIsPreloaderShow(false);
      setTimer(60);
      if (loginCredentials?.username) {
        dispatch(setUserName(loginCredentials.username));
      } else {
        console.warn("Username is missing in login credentials");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      const response = await OtpApi(otpData);

      if (response?.status === 200) {
        showToast("Login successfully!", "success");
        dispatch(setUserName(""));
        localStorage.setItem(
          "web_magilshe_token",
          JSON.stringify(response?.data?.tokens)
        );
        cookies.set("web_access_token", response?.data?.tokens?.access);
        setAccessToken(response?.data?.tokens?.access);
        navigate("/");

        setOtpData({
          username: "",
          otp: "",
        });
      } else {
        showToast("Unexpected response status", "error");
      }
    } catch (error) {
      console.error("API Error:", error);
      showToast(error.message, "error");
    }
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <div className="login-Modal-container">
      <Container className="sign-up-section inner-container">
        <Grid container spacing={0.5} direction={"row"}>
          <Grid
            item
            md={6}
            sm={12}
            xs={12}
            order={isMobile ? 2 : 1}
            className="d-flex align-items-center"
          >
            <Box className="left-box">
              <Typography
                variant="h4"
                gutterBottom
                sx={{ textAlign: "center" }}
                className="title"
              >
                Welcome Back
              </Typography>
              <Typography
                variant="body1"
                gutterBottom
                sx={{ textAlign: "center", fontSize: "13px" }}
                className="desc"
              >
                Welcome Back, Please enter your details
              </Typography>

              <Grid item md={10} className="mx-auto">
                <Typography variant="caption" className="auth-input-label">
                  Phone Number
                </Typography>
                <TextField
                  fullWidth
                  type="text"
                  size="small"
                  margin="normal"
                  name="username"
                  value={loginCredentials.username}
                  onChange={(e) => {
                    const value = e.target.value.replace(/[^0-9]/g, "");
                    handleChange(value, "username");
                  }}
                  required
                  disabled={isOTPSented}
                  sx={{ mt: 0.5 }}
                />

                {isSkipOtp && (
                  <>
                    <Typography variant="caption" className="auth-input-label">
                      Password
                    </Typography>
                    <TextField
                      fullWidth
                      size="small"
                      margin="normal"
                      name="password"
                      type="password"
                      value={loginCredentials.password}
                      onChange={(e) => {
                        handleChange(e.target.value, "password");
                      }}
                      required
                      disabled={isOTPSented}
                      sx={{ mt: 0.5 }}
                    />
                  </>
                )}

                {isOTPSented && (
                  <>
                    <Typography variant="caption">OTP</Typography>

                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "center",
                        mt: 1,
                        mx: 4,
                      }}
                      className="otp-input"
                      // style={{marginLeft: "2rem", marginRight: "2rem"}}
                    >
                      <OTPInput
                        value={otpData.otp}
                        onChange={handleOTPChange}
                        
                        numInputs={6}
                        separator={<span>-</span>}
                        renderInput={(props) => <input {...props} />}
                        inputStyle={{
                          width: "40px",
                          height: "40px",
                          margin: "0 0.2rem",
                          fontSize: "1rem",
                          borderRadius: "6px",
                          border: "1.5px solid #E1E1E1",
                        }}
                      />
                    </Box>
                    {timer > 0 ? (
                      <Typography
                        variant="body2"
                        sx={{ mt: 1, textAlign: "center" }}
                      >
                        Resend OTP in {timer}s
                      </Typography>
                    ) : (
                      <Button
                        variant="text"
                        onClick={handleLogin}
                        sx={{
                          textAlign: "center",
                          display: "block",
                          margin: "auto",
                        }}
                      >
                        Resend OTP
                      </Button>
                    )}
                  </>
                )}
               

                {!isOTPSented ? (
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      marginTop: "20px",
                      background:
                        "linear-gradient(126.53deg, #72362E -48.09%, #F27863 116.44%)",
                      borderRadius: "8px",
                      color: "#fff",
                      "&:hover": {
                        backgroundColor: "#d81b60",
                      },
                    }}
                    fullWidth
                    onClick={handleLogin}
                  >
                    {isSkipOtp ? "Login" : "Request OTP"}
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    variant="contained"
                    sx={{
                      marginTop: "20px",
                      background:
                        "linear-gradient(126.53deg, #72362E -48.09%, #F27863 116.44%)",
                      borderRadius: "8px",
                      color: "#fff",
                      "&:hover": {
                        backgroundColor: "#d81b60",
                      },
                    }}
                    fullWidth
                    onClick={handleSubmit}
                  >
                    Sign In
                  </Button>
                )}
              </Grid>
              <Typography
                variant="body2"
                sx={{ textAlign: "center", marginTop: "10px" }}
              >
                {"Don't have an account?"}
                <Button
                  sx={{
                    marginLeft: "5px",
                    textTransform: "none",
                    padding: 0,
                  }}
                  onClick={() => {
                    setIsSignupPage(true);
                  }}
                >
                  Sign Up
                </Button>
              </Typography>
            </Box>
          </Grid>
          <Grid
            item
            md={6}
            sm={12}
            xs={12}
            order={isMobile ? 1 : 2}
            className="right-side-image"
          >
            <Box className="chefImage" sx={{ backgroundColor: "#EE6C4D" }}>
              <img src={chefImage2} alt="Login-Chef" />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
}

LoginContainer.propTypes = {
  setIsSignupPage: PropTypes.func.isRequired,
  setShow: PropTypes.func.isRequired,
};

export default LoginContainer;
