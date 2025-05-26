import { Navbar, Container, Nav } from "react-bootstrap";
import "./Navbar.scss";
import cart from "../../../assets/icons/bag-happy.png";
import location from "../../../assets/icons/Location.png";
import user from "../../../assets/icons/user.png";
import weblogo from "../../../assets/logo.png";
import React, { useContext, useState } from "react";
import {
  Avatar,
  Badge,
  Divider,
  IconButton,
  ListItemIcon,
  Menu,
  MenuItem,
  Typography,
} from "@mui/material";
import ProfileCard from "../../../pages/Profile/ProfileCard";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { logoutApi } from "../../../utils/AuthAPI";
import Cookies from "universal-cookie";
import { DataContext } from "../../../context/DataContext";
import AuthModal from "../../../pages/Auth/AuthModal";
import { Logout, PersonAdd, Settings } from "@mui/icons-material";
import { useEffect } from "react";

const TopNavbar = () => {
  const cookies = new Cookies();

  const [anchorElUser, setAnchorElUser] = useState(null);
  const [expanded, setExpanded] = useState(false);

  const navigate = useNavigate();
  const { accessToken, setAccessToken, setIsPreloaderShow, userProfileInfo } =
    useContext(DataContext);

  const handleOpenUserMenu = (event) => {
    setAnchorElUser(anchorElUser ? null : event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setAnchorElUser(null);
  };

  const handleLogout = async () => {
    const Token = JSON.parse(localStorage.getItem("web_magilshe_token"));

    let requestData = {
      refresh_token: Token?.refresh,
    };
    try {
      setIsPreloaderShow(true);
      await logoutApi(requestData);
      localStorage.removeItem("web_magilshe_token");
      cookies.remove("web_access_token");
      setAccessToken("");
      navigate("/");
    } catch (error) {
      console.error(error);
    } finally {
      setIsPreloaderShow(false);
    }
  };

  const [profileOpen, setProfileOpen] = useState(false);
  const userProfile = {
    name: "Vinish Kevin",
    email: "vinisk.vk45@gmail.com",
    phoneNumber: "9894431585",
    pincode: "619901",
    profilePicture: "https://via.placeholder.com/80", // Replace with the actual image URL
  };

  const handleClose = () => {
    setProfileOpen(false);
  };

  const [isLoginShow, setIsLoginShow] = useState(false);
  const [currentAddress, setCurrentAddress] = useState("Fetching location...");
  const [loading, setLoading] = useState(true);
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
  };
  const handleNavClose = () => {
    setAnchorEl(null);
  };

  const [position, setPosition] = useState({
    lat: 40.748817,
    lng: -73.985428,
  });

  const { REACT_APP_GMAP_API_KEY } = process.env;
  const Gmap_key = REACT_APP_GMAP_API_KEY

  console.log("dfds", Gmap_key);



  console.log("sdfsds", currentAddress);



  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${Gmap_key}`;

        try {
          const res = await fetch(geocodeUrl);
          const data = await res.json();


          if (data.status === "OK" && data.results.length > 0) {
            const result = data.results[0];

            const fullCode = data.plus_code?.compound_code;

            if (fullCode) {
              // Split at the first comma and take the first part
              const shortCode = fullCode.split(',')[0].trim();
              setCurrentAddress(shortCode);
            } else {
              setCurrentAddress(result.formatted_address);
            }
          }

        } catch (err) {
          console.error("Geocoding error:", err);
          setCurrentAddress("Address not found");
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setCurrentAddress("Permission denied");
        setLoading(false);
      }
    );
  }, []);

  return (
    <Navbar
      collapseOnSelect
      expand="lg"
      expanded={expanded}
      className="navbar_container"
    >
      <Container fluid className="wrapper">
        <Navbar.Toggle
          aria-controls="responsive-navbar-nav"
          onClick={() => setExpanded(!expanded)}
        />

        <Navbar.Brand as={NavLink} to="/home" className="logo theme-logo">
          <img src={weblogo} />
          {/* MagilShe.<span className="special">Cakery</span> */}
        </Navbar.Brand>

        <Nav className="right-nav links right-side-nav-mobile">
          <Nav.Link
            // as={NavLink}
            // to="/cart"
            onClick={() => {
              if (accessToken) {
                navigate("/cart");
              } else {
                setIsLoginShow(true);
              }
            }}
          // onClick={() => setExpanded(false)}
          >
            <img src={cart} alt="Cart" />
          </Nav.Link>

          {!accessToken ? (
            <IconButton
              onClick={() => {
                setIsLoginShow(true);
              }}
              size="small"
              aria-controls={open ? "account-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
            >
              {/* <Avatar sx={{ width: 32, height: 32 }}>M</Avatar> */}
              <img src={user} alt="User" />
            </IconButton>
          ) : (
            <>
              <IconButton
                onClick={handleClick}
                size="small"
                aria-controls={open ? "account-menu" : undefined}
                aria-haspopup="true"
                aria-expanded={open ? "true" : undefined}
              >
                {/* <Avatar sx={{ width: 32, height: 32 }}>M</Avatar> */}
                <img
                  className="w-10 h-10 rounded-full object-cover"
                  src={userProfileInfo?.profile_url || user}
                  alt="User"
                />{" "}
              </IconButton>

              <Menu
                anchorEl={anchorEl}
                id="account-menu"
                open={open}
                onClose={handleNavClose}
                onClick={handleNavClose}
                slotProps={{
                  paper: {
                    elevation: 0,
                    sx: {
                      overflow: "visible",
                      filter: "drop-shadow(0px 2px 8px rgba(0,0,0,0.32))",
                      mt: 1.5,
                      "& .MuiAvatar-root": {
                        width: 32,
                        height: 32,
                        ml: -0.5,
                        mr: 1,
                      },
                      "&::before": {
                        content: '""',
                        display: "block",
                        position: "absolute",
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: "background.paper",
                        transform: "translateY(-50%) rotate(45deg)",
                        zIndex: 0,
                      },
                    },
                  },
                }}
                transformOrigin={{ horizontal: "right", vertical: "top" }}
                anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
              >
                <MenuItem
                  onClick={() => {
                    navigate("/profile");
                  }}
                >
                  Profile
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    navigate("/orders");
                  }}
                >
                  My Orders
                </MenuItem>
                <Divider />

                <MenuItem onClick={handleLogout}>
                  <ListItemIcon>
                    <Logout fontSize="small" />
                  </ListItemIcon>
                  Logout
                </MenuItem>
              </Menu>
            </>
          )}
        </Nav>

        <Navbar.Collapse
          id="responsive-navbar-nav"
          onClick={() => setExpanded(false)}
        >
          <Nav className="m-auto links">
            <Nav.Link
              as={NavLink}
              to="/home"
              onClick={() => setExpanded(false)}
            >
              Home
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/menu"
              onClick={() => setExpanded(false)}
            >
              Menu
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/gallery"
              onClick={() => setExpanded(false)}
            >
              Gallery
            </Nav.Link>
            <Nav.Link
              as={NavLink}
              to="/offers"
              onClick={() => setExpanded(false)}
            >
              Offers
            </Nav.Link>
            {/* <Nav.Link as={NavLink} to="/orders" onClick={() => setExpanded(false)}>Orders</Nav.Link> */}
            <Nav.Link
              as={NavLink}
              to="/contact"
              onClick={() => setExpanded(false)}
            >
              Contact
            </Nav.Link>
          </Nav>



          <Nav className="right-nav links right-side-nav-desktop">
            <Nav.Link href="#">
              <img src={location} alt="Location" />
              <Typography sx={{ display: { xs: "none", sm: "inline" }, textTransform: "none" }}>
                {loading ? "Deliver" : currentAddress}
              </Typography>
            </Nav.Link>
            {/* <Nav.Link as={NavLink} to="/cart" onClick={() => setExpanded(false)}>
              <img src={cart} alt="Cart" /> Cart
            </Nav.Link> */}
            <Nav.Link
              onClick={() => {
                if (accessToken) {
                  navigate("/cart");
                } else {
                  setIsLoginShow(true);
                }
              }}
            >
              <Badge
                badgeContent={userProfileInfo?.active_cart_count || null}
                color="error"
                className="cart-badge"
                sx={{ right: "4px" }}
              >
                <img src={cart} alt="Cart" />
              </Badge>
              Cart
            </Nav.Link>

            {!accessToken ? (
              <Nav.Link
                // as={NavLink}
                // to="/login_old"
                onClick={() => setIsLoginShow(true)}
              >
                <img src={user} alt="Cart" /> Sign In
              </Nav.Link>
            ) : (
              <Nav.Link href="#" onClick={handleOpenUserMenu}>
                <div className="flex items-center gap-2">
                  <img
                    className="w-10 h-10 rounded-full object-cover"
                    src={userProfileInfo?.profile_url || user}
                    alt="User"
                  />
                  <span className="text-base leading-10">My Account</span>
                </div>

                <Menu
                  sx={{ mt: "45px" }}
                  id="menu-appbar"
                  anchorEl={anchorElUser}
                  anchorOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  keepMounted
                  transformOrigin={{
                    vertical: "top",
                    horizontal: "right",
                  }}
                  open={Boolean(anchorElUser)}
                  onClose={handleCloseUserMenu}
                >
                  <MenuItem
                    onClick={() => {
                      // handleCloseUserMenu();
                      // setProfileOpen(true);
                      navigate("/profile");
                    }}
                    className="profile-menu-item"
                  >
                    <Typography
                      textAlign="center"
                      className="d-flex align-items-center"
                    >
                      <img
                        src={require(`../../../assets/icons/my-profile-icon.png`)}
                        className="w-[20px] h-[20px] me-2"
                        alt="Profile Icon"
                      />
                      My Profile
                    </Typography>
                  </MenuItem>

                  <MenuItem className="profile-menu-item">
                    <Link
                      as={NavLink}
                      to="/orders"
                      className="d-flex align-items-center"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <img
                        src={cart}
                        className="w-[20px] h-[20px] me-2"
                        alt="Logout Icon"
                      />
                      <Typography>Orders</Typography>
                    </Link>
                  </MenuItem>

                  <MenuItem className="profile-menu-item">
                    <Link
                      onClick={handleLogout}
                      className="d-flex align-items-center"
                      style={{ textDecoration: "none", color: "inherit" }}
                    >
                      <img
                        src={require(`../../../assets/icons/logout-icon.png`)}
                        className="w-[20px] h-[20px] me-2"
                        alt="Logout Icon"
                      />
                      <Typography>Logout</Typography>
                    </Link>
                  </MenuItem>
                </Menu>
                <ProfileCard
                  open={profileOpen}
                  onClose={handleClose}
                  user={userProfile}
                />
              </Nav.Link>
            )}
          </Nav>
        </Navbar.Collapse>
      </Container>
      <AuthModal show={isLoginShow} setShow={setIsLoginShow} />
    </Navbar>
  );
};

export default TopNavbar;
