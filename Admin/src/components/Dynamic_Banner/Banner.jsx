import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Container,
  Grid,
  TextField,
  Typography,
} from "@mui/material";
import MainContext from "../../context/MainContext";
import { GetApi } from "../../hooks/Get/GetApi";
import { PostApi } from "../../hooks/Post/PostApi";
import {
  GetBannerImageUrl,
  CreateBannerImageUrl,
} from "../../Constant/urls/urls";
import AddBanner from "./AddBanner";
import AddIcon from "@mui/icons-material/Add";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

const Banner = () => {
  const { ShowNotification } = useContext(MainContext);
  const [banners, setBanners] = useState([]);

  const [selectedFileName, setSelectedFileName] = useState("");

  const [formData, setFormData] = useState({
    id: 0,
    main_text: "",
    sub_text: "",
    status: true,
    image: {},
  });

  // Fetch banner images
  const GetBannerImage = async () => {
    try {
      const result = await GetApi(GetBannerImageUrl);

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        setBanners(result.data?.data || []);
      }
    } catch (error) {
      console.error("getBannerImage Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  // Edit banner and populate form data
  const handleEdit = (banner) => {
    setShow(true)
    setFormData({
      id: banner.id,
      main_text: banner.main_text,
      sub_text: banner.sub_text,
      status: banner.status,
      image: banner.url,
      image_preview: banner.url,
    });
    setSelectedFileName("");
  };

  useEffect(() => {
    GetBannerImage();
  }, []);

  const [show, setShow] = useState(false);

  return (
    <div>
      <Grid container spaing={2} className="mb-2">
        <Grid item md={6} xs={6} className="text-end search-section">
          <section className="component-heading my-1">
            <FontAwesomeIcon icon={faFileLines} className="mx-2" /> Banner
          </section>
        </Grid>
        <Grid item md={6} xs={6} className="text-end top-action-button-group">
          <div className="ml-auto">
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => {
                setShow(true);
              }}
            >
              Add Banner
            </Button>
          </div>
        </Grid>
      </Grid>

      <Box mt={4}>
        {banners.length === 0 ? (
          <Typography>No banners available.</Typography>
        ) : (
          <Grid container spacing={2}>
            {banners.map((banner) => (
              <Grid item xs={12} sm={6} md={4} key={banner.id}>
                <Card>
                  <CardContent>
                    <img
                      src={banner.url}
                      alt={banner.main_text}
                      style={{
                        width: "100%",
                        height: "150px", // Set a fixed height for all images
                        objectFit: "cover", // This ensures images cover the area without distortion
                        marginBottom: "10px",
                      }}
                    />
                    {/* <Typography variant="h6">{banner.main_text}</Typography> */}
                    {/* <Typography variant="body2">{banner.sub_text}</Typography> */}
                    {/* <Checkbox
                      checked={banner.status} // Reflect the actual banner status
                    /> */}
                    <div className="text-end">
                    <Button
                      variant="contained"
                      sx={{
                        textTransform: "capitalize"
                      }}
                      onClick={() => handleEdit(banner)}
                    >
                      Edit Banner
                    </Button>
                    </div>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>

      <AddBanner
        show={show}
        setShow={setShow}
        formData={formData}
        setFormData={setFormData}
        selectedFileName={selectedFileName}
        setSelectedFileName={setSelectedFileName}
        GetBannerImage={GetBannerImage}
      />
    </div>
  );
};

export default Banner;