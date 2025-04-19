import {
  faDownload,
  faFileLines,
  faRefresh
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  Button,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../../context/MainContext";
import { GetApi } from "../../../hooks/Get/GetApi";
import {
  GetDeliveryPersonReportUrl,
  GetDeliveryPersonUrl,
} from "../../../Constant/urls/urls";
import {
  ConvertDateStrFunction,
  ConvertDateTimeStrFunction,
} from "../../../commonFunctions";
import { setDeliveryPersonReducerData } from "../../../redux/reducer/ChildReducer/DeliveryPersonReducer";
import { setDeliveryPersonReportReducerData } from "../../../redux/reducer/ChildReducer/DeliveryPersonReportReducer";
import { convertDateFormat } from "../../../commonFunctions";

const DeliveryPersonReport = () => {
  const { ShowNotification } = useContext(MainContext);

  const { delivery_person_reducer_data } = useSelector(
    (state) => state.DeliveryPersonReducer
  );

  const { delivery_person_report_reducer_data } = useSelector(
    (state) => state.DeliveryPersonReportReducer
  );

  const dispatch = useDispatch();

  const [show, setShow] = useState(false);

  const [filterDates, setFilterDates] = useState({
    from_date: "",
    to_date: "",
  });

  useEffect(() => {
    const now = new Date();
    const pastDate = new Date();
    pastDate.setDate(now.getDate() - 30); // Subtract 30 days
  
    const formattedFromDate = pastDate.toISOString().slice(0, 16);
    const formattedToDate = now.toISOString().slice(0, 16);
  
    setFilterDates({
      from_date: formattedFromDate,
      to_date: formattedToDate,
    });
  }, []);
  

  const [deliveryPersonId, setDeliveryPersonId] = useState(0);

  useEffect(() => {
    // getDeliveryPersonReport();
    getDeliveryPerson();
  }, []);
  const handleDateChange = (value, name) => {
    setFilterDates((oldData) => ({
      ...oldData,
      [name]: value,
    }));
  };
  const categoryDTColumns = [
    {
      name: "ID",
      selector: (row) => row?.id,
    
    },
    {
      name: "Delivery Address",
      selector: (row) => row?.delivery_address?.address,
     
    },
    {
      name: "Delivered Date",
      selector: (row) => convertDateFormat(row?.delivery_time),
     
    },
    {
      name: "Delivered To",
      selector: (row) =>(
        <div className="text-center">
        <p>{row.delivery_person?.name}</p>
        <p>{row.delivery_person?.phone}</p>
      </div>
      ),
    
    },
   

  ];

  const getDeliveryPerson = async () => {
    try {
      const result = await GetApi(GetDeliveryPersonUrl);
      
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setDeliveryPersonReducerData(result.data.data));
      }
    } catch (error) {
      console.error("getDeliveryPerson Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  const getDeliveryPersonReport = async () => {
    if (!filterDates?.from_date) {
      ShowNotification("error", "Please Select Report Start Date");
      return;
    }
    if (!filterDates?.to_date) {
      ShowNotification("error", "Please Select Report End Date");
      return;
    }
    if (!deliveryPersonId) {
      ShowNotification("error", "Please Select Delivery Person");
      return;
    }
    try {
      const result = await GetApi(
        `${GetDeliveryPersonReportUrl}dp_id=${deliveryPersonId}&from_date=${ConvertDateStrFunction(
          filterDates?.from_date
        )}&to_date=${ConvertDateStrFunction(filterDates?.to_date)}`
      );
      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        if (result.data?.data) {
          dispatch(setDeliveryPersonReportReducerData(result.data?.data));
        }
      }
    } catch (error) {
      console.error("getDeliveryPersonReport Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    } finally {
      //   dispatch(setIsDeliveryPersonReportLoadingReducerData(false));
    }
  };


  return (
    <div className="cgm-purchase-section">
      <Grid container spaing={2} className="mb-2">
        <Grid item md={4} xs={6} className="text-end search-section">
          <section className="component-heading my-1">
            <FontAwesomeIcon icon={faFileLines} className="mx-2" /> Delivery
            Person Report
          </section>
        </Grid>
      

        <Grid container spacing={2} className="my-3">

          <Grid item md={4}>
            <TextField
              id="from_date"
              className="my-2"
              label="Start Date"
              fullWidth
              size="small"
              required
              value={filterDates?.from_date || ""}
              onChange={(e) => {
                handleDateChange(e.target.value, "from_date");
              }}
              type="datetime-local"
            />
          </Grid>
          <Grid item md={4}>
            <TextField
              id="to_date"
              className="my-2"
              label="end Date"
              fullWidth
              size="small"
              required
              value={filterDates?.to_date || ""}
              onChange={(e) => {
                handleDateChange(e.target.value, "to_date");
              }}
              type="datetime-local"
            />
          </Grid>

          <Grid item md={4} xs={4} className="text-start ">
            <FormControl fullWidth size="small" className="my-2">
              <InputLabel id="category-select-label">Delivery Person</InputLabel>
              <Select
                labelId="category-select-label"
                id="category-select"
                label="Delivery Person"
                value={deliveryPersonId || 0}
                onChange={(e) => setDeliveryPersonId(e.target.value)}
              >
                {delivery_person_reducer_data &&
                  delivery_person_reducer_data.length > 0 ? (
                  delivery_person_reducer_data.map((val) => (
                    <MenuItem key={val.id} value={val.id}>
                      {val.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled>No Partner Data available</MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          <Grid item md={4} xs={4} className="text-start d-flex align-items-center">
            <div className="d-flex align-items-center">
              <Button
                variant="contained"
                color="success"
                className=" mx-1"
                style={{
                  textTransform: "none",
                  borderRadius: "5px",
                  display: "block"
                }}
                onClick={() => getDeliveryPersonReport()}
              >
                <FontAwesomeIcon icon={faDownload} className="mx-1" />{" "}
                <span>Get Data</span>
              </Button>
            </div>
          </Grid>

        </Grid>

      </Grid>

      <div className={`dt-table`}>
        <DataTable
          columns={categoryDTColumns}
          striped
          data={delivery_person_report_reducer_data}
          className="dt-table-container"
          pagination
          searchable
        />
      </div>
    </div>
  );
};

export default DeliveryPersonReport;
