import React, { useContext } from "react";
import { Helmet } from "react-helmet-async";
import { useSelector } from "react-redux";
import { DataContext } from "../../context/DataContext";

const MetaHelmet = () => {
    const {metaData} = useContext(DataContext);

    return (
        <Helmet>
            <title>{metaData?.meta_title}</title>
            <meta name="description" content={metaData?.meta_descriptions} />
            <meta name="keywords" content={metaData?.keywords} />
            {/* Optional: Open Graph for better social preview */}
            <meta property="og:title" content={metaData?.meta_title} />
            <meta property="og:description" content={metaData?.meta_descriptions} />
            <meta property="og:url" content={metaData?.url || "https://www.magilshe.com"} />
            <meta property="og:type" content="website" />
        </Helmet>
    );
};

export default MetaHelmet;