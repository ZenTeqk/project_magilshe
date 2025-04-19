import "./Footer.scss";
import { Link } from "react-router-dom";
import facebook from "../../../assets/icons/facebook.svg";
import instagram from "../../../assets/icons/instagram.svg";
import location from "../../../assets/icons/location-marker.svg";
import { Col, Container, Row } from "react-bootstrap";
import { Divider, Grid } from "@mui/material";
import weblogo from "../../../assets/logo.png";
import { DataContext } from "../../../context/DataContext";
import { useContext } from "react";

const Footer = () => {
  const { configurationData } = useContext(DataContext)

  return (
    <footer className="footer_container">
      <Container>
        <Grid container className="wrapper" spacing={2}>
          <Grid item xs={12} md={6}>
            <Link className="logo link" to={"/"}>
              <img src={weblogo} style={{ maxWidth: "150px" }} />
              {/* MagilShe.<span className="special">Cakery</span> */}
            </Link>
            <p className="desc">
              Indulge in our wide range of cakes, pastries, and breads, made
              with love and the finest ingredients. Experience the joy of
              freshness at our bakery or enjoy doorstep delivery.
            </p>
            <div className="social_icons">
              <img src={facebook} alt="" />
              <img src={instagram} alt="" />
            </div>
          </Grid>
          <Grid item xs={12} md={3}>
            <div className="address_section">
              <div className="company">
                <label>Company</label>
                <ul>
                  <li>
                    <Link to={"/"} className="link">
                      About Us
                    </Link>
                  </li>
                  <li>
                    <Link to={"/"} className="link">
                      History
                    </Link>
                  </li>
                  <li>
                    <Link to={"/"} className="link">
                      Careers
                    </Link>
                  </li>
                  <li>
                    <Link to={"/terms-conditions"} className="link">
                      Terms and Conditions
                    </Link>
                  </li>
                  <li>
                    <Link to={"/privacy-policy"} className="link">
                      Privacy Policy
                    </Link>
                  </li>
                </ul>
              </div>
            </div>
          </Grid>
          <Grid item xs={12} md={3}>
            <div className="address_section">
              <div className="contact">
                <label>Contact</label>
                <p>{configurationData?.mobile}</p>
                <p>{configurationData?.email}</p>
                <p>{configurationData?.company_address}</p>
              </div>
            </div>
          </Grid>
        </Grid>
        <Divider />
        <div className="copyright">
          <span>© {new Date().getFullYear()} Magilshe Cakery</span>
          <span>
            <img src={location} alt="" /> Tamilnadu, India
          </span>
        </div>
      </Container>
    </footer>
  );
};

export default Footer;
