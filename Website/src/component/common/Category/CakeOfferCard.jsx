// import React from "react";
import PropTypes from "prop-types";
import { Grid } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./CakeOfferCard.scss";
import { FaWhatsapp } from "react-icons/fa";

const CakeOfferCard = ({
  image,
  discount,
  title,
  discountPrice,
  originalPrice,
  id,
  column,
  cakeData
}) => {
  const navigate = useNavigate();

  const { REACT_APP_WHATSAPP_NUMBER } = process.env;
  const phoneNumber = REACT_APP_WHATSAPP_NUMBER ?? "919940427774";

  const handleImageClick = () => {
    navigate(`/menu/${id}`);
  };

  const handleWhatsappEnquiry = () => {
    const message = `Hello, I would like to enquire about this cake.

      Cake Name: ${cakeData.name}

      Available Prices:
      ${cakeData.price_list
        .map((item) => `- ${item.kg} Kg : ₹${item.cake_price_after_offer}`)
        .join("\n")}

      Please share more details.`;

    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(
      message
    )}`;

    window.open(whatsappUrl, "_blank");
  };


  return (
    <Grid
      item
      lg={column}
      md={4}
      sm={6}
      xs={6}
      style={{ cursor: "pointer" }}
    >
      <div className="rounded-xl overflow-auto cake-offer-card">
        <div className="relative">
          <img
            src={image}
            alt={title}
            className="cake-image w-full object-cover"
            onClick={(e) => handleImageClick(e)}
          />
          {discount !== undefined && discount !== 0 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold py-1 px-2 rounded">
              {discount}% OFF
            </div>
          )}
        </div>
        <div className="bg-slate-50 text-center cake-price-section">
          <h3 className="text-gray-900 font-semibold text-sm mb-2" onClick={(e) => handleImageClick(e)}>{title}</h3>

          <div className="flex justify-between align-items-center">

            <div className="flex justify-start align-items-center">
              <span className="text-red-500 font-bold text-center">
                <span className="rs-font">₹</span>
                {discountPrice}
              </span>
              {/* {discount !== undefined && discount !== 0 && originalPrice && ( */}
              <span className="text-gray-500 text-sm line-through ml-2 text-center">
                <span className="rs-font">₹</span>
                {originalPrice}
              </span>
              {/* )} */}
            </div>

            <div>
              <div
                className="text-xs font-medium cursor-pointer text-[#059669] bg-[#ecfdf5] rounded-xl border-1 border-[#a7f3d0] flex items-center gap-1 px-2 py-1"
                onClick={() => {
                  handleWhatsappEnquiry()
                }}
              >
                <FaWhatsapp /> <span className="max-md:hidden">Whatsapp</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Grid>
  );
};

export default CakeOfferCard;

CakeOfferCard.propTypes = {
  image: PropTypes.string,
  discount: PropTypes.string,
  title: PropTypes.string,
  discountPrice: PropTypes.string,
  originalPrice: PropTypes.string,
  column: PropTypes.number,
  id: PropTypes.number.isRequired,
  cakeData: PropTypes.any
};
