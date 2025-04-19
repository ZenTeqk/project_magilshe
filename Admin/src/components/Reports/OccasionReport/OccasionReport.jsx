import {
  faDownload,
  faFileLines,
  faRefresh
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Button, Grid, TextField } from "@mui/material";
import React, { useContext, useEffect, useState } from "react";
import DataTable from "react-data-table-component";
import { useDispatch, useSelector } from "react-redux";
import MainContext from "../../../context/MainContext";
import { GetApi } from "../../../hooks/Get/GetApi";
import { GetOccasionReportUrl } from "../../../Constant/urls/urls";
import { setOccasionReportReducerData } from "../../../redux/reducer/ChildReducer/OccasionReportReducer";
import { ConvertDateStrFunction } from "../../../commonFunctions";
import { convertDateFormat } from "../../../commonFunctions";

const OccasionReport = () => {
  const { ShowNotification } = useContext(MainContext);
  const dispatch = useDispatch();

  const occasion_report_reducer_data = useSelector(
    (state) => state.OccasionReportReducer.occasion_report_reducer_data
  );

  const [filterDates, setFilterDates] = useState({
    from_date: "",
    to_date: "",
  });

  // Function to fetch data
  const getOccasionReport = async (fromDate, toDate) => {
    if (!fromDate || !toDate) {
      ShowNotification("error", "Please select both dates");
      return;
    }

    try {
      const result = await GetApi(
        `${GetOccasionReportUrl}from_date=${ConvertDateStrFunction(fromDate)}&to_date=${ConvertDateStrFunction(toDate)}`
      );

      if (!result || typeof result.status === "undefined") {
        ShowNotification("error", "Network Error");
      } else if (result.status !== 200) {
        ShowNotification("error", result.data?.message || "An error occurred");
      } else {
        dispatch(setOccasionReportReducerData(result.data?.data || []));
      }
    } catch (error) {
      console.error("getOccasionReport Error:", error);
      ShowNotification("error", "An unexpected error occurred");
    }
  };

  // Set default last 30 days and fetch data on mount
  useEffect(() => {
    const currentDate = new Date();
    const pastDate = new Date();
    pastDate.setDate(currentDate.getDate() - 30);

    const formattedFromDate = pastDate.toISOString().slice(0, 10);
    const formattedToDate = currentDate.toISOString().slice(0, 10);

    setFilterDates({
      from_date: formattedFromDate,
      to_date: formattedToDate
    });

    getOccasionReport(formattedFromDate, formattedToDate);
  }, []);

  const handleDateChange = (value, name) => {
    setFilterDates((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const categoryDTColumns = [
    { name: "ID", selector: (row) => row?.id,  },
    { name: "Type", selector: (row) => row?.type,  },
    { name: "Date", selector: (row) => convertDateFormat(row?.date),  },
    { name: "Name", selector: (row) => row?.person_name,  },
  ];

  return (
    <div className="cgm-purchase-section">
      <Grid container spacing={2} className="mb-2">
        <Grid item md={4} xs={6} className="text-end search-section">
          <section className="component-heading my-1">
            <FontAwesomeIcon icon={faFileLines} className="mx-2" /> Occasion Report
          </section>
        </Grid>
        
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
            value={filterDates.from_date}
            onChange={(e) => handleDateChange(e.target.value, "from_date")}
            type="date"
          />
        </Grid>
        <Grid item md={4}>
          <TextField
            id="to_date"
            className="my-2"
            label="End Date"
            fullWidth
            size="small"
            required
            value={filterDates.to_date}
            onChange={(e) => handleDateChange(e.target.value, "to_date")}
            type="date"
          />
        </Grid>
        <Grid item md={4} xs={4} className="text-start d-flex align-items-center">
          <Button
            variant="contained"
            color="success"
            className="mx-1"
            style={{ textTransform: "none", borderRadius: "5px", display: "block" }}
            onClick={() => getOccasionReport(filterDates.from_date, filterDates.to_date)} 
          >
            <FontAwesomeIcon icon={faDownload} className="mx-1" /> Get Data
          </Button>
 
        </Grid>
      </Grid>

      <div className="dt-table">
        <DataTable
          columns={categoryDTColumns}
          striped
          data={occasion_report_reducer_data}
          className="dt-table-container"
          pagination
        />
      </div>
    </div>
  );
};

export default OccasionReport;
