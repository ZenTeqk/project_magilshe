import React, { useContext, useEffect, useState } from "react";
import {
  Box,
  Button,
  Grid,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";

import MainContext from "../../context/MainContext";
import { GetApi } from "../../hooks/Get/GetApi";
import { GetAllEventsUrl } from "../../Constant/urls/urls";
import AddEvents from "./AddEvents";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFileLines } from "@fortawesome/free-solid-svg-icons";

const Events = () => {
  const { ShowNotification } = useContext(MainContext);

  const [events, setEvents] = useState([]);
  const [show, setShow] = useState(false);

  const [formData, setFormData] = useState({
    id: 0,
    name: "",
    place: "",
    start: "",
    end: "",
    description: "",
    cake_id_list: [],
    cake_list: [],
    image: null,
    image_preview: "",
    status: true,
  });

  /* ================= FETCH EVENTS ================= */
  const GetAllEvents = async () => {
    try {
      const result = await GetApi(GetAllEventsUrl);

      if (!result || result.status !== 200) {
        ShowNotification("error", "Failed to load events");
      } else {
        setEvents(result.data?.data || []);
      }
    } catch {
      ShowNotification("error", "Unexpected error");
    }
  };

  useEffect(() => {
    GetAllEvents();
  }, []);

  /* ================= ADD ================= */
  const handleAdd = () => {
    setFormData({
      id: 0,
      name: "",
      place: "",
      start: "",
      end: "",
      description: "",
      cake_id_list: [],
      cake_list: [],
      image: null,
      image_preview: "",
      status: true,
    });
    setShow(true);
  };

  /* ================= EDIT ================= */
  const handleEdit = (event) => {
  setFormData({
    id: event.id,
    name: event.name,
    place: event.place,
    start: event.start,
    end: event.end,
    description: event.description,
    cake_id_list: Array.isArray(event.cake_id_list)
      ? event.cake_id_list
      : [],
    image: null,
    image_preview: event.url || "",
    status: Boolean(event.status),
  });
  setShow(true);
};


  return (
    <>
      {/* ================= HEADER ================= */}
      <Grid container spacing={2} alignItems="center" mb={2}>
       <Grid item md={6} xs={6} className="text-end search-section">
                 <section className="component-heading my-1">
                   <FontAwesomeIcon icon={faFileLines} className="mx-2" /> Events
                 </section>
               </Grid>
        <Grid item xs={6} textAlign="right">
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAdd}
          >
            Add Event
          </Button>
        </Grid>
      </Grid>

      {/* ================= TABLE ================= */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Place</TableCell>
           
              <TableCell>Status</TableCell>
              <TableCell align="right">Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  No Events Found
                </TableCell>
              </TableRow>
            ) : (
              events.map((event, index) => (
                <TableRow key={event.id}>
                  <TableCell>{index + 1}</TableCell>

                  <TableCell>
                    {event.url && (
                      <img
                        src={event.url}
                        alt={event.name}
                        style={{
                          width: 80,
                          height: 50,
                          objectFit: "cover",
                          borderRadius: 6,
                        }}
                      />
                    )}
                  </TableCell>

                  <TableCell>{event.name}</TableCell>
                  <TableCell>{event.place}</TableCell>

                 
                  <TableCell>
                    {event.status ? (
                      <Chip label="Active" color="success" size="small" />
                    ) : (
                      <Chip label="Inactive" color="default" size="small" />
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <Button
                      size="small"
                      variant="contained"
                      startIcon={<EditIcon />}
                      onClick={() => handleEdit(event)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ================= ADD / EDIT MODAL ================= */}
      <AddEvents
        show={show}
        setShow={setShow}
        formData={formData}
        setFormData={setFormData}
        GetAllEvents={GetAllEvents}
      />
    </>
  );
};

export default Events;
