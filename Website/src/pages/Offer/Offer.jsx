import OfferVector from "../../assets/images/heading-vector-1.png";
import CakeOfferCard from "../../component/common/Category/CakeOfferCard";
import { Grid, Skeleton } from "@mui/material";
import Banner from "../banner/Banner";
import { DataContext } from "../../context/DataContext";
import { useContext, useEffect, useState } from "react";
import { getOfferPageApi } from "../../utils/cakeryAPI";

const Offer = () => {
  const {
    setInitPageOffer,
    offeredPageItemsObj,
    setOfferedPageItemsObj,
  } = useContext(DataContext);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getOfferList();
  }, []);

  const getOfferList = async () => {
    try {
      setLoading(true);
      const getOfferAPIResponse = await getOfferPageApi();

      const uniqueData = getOfferAPIResponse.data.reduce((acc, item) => {
        if (!acc.some((existingItem) => existingItem.cake.id === item.cake.id)) {
          acc.push(item);
        }
        return acc;
      }, []);

      setOfferedPageItemsObj(uniqueData);
      setInitPageOffer(false);
    } catch (error) {
      console.error(error);
      setOfferedPageItemsObj([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Banner />

      <div className="align-middle mt-8">
        <h2 className="font-poppins font-semibold text-lg text-center">
          Offer Title
        </h2>
        <div className="flex justify-center">
          <img
            src={OfferVector}
            alt="Offer Vector"
            style={{ maxWidth: "180px" }}
          />
        </div>
        <p className="px-4 py-6 text-center">
          Description of the offer title you were placed. Discover the joy of
          our Classic Cakes, where timeless flavors delight your taste buds,
          and indulge in our Exquisite Custom Cakes, tailor-made masterpieces
          that create unforgettable memories.
        </p>

        <Grid container spacing={2}>
          {loading ? (
            Array.from({ length: 10 }).map((_, index) => (
              <Grid item key={index} md={2.4} sm={6} xs={6}>
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  height={"325px"}
                  width={"100%"}
                />
              </Grid>
            ))
          ) : offeredPageItemsObj?.length > 0 ? (
            offeredPageItemsObj.map((offer, index) => {
              const imageUrl = offer?.cake?.images?.[0];
              const originalPrice = offer?.cake_actual_price || 0;
              const discountedPrice = offer?.cake_offer_price || 0;
              const discountedPercentage =
                parseFloat(offer?.offer?.offer_percentage).toFixed(0) || 0;

              return (
                <CakeOfferCard
                  key={index}
                  column={2.4}
                  image={imageUrl}
                  discount={discountedPercentage}
                  title={offer?.cake?.name}
                  originalPrice={originalPrice}
                  discountPrice={discountedPrice}
                  id={offer?.cake?.id}
                />
              );
            })
          ) : (
            <Grid item xs={12}>
              <p className="text-center text-gray-500 py-4">
                No offers found.
              </p>
            </Grid>
          )}
        </Grid>
      </div>
    </div>
  );
};

export default Offer;
