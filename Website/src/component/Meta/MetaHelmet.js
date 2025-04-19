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
            <meta name="content" content={metaData?.content} />
            <meta name="slug" content={metaData?.slug} />
        </Helmet>
    );
};

export default MetaHelmet;