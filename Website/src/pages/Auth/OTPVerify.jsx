import React, { useContext, useState } from "react";
import {
  Button,
  Container,
  Typography,
  Box,
  Grid
} from "@mui/material";
import chefImage3 from "../../assets/chef-3.png";
import OTPInput from "react-otp-input";
import './auth.scss';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit } from "@fortawesome/free-solid-svg-icons";
import { OtpApi } from "../../utils/cakeryAPI";
import { useNavigate } from "react-router";
import { showToast } from "../../component/common/ToastAlert";
import { useDispatch, useSelector } from "react-redux";
import { setUserName } from "../../redux/reducers/ChildReducer/userNameReducer";
import Cookies from "universal-cookie";
import { DataContext } from "../../context/DataContext";

const OTPVerify = () => {
  const { setAccessToken, setIsPreloaderShow } = useContext(DataContext)

  const cookies = new Cookies();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const userNameData = useSelector((state) => state.userNameReducer.user_name_data);

  const [otpData, setOtpData] = useState({
    username: userNameData,
    otp: "",
  });

  const handleChange = (otp) => {
    setOtpData((prev) => ({ ...prev, otp }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {

      const response = await OtpApi(otpData);

      showToast("Login successfully!", "success");
      dispatch(setUserName(""));
      localStorage.setItem('web_magilshe_token', JSON.stringify(response?.data?.tokens))
      cookies.set('web_access_token', response?.data?.tokens?.access)
      setAccessToken(response?.data?.tokens?.access);
      navigate('/');

      setOtpData({
        username: "",
        otp: "",
      });
    } catch (error) {
      console.error("API Error:", error);

      showToast(error.message, "error");
    }

  };


  return (
    <div
      style={{
        height: "95vh",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "80vh",
          background: "#F9F9F9",
          borderRadius: "50px",
        }}
        className="sign-up-section"
      >
        <Grid container spacing={2}>
          <Grid item md={5} className="d-flex align-items-center">
            <Box sx={{ padding: "30px" }}>
              <Typography variant="h4" gutterBottom sx={{ textAlign: "center" }} className="title">
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
              <form onSubmit={handleSubmit} className="mt-5">
                <Typography variant="caption">
                  <FontAwesomeIcon icon={faEdit} /> {otpData.username || "No Username Entered"}
                </Typography>
                <br />
                <Typography variant="caption">OTP</Typography>

                <Box sx={{ display: "flex", justifyContent: "center", mt: 1 }}>
                  <OTPInput
                    value={otpData.otp}
                    onChange={handleChange}
                    numInputs={6}
                    separator={<span>-</span>}
                    renderInput={(props) => <input {...props} />}
                    inputStyle={{
                      width: "50px",
                      height: "50px",
                      margin: "0 0.5rem",
                      fontSize: "1rem",
                      borderRadius: "6px",
                      border: "1.5px solid #E1E1E1",
                    }}
                  />
                </Box>

                <Button
                  type="submit"
                  variant="contained"
                  sx={{
                    marginTop: "20px",
                    background: "linear-gradient(126.53deg, #72362E -48.09%, #F27863 116.44%)",
                    borderRadius: "8px",
                    color: "#fff",
                    "&:hover": {
                      backgroundColor: "#d81b60",
                    },
                  }}
                  fullWidth
                >
                  Verify OTP
                </Button>
              </form>
            </Box>
          </Grid>
          <Grid item md={7} className="right-side-image">
            <Box
              className="chefImage"
              sx={{
                backgroundColor: "#06745B",
                height: "100%",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: "0 50px 50px 0",
              }}
            >
              <img
                src={chefImage3}
                alt="Chef"
                style={{
                  maxWidth: "100%",
                  height: "auto",
                  borderRadius: "0 50px 50px 0",
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </div>
  );
};

export default OTPVerify;
