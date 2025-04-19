import { faBagShopping } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import React, { useContext } from "react";
import { Container } from "react-bootstrap";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "./ProductSlider.scss";
import { Button, Tooltip } from "@mui/material";
import { DataContext } from "../../context/DataContext";
import { useNavigate } from "react-router";

const ProductSlider = () => {
    const favouriteSettings = {
        dots: false,
        infinite: true,
        speed: 500,
        slidesToShow: 4,
        slidesToScroll: 1,
        arrows: true,
        responsive: [
            {
                breakpoint: 768,
                settings: {
                    slidesToShow: 1,
                    slidesToScroll: 1,
                },
            },
        ],
    };

    let desc =
        "Our tender coconut cake is crafted with fresh coconut flakes, velvety cake layers, and a hint of tropical sweetness, creating a blissful dessert that delights the palate.";

    const { offeredItemsObj } = useContext(DataContext);
    const navigate = useNavigate();

    return (
        <div className="product-slider-section">
            <Container key={0}>
                <Slider {...favouriteSettings} className="slider">
                    {offeredItemsObj?.map((data, index) => {
                        return (
                            <div key={index} className="slider-item">
                                <div className="image-top">
                                    <div className="image-favorite">
                                        <img src={data?.images[0]?.url} alt="Product" />
                                    </div>
                                    <span>
                                        <small className="rs-font">₹</small>
                                        {data?.price_list[0]?.cake_price_after_offer || 0}
                                    </span>
                                </div>
                                <div className="card-info">
                                    {/* Tooltip for Name */}
                                    <Tooltip title={data?.name || ""} arrow>
                                        <h4 className="name">
                                            {data?.name || ""} {" - "} {data?.price_list[0]?.kg || ""}{" Kg"}
                                        </h4>
                                    </Tooltip>

                                    {/* Tooltip for Sub-Category */}
                                    <Tooltip title={data?.sub_category?.name || ""} arrow>
                                        <h4 className="sub-category">{data?.sub_category?.name || ""}</h4>
                                    </Tooltip>

                                    {/* Tooltip for Description */}
                                    <Tooltip title={data?.description || desc} arrow>
                                        <p className="desc">{data?.description || desc}</p>
                                    </Tooltip>

                                    <div className="text-end">
                                        <Button
                                            variant="contained"
                                            className="add-cart-button"
                                            onClick={() => {
                                                navigate(`/menu/${data?.id}`);
                                            }}
                                        >
                                            <FontAwesomeIcon icon={faBagShopping} className="me-2" />
                                            Go to Menu
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </Slider>
            </Container>
        </div>
    );
};

export default ProductSlider;
