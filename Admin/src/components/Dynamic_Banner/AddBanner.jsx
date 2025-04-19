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
import { GetBannerImageUrl, CreateBannerImageUrl } from "../../Constant/urls/urls";
import { Offcanvas } from "react-bootstrap";

const AddBanner = ({ show, setShow, formData, setFormData, selectedFileName, setSelectedFileName, GetBannerImage }) => {
  const handleClose = () => {
    setShow(false);
  };
  const { ShowNotification } = useContext(MainContext);

    // Submit banner data
  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = new FormData();
    payload.append("id", formData.id);
    payload.append("main_text", formData.main_text);
    payload.append("sub_text", formData.sub_text);
    payload.append("status", formData.status); // status (checked/unchecked)
    if (formData.image) payload.append("image", formData.image);

    try {
      const result = await PostApi(CreateBannerImageUrl, payload);

      if (result.status === 200) {
        ShowNotification("success", "Banner updated successfully");
        GetBannerImage(); // Refresh banners
        setFormData({
          id: 0, // Reset to initial state
          main_text: "",
          sub_text: "",
          status: true, // Reset status to false
          image: {},
        });
        setSelectedFileName("");
      } else {
        ShowNotification("error", result.data?.message || "An error occurred");
      }
    } catch (error) {
      console.error("handleSubmit Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;
    if (type === "file") {
      const file = files[0];
      if (file) {
        setFormData({ ...formData, [name]: file });
        setSelectedFileName(file.name);
        const imageUrl = URL.createObjectURL(file);
        setFormData((prev) => ({ ...prev, [`${name}_preview`]: imageUrl }));
      }
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };
  

  return (
    <Offcanvas show={show} onHide={handleClose} placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Banner</Offcanvas.Title>
      </Offcanvas.Header>
      <Offcanvas.Body>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Header Text"
                name="main_text"
                size="small"
                value={formData.main_text}
                onChange={handleChange}
                placeholder="Enter Main Text"
                variant="outlined"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="sub_text"
                size="small"
                multiline
                rows={3}
                value={formData.sub_text}
                onChange={handleChange}
                placeholder="Enter Sub Text"
                variant="outlined"
              />
            </Grid>

            <Grid item xs={12}>
              <Button variant="contained" component="label">
                Upload Image
                <input
                  type="file"
                  name="image"
                  accept="image/*"
                  hidden
                  onChange={handleChange}
                />
              </Button>
              {formData?.image_preview && (
                <div className="mt-2">
                  <img src={formData.image_preview} alt="" style={{maxWidth: "250px", borderRadius: "10px"}}/>
                </div>
              )}
            </Grid>

            {formData.id !== 0 && (
              <div className="d-flex align-items-center p-2">
                <Checkbox
                  checked={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.checked })
                  }
                  name="status"
                  color="primary"
                />
                <Typography variant="p"><b>Status</b></Typography>
              </div>
            )}

            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
              >
                Submit
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default AddBanner;
