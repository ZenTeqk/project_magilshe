import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Grid,
  TextField,
  MenuItem,
} from "@mui/material";
import { Offcanvas } from "react-bootstrap";

import MainContext from "../../context/MainContext";
import { GetApi } from "../../hooks/Get/GetApi";
import { PostApi } from "../../hooks/Post/PostApi";

import { CreateEventsUrl, GetCakeUrl } from "../../Constant/urls/urls";

const AddEvents = ({ show, setShow, formData, setFormData, GetAllEvents }) => {
  const { ShowNotification } = useContext(MainContext);
  const [cakeList, setCakeList] = useState([]);

  const handleClose = () => setShow(false);

  /* ================= GET CAKES ================= */
  useEffect(() => {
    getCakeList();
  }, []);

  const getCakeList = async () => {
    try {
      const res = await GetApi(GetCakeUrl);
      if (res?.status === 200) {
        setCakeList(res.data.data || []);
      }
    } catch {
      ShowNotification("error", "Failed to load cakes");
    }
  };

  /* ================= SUBMIT ================= */
  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = new FormData();
    payload.append("id", formData.id || 0);
    payload.append("name", formData.name);
    payload.append("place", formData.place);
    payload.append("start", formData.start);
    payload.append("end", formData.end);
    payload.append("description", formData.description);

    // 🔥 SEND ARRAY EXACTLY AS BACKEND EXPECTS
    payload.append(
      "cake_id_list",
    (formData.cake_id_list)
    );

    if (formData.image) {
      payload.append("image", formData.image);
    }

    try {
      const result = await PostApi(CreateEventsUrl, payload, true);
      if (result?.status === 200) {
        ShowNotification("success", "Event saved successfully");
        GetAllEvents();
        handleClose();
        resetForm();
      } else {
        ShowNotification("error", result?.data?.message || "Error");
      }
    } catch {
      ShowNotification("error", "Unexpected error");
    }
  };

  /* ================= CHANGE ================= */
  const handleChange = (e) => {
    const { name, value, type, files } = e.target;

    if (type === "file") {
      const file = files[0];
      if (file) {
        setFormData((prev) => ({
          ...prev,
          image: file,
          image_preview: URL.createObjectURL(file),
        }));
      }
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  /* ================= MULTI SELECT ================= */
  const handleCakeChange = (e) => {
    const { value } = e.target;
    setFormData((prev) => ({
      ...prev,
      cake_id_list: value, // 🔥 ARRAY DIRECTLY
    }));
  };

  /* ================= RESET ================= */
  const resetForm = () => {
    setFormData({
      id: 0,
      name: "",
      place: "",
      start: "",
      end: "",
      description: "",
      cake_id_list: [], 
      image: null,
      image_preview: "",
    });
  };

  return (
    <Offcanvas show={show} onHide={handleClose} placement="end">
      <Offcanvas.Header closeButton>
        <Offcanvas.Title>Event</Offcanvas.Title>
      </Offcanvas.Header>

      <Offcanvas.Body>
        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>

            <Grid item xs={12}>
              <TextField
                label="Event Name"
                name="name"
                value={formData.name || ""}
                onChange={handleChange}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Place"
                name="place"
                value={formData.place || ""}
                onChange={handleChange}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                type="date"
                label="Start Date"
                name="start"
                value={formData.start || ""}
                onChange={handleChange}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                type="date"
                label="End Date"
                name="end"
                value={formData.end || ""}
                onChange={handleChange}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                name="description"
                value={formData.description || ""}
                onChange={handleChange}
                multiline
                rows={3}
                fullWidth
                size="small"
              />
            </Grid>

            {/* 🔥 MULTI SELECT */}
            <Grid item xs={12}>
              <TextField
                select
                label="Select Cakes"
                value={formData.cake_id_list}
                onChange={handleCakeChange}
                SelectProps={{ multiple: true }}
                fullWidth
                size="small"
              >
                {cakeList.map((cake) => (
                  <MenuItem key={cake.id} value={cake.id}>
                    {cake.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* IMAGE */}
            <Grid item xs={12}>
              <Button component="label" variant="contained">
                Upload Image
                <input type="file" hidden accept="image/*" onChange={handleChange} />
              </Button>

              {formData.image_preview && (
                <Box mt={2}>
                  <img
                    src={formData.image_preview}
                    alt="preview"
                    style={{ width: "100%", borderRadius: 10 }}
                  />
                </Box>
              )}
            </Grid>

            <Grid item xs={12}>
              <Button type="submit" variant="contained" fullWidth>
                Submit
              </Button>
            </Grid>

          </Grid>
        </Box>
      </Offcanvas.Body>
    </Offcanvas>
  );
};

export default AddEvents;
