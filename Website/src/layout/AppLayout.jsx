import { useLocation } from "react-router-dom";
import Footer from "../component/common/footer/Footer";
import TopNavbar from "../component/common/navbar/Navbar";
import PropTypes from "prop-types";
import { Container } from "react-bootstrap";
import "./AppLayout.scss";
import BreadCrumbs from "./BreadCrumbs";
import { useContext, useEffect } from "react";
import { DataContext } from "../context/DataContext";

const AppLayout = ({ children }) => {
  const location = useLocation();

  const { setMetaData, pageMetaData } = useContext(DataContext);

  useEffect(() => {
    const handlePageLoad = () => {
      let pathname = location?.pathname?.slice(1);
      let path_meta = pageMetaData?.[String(pathname)];

      let meta = {
        meta_title: path_meta?.meta_title,
        keywords: path_meta?.content,
        meta_descriptions: path_meta?.meta_description,
        slug: path_meta?.slug,
        content: path_meta?.content,
      };

      setMetaData(meta);
    };

    handlePageLoad();
  }, [location.pathname]);

  return (
    <section>
      <TopNavbar />
      {location.pathname !== "/home" && (
        <Container className="main-component-builder">
          <BreadCrumbs />
          {children}
        </Container>
      )}
      {location.pathname === "/home" && (
        <Container className="main-component-builder">{children}</Container>
      )}
      <Footer />
    </section>
  );
};

AppLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default AppLayout;
